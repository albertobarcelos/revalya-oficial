/**
 * Script para testar a sincronização de charges em modo dry-run
 * 
 * Uso:
 *   node scripts/test-sync-charges-dry-run.js <tenant_id>
 * 
 * Exemplo:
 *   node scripts/test-sync-charges-dry-run.js 8d2888f1-64a5-445f-84f5-2614d5160251
 */

const SUPABASE_URL = "https://wyehpiutzvwplllumgdk.supabase.co";
const FUNCTION_NAME = "sync-charges-from-staging";

// AIDEV-NOTE: Obter tenant_id dos argumentos da linha de comando
const tenantId = process.argv[2];

if (!tenantId) {
  console.error("❌ Erro: Tenant ID não fornecido");
  console.log("\nUso:");
  console.log(`  node scripts/test-sync-charges-dry-run.js <tenant_id>`);
  console.log("\nExemplo:");
  console.log(`  node scripts/test-sync-charges-dry-run.js 8d2888f1-64a5-445f-84f5-2614d5160251`);
  process.exit(1);
}

// Validar formato UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(tenantId)) {
  console.error("❌ Erro: Tenant ID inválido (deve ser um UUID)");
  process.exit(1);
}

// AIDEV-NOTE: Obter anon key das variáveis de ambiente ou pedir ao usuário
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!anonKey) {
  console.error("❌ Erro: SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente");
  console.log("\nConfigure uma das seguintes variáveis:");
  console.log("  - SUPABASE_ANON_KEY");
  console.log("  - VITE_SUPABASE_ANON_KEY");
  console.log("\nOu forneça via:");
  console.log(`  SUPABASE_ANON_KEY=your_key node scripts/test-sync-charges-dry-run.js ${tenantId}`);
  process.exit(1);
}

const url = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}/${tenantId}`;

console.log("🔄 Iniciando teste em modo dry-run...");
console.log(`📋 Tenant ID: ${tenantId}`);
console.log(`🔗 URL: ${url}`);
console.log("");

const requestBody = {
  dryRun: true,
  batchSize: 50
};

fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${anonKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(requestBody)
})
  .then(async (response) => {
    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ Erro na requisição:");
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log("✅ Teste concluído com sucesso!");
    console.log("");
    console.log("📊 Resumo:");
    console.log(`   Total de movimentações: ${data.summary?.total || 0}`);
    console.log(`   Processadas: ${data.summary?.processed || 0}`);
    console.log(`   Seriam atualizadas: ${data.summary?.updated || 0}`);
    console.log(`   Seriam ignoradas: ${data.summary?.skipped || 0}`);
    console.log(`   Erros: ${data.summary?.errors || 0}`);
    console.log("");

    if (data.details && data.details.length > 0) {
      console.log("📝 Detalhes (primeiros 10 itens):");
      data.details.slice(0, 10).forEach((detail, index) => {
        console.log(`\n   ${index + 1}. Movimentação: ${detail.movement_id}`);
        console.log(`      Charge ID: ${detail.charge_id || "N/A"}`);
        console.log(`      ID Externo: ${detail.id_externo || "N/A"}`);
        if (detail.update_data) {
          console.log(`      Status: ${detail.update_data.status || "N/A"}`);
          console.log(`      Payment Value: ${detail.update_data.payment_value || "N/A"}`);
        }
        if (detail.reason) {
          console.log(`      Motivo: ${detail.reason}`);
        }
      });
      
      if (data.details.length > 10) {
        console.log(`\n   ... e mais ${data.details.length - 10} itens`);
      }
    }

    if (data.errors && data.errors.length > 0) {
      console.log("\n⚠️  Erros encontrados:");
      data.errors.forEach((error, index) => {
        console.log(`\n   ${index + 1}. ${JSON.stringify(error, null, 6)}`);
      });
    }

    console.log("");
    console.log("🧪 Modo DRY-RUN: Nenhum dado foi alterado");
    console.log("");
    console.log("💡 Para executar a sincronização real, use:");
    console.log(`   node scripts/sync-charges-real.js ${tenantId}`);
  })
  .catch((error) => {
    console.error("❌ Erro ao executar teste:", error.message);
    process.exit(1);
  });


