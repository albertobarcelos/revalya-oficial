import { supabase } from '@/lib/supabase';
import type { ImportedMovement } from '@/types/reconciliation';

// AIDEV-NOTE: Interface para resultado da importação
export interface ImportToChargesResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: Array<{
    movement_id: string;
    error: string;
  }>;
  created_charges: string[];
}

// AIDEV-NOTE: Interface para mapeamento de status
interface StatusMapping {
  [key: string]: string;
}

// AIDEV-NOTE: Mapeamento de status ASAAS → Charges
const STATUS_MAPPING: StatusMapping = {
  'PENDING': 'PENDING',
  'RECEIVED': 'RECEIVED',
  'CONFIRMED': 'CONFIRMED', 
  'OVERDUE': 'OVERDUE',
  'REFUNDED': 'REFUNDED',
  'RECEIVED_IN_CASH': 'RECEIVED',
  'AWAITING_RISK_ANALYSIS': 'BANK_PROCESSING',
  'DELETED': 'CANCELLED',
  'FAILED': 'FAILED',
  'PROCESSING': 'BANK_PROCESSING'
};

// AIDEV-NOTE: Mapeamento de tipos de pagamento
const PAYMENT_TYPE_MAPPING: StatusMapping = {
  'PIX': 'PIX',
  'BOLETO': 'BOLETO', 
  'CREDIT_CARD': 'CREDIT_CARD',
  'BANK_SLIP': 'BOLETO',
  'CASH': 'CASH',
  'TRANSFER': 'PIX'
};

/**
 * Serviço responsável por importar movimentações de conciliation_staging para charges
 * AIDEV-NOTE: Implementa estratégias de segurança multi-tenant e idempotência
 */
export class ReconciliationImportService {
  
