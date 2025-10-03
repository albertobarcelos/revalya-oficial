// =====================================================
// RECONCILIATION MODAL
// Descrição: Modal de conciliação que substitui a página separada
// Tecnologias: Shadcn/UI + Tailwind + Motion.dev
// =====================================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  X,
  Download, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Components
import ReconciliationFilters from './ReconciliationFilters';
import ReconciliationHeaderIndicators from './ReconciliationHeaderIndicators';
import ReconciliationTable from './ReconciliationTable';

// Types
import { 
  ImportedMovement, 
  ReconciliationFilters as FilterType,
  ReconciliationStatus,
  PaymentStatus,
  ReconciliationSource,
  ReconciliationIndicators as IndicatorsType,
  ReconciliationAction
} from '@/types/reconciliation';

// API Client
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';

// Hooks
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useAuditLogger } from '@/hooks/useAuditLogger';
import { useTenantLoading } from '@/hooks/useZustandTenant';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  // =====================================================
  // HOOKS & STATE
  // =====================================================
  const { toast } = useToast();
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { logAction } = useAuditLogger();
  const tenantLoading = useTenantLoading();

  // Estados locais
  const [movements, setMovements] = useState<ImportedMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<ImportedMovement[]>([]);
  const [indicators, setIndicators] = useState<IndicatorsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // AIDEV-NOTE: Estado para controlar colapso do sidebar de filtros
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // AIDEV-NOTE: Estado de paginação para controlar exibição da tabela
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  // AIDEV-NOTE: Inicialização correta dos filtros para evitar inputs não controlados
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const [filters, setFilters] = useState<FilterType>(() => {
    const monthRange = getCurrentMonthRange();
    return {
      status: 'PENDING' as any,
      source: 'ALL' as any,
      hasContract: 'ALL' as any,
      dateFrom: monthRange.start,
      dateTo: monthRange.end,
      search: '',
      accountFilter: '',
      asaasNossoNumero: '',
      asaasBillingType: 'ALL',
      asaasPaymentStatus: 'ALL'
    };
  });

  // =====================================================
  // EFFECTS
  // =====================================================
  useEffect(() => {
    if (isOpen && hasAccess) {
      loadReconciliationData();
      logAction('reconciliation_modal_opened', { tenant: currentTenant?.name });
    }
  }, [isOpen, hasAccess, currentTenant]);

  useEffect(() => {
    if (movements.length > 0) {
      const filtered = applyFilters(movements, filters);
      setFilteredMovements(filtered);
      setIndicators(calculateIndicators(filtered));
      
      // AIDEV-NOTE: Atualizar total de registros filtrados para paginação
      setPagination(prev => ({ ...prev, total: filtered.length, page: 1 }));
    }
  }, [movements, filters]);

  // AIDEV-NOTE: Movimentações paginadas
  const paginatedMovements = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredMovements.slice(startIndex, endIndex);
  }, [filteredMovements, pagination.page, pagination.limit]);

  // =====================================================
  // FUNCTIONS
  // =====================================================
  
  // AIDEV-NOTE: Função para aplicar filtros localmente - corrigida para usar campos corretos dos dados
  const applyFilters = (data: ImportedMovement[], filters: FilterType): ImportedMovement[] => {
    console.group('🔍 DEBUG - Aplicação de Filtros');
    console.log('📊 Total de registros antes dos filtros:', data.length);
    console.log('🎛️ Filtros aplicados:', filters);
    
    const filteredData = data.filter(movement => {
      // Filtro por status - usando a propriedade correta
      if (filters.status !== 'ALL' && filters.status !== movement.reconciliationStatus) {
        return false;
      }
      
      // Filtro por origem - usando a propriedade correta
      if (filters.source !== 'ALL' && filters.source !== movement.source) {
        return false;
      }
      
      // Filtro por contrato
      if (filters.hasContract !== 'ALL') {
        if (filters.hasContract === 'WITH_CONTRACT' && !movement.hasContract) {
          return false;
        }
        if (filters.hasContract === 'WITHOUT_CONTRACT' && movement.hasContract) {
          return false;
        }
      }
      
      // Filtro por termo de busca - usando múltiplos campos para busca incluindo novos campos
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          movement.externalId?.toLowerCase().includes(searchLower) ||
          movement.customerName?.toLowerCase().includes(searchLower) ||
          movement.customerDocument?.toLowerCase().includes(searchLower) ||
          movement.description?.toLowerCase().includes(searchLower) ||
          movement.amount.toString().includes(searchLower) ||
          movement.id?.toString().includes(searchLower) ||
          // AIDEV-NOTE: Novos campos incluídos na busca geral
          movement.customer_name?.toLowerCase().includes(searchLower) ||
          movement.customer_document?.toLowerCase().includes(searchLower) ||
          movement.external_reference?.toLowerCase().includes(searchLower) ||
          movement.observacao?.toLowerCase().includes(searchLower) ||
          movement.payment_method?.toLowerCase().includes(searchLower) ||
          movement.origem?.toLowerCase().includes(searchLower) ||
          movement.id_externo?.toLowerCase().includes(searchLower) ||
          movement.valor_original?.toString().includes(searchLower) ||
          movement.valor_pago?.toString().includes(searchLower) ||
          movement.installment_number?.toString().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Filtro por conta - verificando se o campo account existe
      if (filters.accountFilter && filters.accountFilter.trim()) {
        const accountLower = filters.accountFilter.toLowerCase();
        // AIDEV-NOTE: Como não temos campo 'account' específico, vamos usar customerName como alternativa
        if (!movement.customerName?.toLowerCase().includes(accountLower)) {
          return false;
        }
      }
      
      // Filtro por data - usando data de pagamento ou vencimento
      if (filters.dateFrom) {
        const filterDate = new Date(filters.dateFrom);
        const paymentDate = movement.paymentDate ? new Date(movement.paymentDate) : null;
        const dueDate = movement.dueDate ? new Date(movement.dueDate) : null;
        
        // Verifica se pelo menos uma das datas é maior ou igual à data inicial
        if (paymentDate && paymentDate < filterDate && (!dueDate || dueDate < filterDate)) {
          return false;
        }
        if (!paymentDate && dueDate && dueDate < filterDate) {
          return false;
        }
        if (!paymentDate && !dueDate) {
          return false;
        }
      }
      
      if (filters.dateTo) {
        const filterDate = new Date(filters.dateTo);
        const paymentDate = movement.paymentDate ? new Date(movement.paymentDate) : null;
        const dueDate = movement.dueDate ? new Date(movement.dueDate) : null;
        
        // Verifica se pelo menos uma das datas é menor ou igual à data final
        if (paymentDate && paymentDate > filterDate && (!dueDate || dueDate > filterDate)) {
          return false;
        }
        if (!paymentDate && dueDate && dueDate > filterDate) {
          return false;
        }
      }
      
      // Filtros específicos ASAAS - corrigidos para usar campos corretos
      if (filters.source === ReconciliationSource.ASAAS) {
        // Filtro por Nosso Número (usando externalId ou id_externo)
        if (filters.asaasNossoNumero && filters.asaasNossoNumero.trim()) {
          const nossoNumero = filters.asaasNossoNumero.toLowerCase();
          if (!movement.externalId?.toLowerCase().includes(nossoNumero) && 
              !movement.id?.toString().includes(nossoNumero)) {
            return false;
          }
        }
        
        // Filtro por tipo de cobrança (billingType)
        if (filters.asaasBillingType && filters.asaasBillingType !== 'ALL') {
          if (movement.billingType !== filters.asaasBillingType) {
            return false;
          }
        }
        
        // Filtro por status de pagamento ASAAS
        if (filters.asaasPaymentStatus && filters.asaasPaymentStatus !== 'ALL') {
          // Mapear status do ASAAS para nosso enum
          let expectedStatus: PaymentStatus | null = null;
          switch (filters.asaasPaymentStatus) {
            case 'PENDING':
              expectedStatus = PaymentStatus.PENDING;
              break;
            case 'RECEIVED':
            case 'CONFIRMED':
              expectedStatus = PaymentStatus.PAID;
              break;
            case 'OVERDUE':
              expectedStatus = PaymentStatus.OVERDUE;
              break;
            case 'REFUNDED':
              expectedStatus = PaymentStatus.CANCELLED;
              break;
          }
          
          if (expectedStatus && movement.paymentStatus !== expectedStatus) {
            return false;
          }
        }
      }

      // AIDEV-NOTE: Novos filtros avançados baseados na tabela conciliation_staging
      
      // Filtro por método de pagamento
      if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
        if (movement.payment_method !== filters.paymentMethod) {
          return false;
        }
      }

      // Filtro por documento do cliente
      if (filters.customerDocument && filters.customerDocument.trim()) {
        const docFilter = filters.customerDocument.replace(/\D/g, ''); // Remove formatação
        const customerDoc = movement.customer_document?.replace(/\D/g, '') || '';
        if (!customerDoc.includes(docFilter)) {
          return false;
        }
      }

      // Filtro por valor original - mínimo
      if (filters.valorOriginalMin !== undefined && filters.valorOriginalMin !== null) {
        if ((movement.valor_original || 0) < filters.valorOriginalMin) {
          return false;
        }
      }

      // Filtro por valor original - máximo
      if (filters.valorOriginalMax !== undefined && filters.valorOriginalMax !== null) {
        if ((movement.valor_original || 0) > filters.valorOriginalMax) {
          return false;
        }
      }

      // Filtro por status processamento
      if (filters.processed && filters.processed !== 'ALL') {
        const isProcessed = filters.processed === 'true';
        if (movement.processed !== isProcessed) {
          return false;
        }
      }

      // Filtro por status conciliação
      if (filters.reconciled && filters.reconciled !== 'ALL') {
        const isReconciled = filters.reconciled === 'true';
        if (movement.reconciled !== isReconciled) {
          return false;
        }
      }

      // Filtro por número da parcela
      if (filters.installmentNumber !== undefined && filters.installmentNumber !== null) {
        if (movement.installment_number !== filters.installmentNumber) {
          return false;
        }
      }

      // Filtro por referência externa
      if (filters.externalReference && filters.externalReference.trim()) {
        const refFilter = filters.externalReference.toLowerCase();
        const externalRef = movement.external_reference?.toLowerCase() || '';
        if (!externalRef.includes(refFilter)) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log('📊 Total de registros após filtros:', filteredData.length);
    console.log('📈 Taxa de filtro:', `${((filteredData.length / data.length) * 100).toFixed(1)}%`);
    console.groupEnd();
    
    return filteredData;
  };

  // AIDEV-NOTE: Função para calcular indicadores baseados nos dados filtrados - corrigida
  const calculateIndicators = (data: ImportedMovement[]): IndicatorsType => {
    const total = data.length;
    const reconciled = data.filter(m => m.reconciliationStatus === ReconciliationStatus.RECONCILED).length;
    const pending = data.filter(m => m.reconciliationStatus === ReconciliationStatus.PENDING).length;
    const divergent = data.filter(m => m.reconciliationStatus === ReconciliationStatus.DIVERGENT).length;
    
    const totalValue = data.reduce((sum, m) => sum + m.amount, 0);
    const reconciledValue = data
      .filter(m => m.reconciliationStatus === ReconciliationStatus.RECONCILED)
      .reduce((sum, m) => sum + m.amount, 0);
    
    return {
      notReconciled: pending,
      reconciledThisMonth: reconciled,
      valueDifferences: divergent,
      totalAmount: totalValue
    };
  };

  // AIDEV-NOTE: Função para mapear dados do banco para o formato ImportedMovement
  // Baseado na estrutura real da tabela conciliation_staging conforme supabase-tabela.md
  const mapStagingDataToImportedMovement = (stagingData: any[]): ImportedMovement[] => {
    return stagingData.map(item => {
      // AIDEV-NOTE: Mapear payment_status do banco para enum válido (campo existe na tabela)
      let paymentStatus = PaymentStatus.PENDING;
      if (item.payment_status) {
        switch (item.payment_status.toUpperCase()) {
          case 'PAID':
          case 'CONFIRMED':
          case 'RECEIVED':
            paymentStatus = PaymentStatus.PAID;
            break;
          case 'CANCELLED':
          case 'CANCELED':
            paymentStatus = PaymentStatus.CANCELLED;
            break;
          case 'OVERDUE':
          case 'EXPIRED':
            paymentStatus = PaymentStatus.OVERDUE;
            break;
          default:
            paymentStatus = PaymentStatus.PENDING;
        }
      }

      // AIDEV-NOTE: Mapear status_conciliacao corrigido após migração - usar valores do enum
      let reconciliationStatus = ReconciliationStatus.PENDING;
      if (item.status_conciliacao) {
        switch (item.status_conciliacao) {
          case 'RECONCILED':
            reconciliationStatus = ReconciliationStatus.RECONCILED;
            break;
          case 'DIVERGENT':
            reconciliationStatus = ReconciliationStatus.DIVERGENT;
            break;
          case 'CANCELLED':
            reconciliationStatus = ReconciliationStatus.CANCELLED;
            break;
          case 'PENDING':
          default:
            reconciliationStatus = ReconciliationStatus.PENDING;
        }
      }

      return {
        id: item.id,
        externalId: item.id_externo,
        amount: item.valor_pago || item.valor_cobranca || 0,
        chargeAmount: item.valor_cobranca || 0,
        paidAmount: item.valor_pago || 0,
        source: item.origem as ReconciliationSource,
        reconciliationStatus,
        externalStatus: item.status_externo,
        contractId: item.contrato_id,
        chargeId: item.cobranca_id,
        interestDifference: item.juros_multa_diferenca || 0,
        dueDate: item.data_vencimento,
        paymentDate: item.data_pagamento,
        description: item.observacao,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        // Campos computados baseados na estrutura real
        hasContract: !!item.contrato_id,
        customerName: item.customer_name || '',
        customerDocument: item.customer_document || '',
        account: item.external_reference || '',
        tenantId: currentTenant?.id || '',
        // Campos específicos disponíveis na tabela
        billingType: item.payment_method || '',
        paymentStatus,
        // Campos adicionais disponíveis na estrutura real
        originalValue: item.valor_original || 0,
        netValue: item.valor_liquido || 0,
        interestValue: item.valor_juros || 0,
        fineValue: item.valor_multa || 0,
        discountValue: item.valor_desconto || 0,
        // Campos ASAAS disponíveis
        asaasCustomerId: item.asaas_customer_id || '',
        asaasSubscriptionId: item.asaas_subscription_id || '',
        // Campos de cliente disponíveis
        customerEmail: item.customer_email || '',
        customerPhone: item.customer_phone || '',
        customerMobilePhone: item.customer_mobile_phone || '',
        customerAddress: item.customer_address || '',
        customerAddressNumber: item.customer_address_number || '',
        customerComplement: item.customer_complement || '',
        customerProvince: item.customer_province || '',
        customerCity: item.customer_city || '',
        customerState: item.customer_state || '',
        customerPostalCode: item.customer_postal_code || '',
        customerCountry: item.customer_country || '',
        // Campos de parcela
        installmentNumber: item.installment_number || 0,
        installmentCount: item.installment_count || 0,
        // URLs disponíveis
        invoiceUrl: item.invoice_url || '',
        bankSlipUrl: item.bank_slip_url || '',
        transactionReceiptUrl: item.transaction_receipt_url || '',
        // Campos de processamento
        processed: item.processed || false,
        processedAt: item.processed_at,
        processingAttempts: item.processing_attempts || 0,
        processingError: item.processing_error || '',
        // Campos de conciliação
        reconciled: item.reconciled || false,
        reconciledAt: item.reconciled_at,
        reconciledBy: item.reconciled_by,
        reconciliationNotes: item.reconciliation_notes || '',
        // Campos de auditoria
        createdBy: item.created_by,
        updatedBy: item.updated_by,
        // Dados brutos
        rawData: item.raw_data || {},
        webhookEvent: item.webhook_event || '',
        webhookSignature: item.webhook_signature || ''
      };
    });
  };

  const loadReconciliationData = async () => {
    if (!currentTenant?.id) {
      console.error('Tenant não encontrado');
      return;
    }

    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      // AIDEV-NOTE: Garantir que o contexto de autenticação está ativo e propagado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Sessão de autenticação não encontrada');
        toast({
          title: "Erro de Autenticação",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive"
        });
        return;
      }

      console.log('🔐 Configurando contexto - Tenant:', currentTenant.id, 'User:', session.user.id);
      console.log('🔑 Token de acesso presente:', !!session.access_token);
      console.log('🔑 User ID da sessão:', session.user.id);
      
      // AIDEV-NOTE: Configurar contexto de tenant obrigatório para RLS
      const contextResult = await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: currentTenant.id,
        p_user_id: session.user.id
      });

      // AIDEV-NOTE: Usar função de debug para verificar contexto de autenticação
      const { data: authDebug } = await supabase.rpc('debug_auth_context');
      console.log('🔍 Debug auth context:', authDebug);

      // AIDEV-NOTE: Tentar atualizar JWT com tenant atual
      const { data: jwtUpdate } = await supabase.rpc('update_user_jwt_tenant', {
        p_user_id: session.user.id,
        p_tenant_id: currentTenant.id
      });
      console.log('🔑 JWT Update result:', jwtUpdate);

      // AIDEV-NOTE: Refresh da sessão para propagar contexto JWT atualizado
      if (jwtUpdate?.success) {
        console.log('🔄 Fazendo refresh da sessão para propagar JWT...');
        await supabase.auth.refreshSession();
        
        // Aguardar um momento para garantir propagação
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar contexto após refresh
        const { data: authDebugAfter } = await supabase.rpc('debug_auth_context');
        console.log('🔍 Debug auth context após refresh:', authDebugAfter);
      }

      // AIDEV-NOTE: Consulta completa incluindo todos os campos necessários para filtros ASAAS
      console.log('🔍 Executando query na tabela conciliation_staging...');
      const { data, error } = await supabase
        .from('conciliation_staging')
        .select(`
          id,
          origem,
          id_externo,
          valor_cobranca,
          valor_pago,
          status_externo,
          status_conciliacao,
          contrato_id,
          cobranca_id,
          juros_multa_diferenca,
          data_vencimento,
          data_pagamento,
          observacao,
          created_at,
          updated_at,
          asaas_customer_id,
          asaas_subscription_id,
          customer_name,
          customer_document,
          customer_email,
          customer_phone,
          customer_mobile_phone,
          customer_address,
          customer_address_number,
          customer_complement,
          customer_province,
          customer_postal_code,
          customer_city,
          customer_state,
          customer_country,
          external_reference,
          payment_method,
          installment_number,
          installment_count,
          invoice_url,
          bank_slip_url,
          transaction_receipt_url,
          webhook_event,
          webhook_signature,
          processed,
          processed_at,
          processing_attempts,
          processing_error,
          reconciled,
          reconciled_at,
          reconciled_by,
          reconciliation_notes,
          created_by,
          updated_by,
          valor_original,
          valor_liquido,
          valor_juros,
          valor_multa,
          valor_desconto,
          status_anterior,
          deleted_flag,
          anticipated_flag,
          data_vencimento_original,
          data_pagamento_cliente,
          data_confirmacao,
          data_credito,
          data_credito_estimada,
          raw_data
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      console.log('🔍 Query executada - Error:', error);
      console.log('🔍 Query executada - Data length:', data?.length);
      console.log('🔍 Query executada - Primeiros 2 registros:', data?.slice(0, 2));

      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      if (error) {
        throw error;
      }
      
      // AIDEV-NOTE: Mapear dados do banco para o formato correto
      const mappedMovements = mapStagingDataToImportedMovement(data || []);
      
      // AIDEV-NOTE: Debug de quantidade de dados consultados
      console.group('🔍 DEBUG - Dados de Conciliação Carregados');
      console.log(`📊 Total de registros consultados: ${data?.length || 0}`);
      console.log(`⏱️ Tempo de consulta: ${queryTime.toFixed(2)}ms`);
      console.log(`🗂️ Registros mapeados: ${mappedMovements.length}`);
      
      // Análise dos dados por origem
      const origemStats = data?.reduce((acc, item) => {
        acc[item.origem] = (acc[item.origem] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      console.log('📈 Distribuição por origem:', origemStats);
      
      // Análise dos dados por status
      const statusStats = data?.reduce((acc, item) => {
        acc[item.status_conciliacao] = (acc[item.status_conciliacao] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      console.log('📊 Distribuição por status:', statusStats);
      
      // Análise dos dados por método de pagamento
      const paymentMethodStats = data?.reduce((acc, item) => {
        const method = item.payment_method || 'N/A';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      console.log('💳 Distribuição por método de pagamento:', paymentMethodStats);
      
      // Verificação de campos importantes para filtros
      const fieldsAnalysis = {
        comCustomerName: data?.filter(item => item.customer_name).length || 0,
        comCustomerDocument: data?.filter(item => item.customer_document).length || 0,
        comExternalReference: data?.filter(item => item.external_reference).length || 0,
        comDataPagamento: data?.filter(item => item.data_pagamento).length || 0,
        comContratoId: data?.filter(item => item.contrato_id).length || 0,
        comAsaasPaymentId: data?.filter(item => item.asaas_payment_id).length || 0,
      };
      console.log('🔍 Análise de campos para filtros:', fieldsAnalysis);
      console.groupEnd();
      
      setMovements(mappedMovements);
      
      toast({
        title: "Dados carregados",
        description: `${mappedMovements.length} movimentações carregadas com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao carregar dados de conciliação:', error);
      
      toast({
        title: "Erro ao carregar dados",
        description: error.response?.data?.error || error.message || "Não foi possível carregar as movimentações.",
        variant: "destructive",
      });
      
      // Em caso de erro, manter array vazio
      setMovements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    logAction('reconciliation_refresh', { tenant: currentTenant?.name });
    loadReconciliationData();
  };

  const handleExport = () => {
    logAction('reconciliation_export', { 
      tenant: currentTenant?.name,
      recordCount: filteredMovements.length 
    });
    
    toast({
      title: "Exportação iniciada",
      description: `Exportando ${filteredMovements.length} registros...`,
    });
  };

  const handleReconciliationAction = async (action: ReconciliationAction, movementId: string) => {
    try {
      setIsLoading(true);
      
      // AIDEV-NOTE: Configurar contexto de tenant antes da atualização (segurança multi-tenant)
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant?.id 
      });
      
      logAction('reconciliation_action', { 
        action, 
        movementId, 
        tenant: currentTenant?.name 
      });

      // AIDEV-NOTE: Atualização direta no Supabase usando valores corretos do enum
      let updateData: any = {
        updated_at: new Date().toISOString()
      };

      // AIDEV-NOTE: Definir status baseado na ação usando valores do enum corretos
      switch (action) {
        case 'vincular_contrato':
          updateData.status_conciliacao = 'RECONCILED';
          updateData.observacao = 'Contrato vinculado automaticamente';
          break;
        case 'criar_avulsa':
          updateData.status_conciliacao = 'RECONCILED';
          updateData.observacao = 'Cobrança avulsa criada';
          break;
        case 'marcar_divergente':
          updateData.status_conciliacao = 'DIVERGENT';
          updateData.observacao = 'Marcado como divergente';
          break;
        case 'aprovar':
          updateData.status_conciliacao = 'RECONCILED';
          updateData.observacao = 'Movimento aprovado';
          break;
        case 'rejeitar':
          updateData.status_conciliacao = 'CANCELLED';
          updateData.observacao = 'Movimento rejeitado';
          break;
      }

      const { error } = await supabase
        .from('conciliation_staging')
        .update(updateData)
        .eq('id', movementId)
        .eq('tenant_id', currentTenant?.id);

      if (error) {
        throw error;
      }

      const actionMessages = {
        vincular_contrato: "Contrato vinculado com sucesso",
        criar_avulsa: "Cobrança avulsa criada com sucesso",
        marcar_divergente: "Movimento marcado como divergente",
        aprovar: "Movimento aprovado com sucesso",
        rejeitar: "Movimento rejeitado"
      };

      toast({
        title: "Ação executada",
        description: actionMessages[action] || "Ação executada com sucesso",
      });

      // Recarregar dados para refletir as mudanças
      await loadReconciliationData();
    } catch (error: any) {
      console.error('Erro ao executar ação de conciliação:', error);
      
      toast({
        title: "Erro na ação",
        description: error.response?.data?.error || error.message || "Não foi possível executar a ação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // SIDEBAR RESIZE FUNCTIONS
  // =====================================================
  
  // =====================================================
  // LOADING & ACCESS CONTROL
  // =====================================================
  if (tenantLoading) {
    return null; // Modal não aparece durante loading
  }

  if (!hasAccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Acesso Negado
            </DialogTitle>
            <DialogDescription>
              {accessError || 'Você não tem permissão para acessar a conciliação.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // =====================================================
  // MODAL ANIMATIONS
  // =====================================================
  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent 
          className="!max-w-none !w-[90vw] !h-[90vh] !max-h-[90vh] p-0 gap-0 overflow-hidden bg-transparent border-0 !left-[5vw] !top-[5vh] !transform-none !translate-x-0 !translate-y-0"
          style={{ 
            backdropFilter: 'blur(8px)',
            position: 'fixed',
            width: '90vw',
            height: '90vh',
            left: '5vw',
            top: '5vh'
          }}
        >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-background rounded-2xl shadow-2xl h-full w-full flex flex-col overflow-hidden"
            >
              {/* HEADER */}
              <DialogHeader className="px-6 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FileText className="h-6 w-6 text-primary" />
                    </motion.div>
                    <div>
                      <DialogTitle className="text-xl font-semibold">
                        Conciliação Financeira
                      </DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground">
                        {currentTenant?.name} • Sistema de conciliação de contas a receber
                      </DialogDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Exportar
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* INDICADORES MINIMALISTAS NO HEADER */}
                <div className="mt-4 pt-4 border-t border-border/30">
                  {indicators && (
                    <ReconciliationHeaderIndicators 
                      indicators={indicators} 
                      isLoading={isLoading}
                    />
                  )}
                </div>
              </DialogHeader>

              {/* CONTENT - Two Column Layout */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden reconciliation-container relative">
                
                {/* Toggle Button - Posicionamento elegante no meio */}
                <motion.div 
                  className="absolute z-[999999]"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    right: isCollapsed ? '20px' : '380px',
                  }}
                  animate={{
                    right: isCollapsed ? 20 : 380,
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    duration: 0.4
                  }}
                >
                  {/* Container com glassmorphism */}
                  <motion.div
                    className="relative group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Background com glassmorphism - mais sutil */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-slate-50/90 to-white/80 backdrop-blur-lg rounded-xl border border-slate-200/60 shadow-lg"></div>
                    
                    {/* Glow effect sutil */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-slate-300/5 to-blue-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    
                    {/* Botão principal */}
                    <motion.button
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="relative w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:bg-slate-100/50"
                      animate={{ 
                        backgroundColor: isCollapsed ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.1)"
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Ícone com animação suave */}
                      <motion.div
                        animate={{ 
                          rotate: isCollapsed ? 180 : 0,
                          color: isCollapsed ? "rgb(59, 130, 246)" : "rgb(100, 116, 139)"
                        }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 25 
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </motion.div>
                    </motion.button>
                    
                    {/* Tooltip discreto */}
                    <motion.div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-slate-700/90 text-white text-xs rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-[999999]"
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 0, y: -3 }}
                      whileHover={{ opacity: 1, y: 0 }}
                    >
                      {isCollapsed ? 'Expandir' : 'Recolher'}
                      <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-700/90 rotate-45"></div>
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* LEFT COLUMN - Main Content with Table */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 order-1 lg:order-1">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1 overflow-hidden p-3 lg:p-4"
                  >
                    <ReconciliationTable
                      movements={paginatedMovements}
                      isLoading={isLoading}
                      onAction={handleReconciliationAction}
                      pagination={{
                        page: pagination.page,
                        limit: pagination.limit,
                        total: pagination.total,
                        onPageChange: (page: number) => setPagination(prev => ({ ...prev, page })),
                        onLimitChange: (limit: number) => setPagination(prev => ({ ...prev, limit, page: 1 }))
                      }}
                    />
                  </motion.div>
                </div>

                {/* Painel lateral refinado e elegante */}
                <motion.div 
                  className="flex-shrink-0 overflow-y-auto relative order-2 lg:order-2"
                  style={{ 
                    width: isCollapsed ? '60px' : '380px',
                    minWidth: isCollapsed ? '60px' : '380px',
                    maxWidth: isCollapsed ? '60px' : '380px',
                    zIndex: 1
                  }}
                  animate={{ 
                    width: isCollapsed ? 60 : 380 
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30 
                  }}
                >

                  {/* Background premium com gradiente sutil */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/95 via-white/98 to-slate-50/95 backdrop-blur-md"></div>
                  
                  {/* Borda lateral com efeito glass */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-200/30 to-transparent shadow-sm"></div>
                  
                  {/* Sombra interna sutil */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-900/[0.02] to-transparent pointer-events-none"></div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    className="relative p-6 space-y-6"
                  >

                    {/* Container dos filtros com design premium */}
                    <motion.div 
                      className="relative"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {/* Container principal com glass effect */}
                      <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden">
                        {/* Highlight sutil no topo */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent"></div>
                        
                        {/* Conteúdo dos filtros */}
                        <div className="p-5">
                          {!isCollapsed && (
                            <ReconciliationFilters
                              filters={filters}
                              onFiltersChange={setFilters}
                              isLoading={isLoading}
                            />
                          )}
                          
                          {/* Estado colapsado com ícone elegante */}
                          {isCollapsed && (
                            <div className="flex flex-col items-center space-y-4 py-6">
                              <motion.div
                                className="w-10 h-10 bg-gradient-to-br from-blue-500/90 to-purple-600/90 rounded-xl flex items-center justify-center shadow-lg"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              >
                                <FileText className="h-5 w-5 text-white" />
                              </motion.div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default ReconciliationModal;