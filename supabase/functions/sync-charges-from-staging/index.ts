import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// AIDEV-NOTE: Mapeamento de status_externo (conciliation_staging) para status (charges)
// status_externo usa minúsculas, status (charges) usa MAIÚSCULAS conforme constraint
function mapExternalStatusToChargeStatus(statusExterno: string): string {
  if (!statusExterno) return "PENDING"; // Default seguro
  
  const statusLower = statusExterno.toLowerCase();
  const statusMap: Record<string, string> = {
    "pending": "PENDING",
    "received": "RECEIVED",
    "overdue": "OVERDUE",
    "confirmed": "CONFIRMED",
    "refunded": "REFUNDED",
    "created": "PENDING",        // Default para PENDING
    "deleted": "PENDING",        // Default para PENDING
    "checkout_viewed": "PENDING", // Default para PENDING
    "anticipaded": "RECEIVED"    // Mantém o typo do constraint do banco
  };
  
  return statusMap[statusLower] || "PENDING"; // Default para PENDING se não encontrar
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // AIDEV-NOTE: Extrair tenant_id da URL ou do body
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const tenantIdFromUrl = pathParts[pathParts.length - 1];
    
    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantIdFromUrl)) {
      return new Response(
        JSON.stringify({ error: "Tenant ID inválido na URL. Use: /sync-charges-from-staging/{tenant_id}" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = tenantIdFromUrl;
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 100; // Processar 100 por vez
    const dryRun = body.dryRun || false; // Modo de teste (não atualiza, apenas mostra)
    const forceUpdate = body.forceUpdate || false; // Forçar atualização mesmo se já estiver atualizado

    console.log(`🔄 Iniciando sincronização para tenant: ${tenantId}`);
    console.log(`📊 Tamanho do lote: ${batchSize}`);
    console.log(`🧪 Modo dry-run: ${dryRun}`);
    console.log(`⚡ Force update: ${forceUpdate}`);

    // AIDEV-NOTE: Buscar movimentações que podem ser sincronizadas
    // Critério: têm charge_id OU têm id_externo que corresponde a asaas_id em charges
    const { data: movements, error: movementsError } = await supabase
      .from("conciliation_staging")
      .select(`
        id,
        tenant_id,
        id_externo,
        status_externo,
        valor_cobranca,
        charge_id,
        origem
      `)
      .eq("tenant_id", tenantId)
      .eq("origem", "ASAAS")
      .eq("deleted_flag", false)
      .not("status_externo", "is", null)
      .order("created_at", { ascending: false });

    if (movementsError) {
      console.error("❌ Erro ao buscar movimentações:", movementsError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar movimentações", details: movementsError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!movements || movements.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhuma movimentação encontrada para sincronizar",
          tenantId,
          total: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Total de movimentações encontradas: ${movements.length}`);

    const results = {
      total: movements.length,
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
      details: [] as any[]
    };

    // AIDEV-NOTE: Processar em lotes
    for (let i = 0; i < movements.length; i += batchSize) {
      const batch = movements.slice(i, i + batchSize);
      console.log(`📦 Processando lote ${Math.floor(i / batchSize) + 1} (${batch.length} itens)`);

      for (const movement of batch) {
        try {
          // AIDEV-NOTE: Buscar charge vinculada
          // Prioridade: charge_id direto > asaas_id correspondente
          let chargeId = movement.charge_id;
          
          if (!chargeId && movement.id_externo) {
            // Buscar charge pelo asaas_id
            const { data: chargeByAsaasId, error: chargeError } = await supabase
              .from("charges")
              .select("id, status, payment_value")
              .eq("tenant_id", tenantId)
              .eq("asaas_id", movement.id_externo)
              .single();

            if (chargeByAsaasId) {
              chargeId = chargeByAsaasId.id;
              
              // AIDEV-NOTE: Verificar se precisa atualizar (se não for forceUpdate)
              if (!forceUpdate && chargeByAsaasId) {
                const mappedStatus = mapExternalStatusToChargeStatus(movement.status_externo);
                const statusNeedsUpdate = chargeByAsaasId.status !== mappedStatus;
                const paymentValueNeedsUpdate = 
                  chargeByAsaasId.payment_value !== movement.valor_cobranca &&
                  movement.valor_cobranca !== null &&
                  movement.valor_cobranca !== undefined;
                
                if (!statusNeedsUpdate && !paymentValueNeedsUpdate) {
                  results.skipped++;
                  results.details.push({
                    movement_id: movement.id,
                    charge_id: chargeId,
                    id_externo: movement.id_externo,
                    reason: "Charge já está atualizada",
                    current_status: chargeByAsaasId.status,
                    current_payment_value: chargeByAsaasId.payment_value
                  });
                  continue;
                }
              }
            }
          }

          if (!chargeId) {
            results.skipped++;
            results.details.push({
              movement_id: movement.id,
              id_externo: movement.id_externo,
              reason: "Nenhuma charge vinculada encontrada"
            });
            continue;
          }

          // AIDEV-NOTE: Preparar dados para atualização
          const updateData: any = {
            updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // UTC-3
          };

          // Mapear status
          if (movement.status_externo) {
            updateData.status = mapExternalStatusToChargeStatus(movement.status_externo);
          }

          // Atualizar payment_value
          if (movement.valor_cobranca !== null && movement.valor_cobranca !== undefined) {
            updateData.payment_value = movement.valor_cobranca;
          }

          if (dryRun) {
            // Modo teste: apenas logar
            console.log(`🧪 [DRY-RUN] Atualizaria charge ${chargeId}:`, updateData);
            results.updated++;
            results.details.push({
              movement_id: movement.id,
              charge_id: chargeId,
              id_externo: movement.id_externo,
              update_data: updateData,
              mode: "dry-run"
            });
          } else {
            // Atualizar charge
            const { error: updateError } = await supabase
              .from("charges")
              .update(updateData)
              .eq("id", chargeId)
              .eq("tenant_id", tenantId); // AIDEV-NOTE: Proteção multi-tenant

            if (updateError) {
              console.error(`❌ Erro ao atualizar charge ${chargeId}:`, updateError);
              results.errors.push({
                movement_id: movement.id,
                charge_id: chargeId,
                error: updateError
              });
            } else {
              console.log(`✅ Charge ${chargeId} atualizada com sucesso`);
              results.updated++;
              results.details.push({
                movement_id: movement.id,
                charge_id: chargeId,
                id_externo: movement.id_externo,
                status_externo: movement.status_externo,
                status_mapped: updateData.status,
                payment_value: updateData.payment_value
              });
            }
          }

          results.processed++;
        } catch (error) {
          console.error(`❌ Erro ao processar movimentação ${movement.id}:`, error);
          results.errors.push({
            movement_id: movement.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        summary: {
          total: results.total,
          processed: results.processed,
          updated: results.updated,
          skipped: results.skipped,
          errors: results.errors.length
        },
        details: results.details.slice(0, 50), // Limitar detalhes para não sobrecarregar a resposta
        errors: results.errors.length > 0 ? results.errors.slice(0, 20) : undefined,
        note: results.details.length > 50 ? "Detalhes limitados a 50 itens. Verifique logs para mais informações." : undefined
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno", 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