  /**
   * Importa movimentações selecionadas para a tabela charges
   * AIDEV-NOTE: Processo principal de importação com validações completas
   */
  async importToCharges(
    movementIds: string[], 
    tenantId: string
  ): Promise<ImportToChargesResult> {
    
    console.log('🚀 [IMPORT DEBUG] Iniciando importToCharges:', { movementIds, tenantId });
    
    const result: ImportToChargesResult = {
      success: false,
      imported_count: 0,
      skipped_count: 0,
      error_count: 0,
      errors: [],
      created_charges: []
    };

    try {
      // AIDEV-NOTE: 1. Configurar contexto de tenant para segurança
      console.log('🔧 [IMPORT DEBUG] Configurando contexto de tenant...');
      await this.setTenantContext(tenantId);
      console.log('✅ [IMPORT DEBUG] Contexto de tenant configurado');
      
      // AIDEV-NOTE: 2. Buscar movimentações válidas para importação
      console.log('🔍 [IMPORT DEBUG] Buscando movimentações válidas...');
      const movements = await this.getValidMovements(movementIds, tenantId);
      console.log('📋 [IMPORT DEBUG] Movimentações encontradas:', movements.length);
      
      if (movements.length === 0) {
        console.log('❌ [IMPORT DEBUG] Nenhuma movimentação válida encontrada');
        throw new Error('Nenhuma movimentação válida encontrada para importação');
      }

      // AIDEV-NOTE: 3. Processar cada movimentação individualmente
      console.log('⚙️ [IMPORT DEBUG] Iniciando processamento individual das movimentações...');
      for (const movement of movements) {
        console.log('🔄 [IMPORT DEBUG] Processando movimento:', movement.id);
        try {
          const chargeId = await this.processMovementImport(movement, tenantId);
          
          if (chargeId) {
            console.log('✅ [IMPORT DEBUG] Cobrança criada com sucesso:', chargeId);
            result.imported_count++;
            result.created_charges.push(chargeId);
            
            // AIDEV-NOTE: 4. Marcar como importado na staging
            await this.markAsImported(movement.id, chargeId);
          } else {
            console.log('⚠️ [IMPORT DEBUG] Movimento ignorado:', movement.id);
            result.skipped_count++;
          }
          
        } catch (error: unknown) {
          console.log('❌ [IMPORT DEBUG] Erro ao processar movimento:', movement.id, error);
          result.error_count++;
          result.errors.push({
            movement_id: movement.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      result.success = result.error_count === 0 || result.imported_count > 0;
      console.log('📊 [IMPORT DEBUG] Resultado final:', result);
      
      return result;
      
    } catch (error: unknown) {
      console.error('❌ [IMPORT DEBUG] Erro geral na importação:', error);
      throw new Error(`Falha na importação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Configura contexto de tenant para segurança RLS
   * AIDEV-NOTE: Essencial para isolamento multi-tenant
   */
  private async setTenantContext(tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('set_tenant_context_simple', {
      p_tenant_id: tenantId
    });
    
    if (error) {
      throw new Error(`Erro ao configurar contexto: ${error.message}`);
    }
  }

  /**
   * Busca movimentações válidas para importação
   * AIDEV-NOTE: Aplica filtros de segurança e validação
   */
  private async getValidMovements(
    movementIds: string[], 
    tenantId: string
  ): Promise<ImportedMovement[]> {
    
    console.log('🔍 [VALID MOVEMENTS DEBUG] Buscando movimentações:', { movementIds, tenantId });
    
    const { data, error } = await supabase
      .from('conciliation_staging')
      .select(`
        id,
        tenant_id,
        id_externo,
        valor_cobranca,
        status_externo,
        data_vencimento,
        data_pagamento,
        contrato_id,
        customer_name,
        customer_email,
        customer_document,
        customer_phone,
        observacao,
        payment_method,
        raw_data,
        processed,
        charge_id,
        pix_key,
        barcode
      `)
      .in('id', movementIds)
      .eq('tenant_id', tenantId)
      .eq('processed', false)
      .is('charge_id', null); // AIDEV-NOTE: Só importar se ainda não foi importado

    console.log('📊 [VALID MOVEMENTS DEBUG] Query executada:', { 
      movementIds, 
      tenantId, 
      error: error?.message,
      dataLength: data?.length 
    });

    if (error) {
      console.error('❌ [VALID MOVEMENTS DEBUG] Erro na query:', error);
      throw new Error(`Erro ao buscar movimentações: ${error.message}`);
    }

    console.log('✅ [VALID MOVEMENTS DEBUG] Movimentações encontradas:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('📋 [VALID MOVEMENTS DEBUG] Primeira movimentação:', data[0]);
    }

    return data || [];
  }

  /**
   * Processa importação de uma movimentação individual
   * AIDEV-NOTE: Lógica central de transformação e criação
   */
  private async processMovementImport(
    movement: ImportedMovement, 
    tenantId: string
  ): Promise<string | null> {
    
    console.log('🔍 [DEBUG] Iniciando processMovementImport:', {
      movementId: movement.id,
      tenantId,
      asaasId: movement.id_externo,
      customerName: movement.customer_name,
      customerDocument: movement.customer_document,
      customerEmail: movement.customer_email
    });
    
    // AIDEV-NOTE: 1. Verificar se já existe cobrança com mesmo asaas_id
    console.log('🔍 [DEBUG] Verificando cobrança existente com ASAAS ID:', movement.id_externo);
    const existingCharge = await this.findExistingCharge(movement.id_externo, tenantId);
    if (existingCharge) {
      console.log(`⚠️ [DEBUG] Cobrança já existe para asaas_id: ${movement.id_externo}`);
      return null; // Skip duplicata
    }
    console.log('✅ [DEBUG] Cobrança não existe, prosseguindo');

    // AIDEV-NOTE: 2. Resolver customer_id (buscar ou criar)
    console.log('🔍 [DEBUG] Resolvendo customer_id...');
    const customerId = await this.resolveCustomerId(movement, tenantId);
    console.log('🔍 [DEBUG] Customer ID resolvido:', customerId);
    
    if (!customerId) {
      console.log('❌ [DEBUG] Falha ao resolver customer_id');
      throw new Error('Não foi possível resolver customer_id');
    }

    // AIDEV-NOTE: 3. Preparar dados da cobrança
    console.log('🔍 [DEBUG] Preparando dados da cobrança...');
    const chargeData = await this.prepareChargeData(movement, customerId, tenantId);
    console.log('🔍 [DEBUG] Dados da cobrança preparados:', {
      customer_id: chargeData.customer_id,
      valor: chargeData.valor,
      status: chargeData.status,
      tipo: chargeData.tipo,
      asaas_id: chargeData.asaas_id,
      origem: chargeData.origem,
      created_by: chargeData.created_by,
      updated_by: chargeData.updated_by,
      barcode: chargeData.barcode ? 'presente' : 'ausente',
      pix_key: chargeData.pix_key ? 'presente' : 'ausente',
      descricao: chargeData.descricao
    });

    // AIDEV-NOTE: 4. Inserir na tabela charges
    console.log('🔍 [DEBUG] Inserindo cobrança no banco...');
    const { data, error } = await supabase
      .from('charges')
      .insert(chargeData)
      .select('id')
      .single();

    if (error) {
      console.log('❌ [DEBUG] Erro ao inserir cobrança:', error);
      throw new Error(`Erro ao criar cobrança: ${error.message}`);
    }

    console.log('✅ [DEBUG] Cobrança criada com sucesso:', data.id);
    return data.id;
  }

  /**
   * Verifica se já existe cobrança com mesmo asaas_id
   * AIDEV-NOTE: Estratégia anti-duplicação
   */
  private async findExistingCharge(asaasId: string, tenantId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('charges')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('asaas_id', asaasId)
      .limit(1);

    if (error) {
      console.error('Erro ao verificar cobrança existente:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Resolve customer_id (busca existente ou cria novo)
   * AIDEV-NOTE: Lógica de matching por documento ou email
   */
  private async resolveCustomerId(
    movement: ImportedMovement, 
    tenantId: string
  ): Promise<string | null> {
    
    console.log('🔍 [DEBUG] Iniciando resolveCustomerId:', {
      customerDocument: movement.customer_document,
      customerEmail: movement.customer_email,
      customerName: movement.customer_name
    });
    
    // AIDEV-NOTE: 1. Tentar buscar por documento (CPF/CNPJ)
    if (movement.customer_document) {
      const cleanDocument = movement.customer_document.replace(/\D/g, '');
      console.log('🔍 [DEBUG] Buscando customer por documento:', cleanDocument);
      
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('cpf_cnpj', cleanDocument)
        .limit(1);
        
      if (error) {
        console.log('❌ [DEBUG] Erro ao buscar por documento:', error);
      } else if (data && data.length > 0) {
        console.log('✅ [DEBUG] Customer encontrado por documento:', data[0].id);
        return data[0].id;
      } else {
        console.log('⚠️ [DEBUG] Nenhum customer encontrado por documento');
      }
    }

    // AIDEV-NOTE: 2. Tentar buscar por email
    if (movement.customer_email) {
      const cleanEmail = movement.customer_email.toLowerCase();
      console.log('🔍 [DEBUG] Buscando customer por email:', cleanEmail);
      
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('email', cleanEmail)
        .limit(1);
        
      if (error) {
        console.log('❌ [DEBUG] Erro ao buscar por email:', error);
      } else if (data && data.length > 0) {
        console.log('✅ [DEBUG] Customer encontrado por email:', data[0].id);
        return data[0].id;
      } else {
        console.log('⚠️ [DEBUG] Nenhum customer encontrado por email');
      }
    }

    // AIDEV-NOTE: 3. Criar novo customer se não encontrou
    console.log('🔍 [DEBUG] Criando novo customer...');
    return await this.createNewCustomer(movement, tenantId);
  }

  /**
   * Cria novo customer baseado nos dados da movimentação
   * AIDEV-NOTE: Criação automática com dados mínimos válidos
   */
  private async createNewCustomer(
    movement: ImportedMovement, 
    tenantId: string
  ): Promise<string | null> {
    
    console.log('🔍 [DEBUG] Iniciando createNewCustomer...');
    
    const customerData = {
      tenant_id: tenantId,
      name: movement.customer_name || 'Cliente Importado',
      email: movement.customer_email || null,
      phone: movement.customer_phone || null,
      cpf_cnpj: movement.customer_document?.replace(/\D/g, '') || null,
      company: null, // AIDEV-NOTE: Pode ser inferido depois
      created_at: new Date().toISOString()
    };

    console.log('🔍 [DEBUG] Dados do novo customer:', customerData);

    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id')
      .single();

    if (error) {
      console.log('❌ [DEBUG] Erro ao criar customer:', error);
      return null;
    }

    console.log('✅ [DEBUG] Novo customer criado:', data.id);
    return data.id;
  }

  /**
   * Prepara dados da cobrança para inserção
   * AIDEV-NOTE: Transformação completa de dados com mapeamentos
   */
  private async prepareChargeData(
    movement: ImportedMovement, 
    customerId: string, 
    tenantId: string
  ) {
    // AIDEV-NOTE: Garantir que 'tipo' nunca seja null (constraint NOT NULL)
    const paymentMethod = movement.payment_method || '';
    const tipo = PAYMENT_TYPE_MAPPING[paymentMethod] || 'BOLETO'; // Valor padrão seguro
    
    // AIDEV-NOTE: Obter user_id atual para campos de auditoria
    let currentUserId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    } catch (error) {
      console.warn('Não foi possível obter user_id para auditoria:', error);
    }

    // AIDEV-NOTE: Determinar origem baseado na presença de id_externo
    const origem = movement.id_externo ? 'ASAAS' : 'MANUAL';

    // AIDEV-NOTE: Usar campos diretos da tabela conciliation_staging para barcode e pix_key
    const barcode = movement.barcode || null;
    const pix_key = movement.pix_key || null;
    
    return {
      tenant_id: tenantId,
      customer_id: customerId,
      contract_id: movement.contrato_id || null,
      asaas_id: movement.id_externo,
      valor: movement.valor_cobranca || 0,
      status: STATUS_MAPPING[movement.status_externo?.toUpperCase()] || 'PENDING',
      tipo: tipo,
      data_vencimento: movement.data_vencimento || new Date().toISOString(),
      data_pagamento: movement.data_pagamento || null,
      descricao: movement.observacao || 'Importado da Conciliação',
      origem: origem, // ASAAS quando id_externo presente, MANUAL caso contrário
      created_by: currentUserId, // ID do usuário atual para auditoria
      updated_by: currentUserId, // ID do usuário atual para auditoria
      barcode: barcode, // Código de barras extraído dos dados JSON
      pix_key: pix_key, // Chave PIX extraída dos dados JSON
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Marca movimentação como importada
   * AIDEV-NOTE: Atualiza flags de controle na staging
   */
  private async markAsImported(movementId: string, chargeId: string): Promise<void> {
    // AIDEV-NOTE: Verifica se já existe charge_id para evitar duplicação
    const { data: existingData } = await supabase
      .from('conciliation_staging')
      .select('charge_id')
      .eq('id', movementId)
      .single();
      
    // Se já existe um charge_id e é diferente do atual, não permitir reimportação
    if (existingData?.charge_id && existingData.charge_id !== chargeId) {
      throw new Error(`Movimentação ${movementId} já foi importada para outra cobrança (${existingData.charge_id})`);
    }
    
    const { error } = await supabase
      .from('conciliation_staging')
      .update({
        processed: chargeId ? true : false, // AIDEV-NOTE: Processed só é true se tiver charge_id
        charge_id: chargeId,
        imported_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', movementId);

    if (error) {
      console.error('Erro ao marcar como importado:', error);
      throw new Error(`Erro ao atualizar status de importação: ${error.message}`);
    }
  }
}

// AIDEV-NOTE: Instância singleton do serviço
export const reconciliationImportService = new ReconciliationImportService();