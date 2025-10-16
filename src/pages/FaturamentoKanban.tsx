import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CalendarDays, 
  DollarSign, 
  FileText, 
  RotateCcw, 
  Loader2, 
  AlertCircle, 
  CreditCard, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Inbox 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortableItem } from '@/components/ui/sortable-item';
import { useBillingKanban, type KanbanContract } from '@/hooks/useBillingKanban';
import { useKanbanFilters } from '@/hooks/useKanbanFilters';
import { KanbanFilters } from '@/components/billing/KanbanFilters';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { NewContractForm } from '@/components/contracts/NewContractForm';
import { MonthlyBillingDetails } from '@/components/billing/MonthlyBillingDetails';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useTenantAccessGuard, useSecureTenantMutation } from '@/hooks/templates/useSecureTenantQuery';
import { useSupabase } from '@/hooks/useSupabase';
import logger from '@/lib/logger';
import { 
  groupItemsByPaymentConfig, 
  generateGroupDescription, 
  calculateGroupDueDate, 
  mapGroupPaymentMethodToChargeType,
  type PaymentGroup 
} from '@/utils/billingGrouper';
import { ensureAuthenticated, withAuth, forceSessionRefresh } from '@/utils/authGuard';
import { insertChargeWithAuthContext, insertMultipleCharges } from '@/utils/chargeUtils';
import { format, startOfDay, addMonths } from 'date-fns';

type ContractStatus = 'Faturar Hoje' | 'Faturamento Pendente' | 'Faturados no Mês' | 'Contratos a Renovar';

// AIDEV-NOTE: Definição de colunas movida para dentro do componente para evitar duplicação

interface KanbanCardProps {
  contract: KanbanContract;
  isDragging?: boolean;
  columnId?: string;
  onViewDetails: (contractId: string) => void;
  dragHandleProps?: Record<string, unknown>;
  isSelected?: boolean;
  onSelectionChange?: (periodId: string, selected: boolean) => void;
  showCheckbox?: boolean;
}

function KanbanCard({ 
  contract, 
  isDragging, 
  columnId, 
  onViewDetails, 
  dragHandleProps, 
  isSelected = false, 
  onSelectionChange, 
  showCheckbox = false 
}: KanbanCardProps) {
  const [isClicking, setIsClicking] = useState(false);
  const isPending = contract.status === 'Faturamento Pendente';
  const isFaturarHoje = columnId === 'faturar-hoje';
  const isFaturados = columnId === 'faturados';
  const isRenovar = columnId === 'renovar';
  
  // AIDEV-NOTE: Função para abrir modal de detalhes do contrato com proteção contra múltiplos cliques e validação de contract_id
  const handleViewDetails = useCallback(async () => {
    if (isClicking) return;
    
    // AIDEV-NOTE: Validação defensiva para prevenir contract_id undefined
    if (!contract.contract_id) {
      console.error('Erro: contract_id está undefined para o contrato:', {
        id: contract.id,
        customer_name: contract.customer_name,
        contract_number: contract.contract_number
      });
      return;
    }
    
    setIsClicking(true);
    try {
      onViewDetails(contract.contract_id);
    } finally {
      // Reset após um pequeno delay
      setTimeout(() => setIsClicking(false), 500);
    }
  }, [isClicking, onViewDetails, contract.contract_id, contract.id, contract.customer_name, contract.contract_number]);
  
  // AIDEV-NOTE: Função para lidar com mudança de seleção do checkbox
  // Agora usa contract.id (period_id) em vez de contract.contract_id
  const handleSelectionChange = useCallback((checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(contract.id, checked);
    }
  }, [onSelectionChange, contract.id]);
  
  // AIDEV-NOTE: Definir estilos baseados na coluna para design moderno
  const getCardStyles = () => {
    if (isFaturarHoje) {
      return {
        gradient: 'from-emerald-50 via-green-50 to-emerald-50',
        border: 'border-emerald-200 hover:border-emerald-300',
        accent: 'bg-emerald-500',
        textPrimary: 'text-emerald-900',
        textSecondary: 'text-emerald-700'
      };
    }
    if (isPending) {
      return {
        gradient: 'from-orange-50 via-amber-50 to-orange-50',
        border: 'border-orange-200 hover:border-orange-300',
        accent: 'bg-orange-500',
        textPrimary: 'text-orange-900',
        textSecondary: 'text-orange-700'
      };
    }
    if (isFaturados) {
      return {
        gradient: 'from-blue-50 via-indigo-50 to-blue-50',
        border: 'border-blue-200 hover:border-blue-300',
        accent: 'bg-blue-500',
        textPrimary: 'text-blue-900',
        textSecondary: 'text-blue-700'
      };
    }
    if (isRenovar) {
      return {
        gradient: 'from-purple-50 via-violet-50 to-purple-50',
        border: 'border-purple-200 hover:border-purple-300',
        accent: 'bg-purple-500',
        textPrimary: 'text-purple-900',
        textSecondary: 'text-purple-700'
      };
    }
    return {
      gradient: 'from-gray-50 via-slate-50 to-gray-50',
      border: 'border-gray-200 hover:border-gray-300',
      accent: 'bg-gray-500',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700'
    };
  };
  
  const styles = getCardStyles();
  
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 ease-out",
      "hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1",
      "bg-gradient-to-br", styles.gradient,
      styles.border,
      isDragging && "opacity-60 rotate-2 scale-105 shadow-xl",
      isSelected && "ring-2 ring-primary ring-offset-2 border-primary shadow-lg scale-[1.02]"
    )}>
      {/* Accent bar */}
      <div className={cn("absolute top-0 left-0 w-full h-1", styles.accent)} />
      
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Checkbox de seleção */}
          {showCheckbox && (
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
              <Checkbox
                id={`select-${contract.contract_id}`}
                checked={isSelected}
                onCheckedChange={handleSelectionChange}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor={`select-${contract.contract_id}`} 
                className="text-xs text-gray-600 cursor-pointer font-medium"
              >
                Selecionar para faturar
              </label>
            </div>
          )}
          
          {/* Header com drag handle */}
          <div 
            className={cn(
              "flex items-center justify-between cursor-grab active:cursor-grabbing",
              "group-hover:cursor-grab",
              dragHandleProps && "select-none"
            )}
            {...(dragHandleProps || {})}
          >
            <div className="flex items-center space-x-2">
              <span className={cn("font-bold text-sm", styles.textPrimary)}>
                {contract.contract_id ? `#${contract.contract_id.slice(-8)}` : 'N/A'}
              </span>
            </div>
            <Badge 
              variant="secondary"
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                isFaturarHoje && "bg-emerald-100 text-emerald-800 border-emerald-200",
                isPending && "bg-orange-100 text-orange-800 border-orange-200",
                isFaturados && "bg-blue-100 text-blue-800 border-blue-200",
                isRenovar && "bg-purple-100 text-purple-800 border-purple-200"
              )}
            >
              {isFaturarHoje && <Clock className="w-3 h-3 mr-1" />}
              {isPending && <AlertCircle className="w-3 h-3 mr-1" />}
              {isFaturados && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {isRenovar && <RotateCcw className="w-3 h-3 mr-1" />}
              {contract.status}
            </Badge>
          </div>
          
          {/* Cliente */}
          <div className="space-y-1">
            <p className={cn("text-sm font-medium leading-tight", styles.textSecondary)}>
              {contract.customer_name}
            </p>
          </div>
          
          {/* Valor */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1">
              <DollarSign className={cn("w-4 h-4", styles.textPrimary)} />
              <span className={cn("text-lg font-bold", styles.textPrimary)}>
                R$ {(contract.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          {/* Botão de ação */}
          <Button 
            size="sm" 
            variant="ghost"
            className={cn(
              "w-full mt-3 font-medium transition-all duration-200",
              "hover:bg-white/80 hover:shadow-sm",
              styles.textPrimary
            )}
            disabled={isClicking}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleViewDetails();
            }}
          >
            {isClicking ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-2" />
                Ver Detalhes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  title: string;
  contracts: KanbanContract[];
  columnId: string;
  icon: React.ReactNode;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  onViewDetails: (contractId: string) => void;
  selectedContracts?: Set<string>;
  onSelectionChange?: (periodId: string, selected: boolean) => void;
  showCheckboxes?: boolean;
}

function KanbanColumn({ 
  title, 
  contracts, 
  columnId, 
  icon, 
  badgeVariant, 
  onViewDetails, 
  selectedContracts = new Set(), 
  onSelectionChange, 
  showCheckboxes = false 
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  
  // AIDEV-NOTE: Definir estilos baseados no tipo de coluna para design moderno
  const getColumnStyles = () => {
    switch (columnId) {
      case 'faturar-hoje':
        return {
          headerGradient: 'from-emerald-500 to-green-600',
          headerBg: 'bg-gradient-to-r from-emerald-500 to-green-600',
          borderColor: 'border-emerald-200',
          bgColor: 'bg-emerald-50/30',
          iconColor: 'text-white',
          titleColor: 'text-white',
          badgeStyle: 'bg-white/20 text-white border-white/30'
        };
      case 'pendente':
        return {
          headerGradient: 'from-orange-500 to-amber-600',
          headerBg: 'bg-gradient-to-r from-orange-500 to-amber-600',
          borderColor: 'border-orange-200',
          bgColor: 'bg-orange-50/30',
          iconColor: 'text-white',
          titleColor: 'text-white',
          badgeStyle: 'bg-white/20 text-white border-white/30'
        };
      case 'faturados':
        return {
          headerGradient: 'from-blue-500 to-indigo-600',
          headerBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          borderColor: 'border-blue-200',
          bgColor: 'bg-blue-50/30',
          iconColor: 'text-white',
          titleColor: 'text-white',
          badgeStyle: 'bg-white/20 text-white border-white/30'
        };
      case 'renovar':
        return {
          headerGradient: 'from-purple-500 to-violet-600',
          headerBg: 'bg-gradient-to-r from-purple-500 to-violet-600',
          borderColor: 'border-purple-200',
          bgColor: 'bg-purple-50/30',
          iconColor: 'text-white',
          titleColor: 'text-white',
          badgeStyle: 'bg-white/20 text-white border-white/30'
        };
      default:
        return {
          headerGradient: 'from-gray-500 to-slate-600',
          headerBg: 'bg-gradient-to-r from-gray-500 to-slate-600',
          borderColor: 'border-gray-200',
          bgColor: 'bg-gray-50/30',
          iconColor: 'text-white',
          titleColor: 'text-white',
          badgeStyle: 'bg-white/20 text-white border-white/30'
        };
    }
  };
  
  const styles = getColumnStyles();
  
  return (
    <div className={cn(
      "flex flex-col h-full rounded-xl overflow-hidden min-h-[500px]",
      "border-2 transition-all duration-300",
      "hover:shadow-lg hover:shadow-black/5",
      styles.borderColor,
      styles.bgColor,
      isOver && "ring-2 ring-blue-500/20 bg-blue-50/50"
    )}>
      {/* Header moderno com gradiente */}
      <div className={cn(
        "relative overflow-hidden",
        styles.headerBg
      )}>
        {/* Efeito de brilho sutil */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="relative flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg bg-white/20 backdrop-blur-sm", styles.iconColor)}>
              {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
            </div>
            <div>
              <h3 className={cn("font-bold text-lg tracking-tight", styles.titleColor)}>
                {title}
              </h3>
              <p className="text-white/80 text-xs font-medium">
                {contracts.length} {contracts.length === 1 ? 'contrato' : 'contratos'}
              </p>
            </div>
          </div>
          <Badge 
            className={cn(
              "font-bold text-sm px-3 py-1 rounded-full",
              "backdrop-blur-sm border",
              styles.badgeStyle
            )}
          >
            {contracts.length}
          </Badge>
        </div>
      </div>
      
      {/* Área de drop com scroll customizado */}
      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 p-4 space-y-4 overflow-y-auto",
          "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
          "hover:scrollbar-thumb-gray-400"
        )}
      >
        <SortableContext items={contracts.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {contracts.map((contract) => (
            <SortableItem key={contract.id} id={contract.id} disabled={false} useHandle={true}>
              <KanbanCard 
                contract={contract} 
                columnId={columnId} 
                onViewDetails={onViewDetails}
                isSelected={selectedContracts.has(contract.id)}
                onSelectionChange={onSelectionChange}
                showCheckbox={showCheckboxes && (columnId === 'faturar-hoje' || columnId === 'pendente')}
              />
            </SortableItem>
          ))}
          
          {/* Estado vazio melhorado */}
          {contracts.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">
                Nenhum contrato
              </p>
              <p className="text-xs text-gray-400">
                Os contratos aparecerão aqui
              </p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export default function FaturamentoKanban() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const { kanbanData, isLoading, error, refreshData, updateContractStatus } = useBillingKanban();
  const { user } = useSupabase();
  
  // Hook de filtros
  const {
    filters,
    filteredData,
    updateFilter,
    clearFilters,
    hasActiveFilters
  } = useKanbanFilters(kanbanData);
  
  // 🔍 [DEBUG] Log do estado do componente
  console.log('🎯 [COMPONENT] FaturamentoKanban render:', {
    hasAccess,
    isLoading,
    error,
    kanbanDataKeys: Object.keys(kanbanData),
    kanbanDataCounts: {
      'faturar-hoje': kanbanData['faturar-hoje']?.length || 0,
      'pendente': kanbanData['pendente']?.length || 0,
      'faturados': kanbanData['faturados']?.length || 0,
      'renovar': kanbanData['renovar']?.length || 0
    },
    currentTenant: currentTenant?.name
  });
  const [activeContract, setActiveContract] = useState<KanbanContract | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [isBilling, setIsBilling] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [contractMode, setContractMode] = useState<'view' | 'edit'>('view');

  // AIDEV-NOTE: Abrir modal com segurança multi-tenant (define contexto + filtra tenant)
  const handleViewDetails = useCallback(async (contractId: string) => {
    // Previne múltiplos cliques rápidos
    if (isContractModalOpen) return;
    // Guardas de segurança: requer acesso e tenant válido
    if (!hasAccess || !currentTenant?.id) {
      console.warn('Acesso negado ou tenant inválido ao abrir detalhes do contrato');
      return;
    }

    try {
      console.log('🔍 [MODAL DEBUG] Abrindo modal para contrato:', {
        contractId,
        tenantId: currentTenant.id,
        tenantName: currentTenant.name,
        hasAccess
      });

      // AIDEV-NOTE: Configura contexto de tenant para reforçar RLS em operações subsequentes
      console.log('🔧 [MODAL DEBUG] Configurando contexto de tenant...');
      await supabase.rpc('set_tenant_context_simple', { p_tenant_id: currentTenant.id });
      console.log('✅ [MODAL DEBUG] Contexto de tenant configurado com sucesso');

      // Buscar o status do contrato para determinar o mode, filtrando pelo tenant
      console.log('🔍 [MODAL DEBUG] Buscando status do contrato...');
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('status, tenant_id')
        .eq('id', contractId)
        .eq('tenant_id', currentTenant.id)
        .single();

      if (contractError || !contract) {
        console.error('❌ [MODAL DEBUG] Erro ao buscar status do contrato:', contractError);
        // Usar mode padrão em caso de erro
        setContractMode('view');
      } else {
        console.log('✅ [MODAL DEBUG] Status do contrato obtido:', {
          status: contract.status,
          tenant_id: contract.tenant_id,
          contractId
        });
        // Determinar o mode baseado no status do contrato
        const mode = (contract.status === 'ACTIVE') ? 'view' : 'edit';
        setContractMode(mode);
      }

      console.log('🚀 [MODAL DEBUG] Abrindo modal...');
      setSelectedContractId(contractId);
      setIsContractModalOpen(true);
      
      // AIDEV-NOTE: Pequeno delay para garantir que o contexto seja aplicado antes do hook ser executado
      setTimeout(() => {
        console.log('✅ [MODAL DEBUG] Modal aberto com sucesso para contrato:', contractId);
      }, 100);
      
    } catch (error) {
      console.error('❌ [MODAL DEBUG] Erro ao abrir modal do contrato:', error);
      // Usar mode padrão em caso de erro
      setContractMode('view');
      
      setSelectedContractId(contractId);
      setIsContractModalOpen(true);
    }
  }, [isContractModalOpen, hasAccess, currentTenant?.id, currentTenant?.name]);

  // AIDEV-NOTE: Função para fechar modal de detalhes do contrato
  const handleCloseModal = useCallback(() => {
    console.log('Fechando modal de contrato');
    setIsContractModalOpen(false);
    setSelectedContractId(null);
  }, []);

  // AIDEV-NOTE: Função para lidar com mudança de seleção de contratos
  // Agora usa period_id (contract.id) em vez de contract_id
  const handleSelectionChange = useCallback((periodId: string, selected: boolean) => {
    setSelectedContracts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(periodId);
      } else {
        newSet.delete(periodId);
      }
      return newSet;
    });
  }, []);

  // AIDEV-NOTE: Função para alternar modo de seleção
  const toggleSelectionMode = useCallback(() => {
    setShowCheckboxes(prev => !prev);
    if (showCheckboxes) {
      setSelectedContracts(new Set());
    }
  }, [showCheckboxes]);

  // AIDEV-NOTE: Função para mapear payment_method dos serviços para o tipo da cobrança
  // Constraint do banco: tipo in ('BOLETO', 'PIX', 'CREDIT_CARD', 'CASH')
  const mapPaymentMethodToChargeType = (paymentMethod: string | null, cardType: string | null, installments: number | null): string => {
    if (!paymentMethod) return 'BOLETO'; // Default fallback
    
    switch (paymentMethod.toLowerCase()) {
      case 'cartão':
        // Para parcelamento, ainda usamos CREDIT_CARD (constraint não permite INSTALLMENT)
        return 'CREDIT_CARD';
      case 'pix':
        return 'PIX';
      case 'transferência':
      case 'bank_transfer':
        // Transferência será tratada como BOLETO (constraint não permite TRANSFER)
        return 'BOLETO';
      case 'boleto':
      case 'bank_slip':
        return 'BOLETO';
      case 'dinheiro':
      case 'cash':
        return 'CASH';
      default:
        return 'BOLETO';
    }
  };

  // AIDEV-NOTE: Hook seguro para mutação de faturamento usando attempt_billing_period_charge
  const billingMutation = useSecureTenantMutation(
    async (supabase, tenantId, variables: { periodIds: string[] }) => {
      const { periodIds } = variables;
      let successCount = 0;
      let errorCount = 0;

      // AIDEV-NOTE: Forçar refresh da sessão antes de processar cobranças críticas
      const authCheck = await forceSessionRefresh();
      if (!authCheck.success) {
        throw new Error(`Falha na autenticação: ${authCheck.error}. Tente fazer login novamente.`);
      }
      
      console.log('✅ [BILLING] Sessão refreshada com sucesso para usuário:', authCheck.user?.id);
      console.log('🔒 [BILLING] Processando faturamento para tenant:', tenantId);

      // AIDEV-NOTE: CAMADA 4 - Configuração explícita de contexto de tenant (OBRIGATÓRIO)
      try {
        await supabase.rpc('set_tenant_context_simple', { 
          p_tenant_id: tenantId 
        });
        console.log('🛡️ [SECURITY] Contexto de tenant configurado:', tenantId);
      } catch (contextError) {
        console.error('❌ [SECURITY] Falha ao configurar contexto de tenant:', contextError);
        throw new Error('Falha na configuração de segurança. Tente novamente.');
      }

      // AIDEV-NOTE: Processar cada período de faturamento usando attempt_billing_period_charge
      for (const periodId of periodIds) {
        try {
          // AIDEV-NOTE: CAMADA 5 - Validação crítica antes da operação
          if (!tenantId || !periodId) {
            console.error('❌ [SECURITY] Parâmetros inválidos:', { tenantId, periodId });
            errorCount++;
            continue;
          }

          console.log(`📋 [BILLING] Processando período de faturamento: ${periodId}`);

          // AIDEV-NOTE: Usar attempt_billing_period_charge para criar cobrança e atualizar status
          const { data: result, error: billingError } = await supabase.rpc('attempt_billing_period_charge', {
            p_period_id: periodId,
            p_tenant_id: tenantId
          });

          if (billingError) {
            console.error('❌ [BILLING] Erro ao processar período:', billingError);
            errorCount++;
            continue;
          }

          // AIDEV-NOTE: Verificar resultado da operação
          if (result?.success) {
            console.log(`✅ [BILLING] Período ${periodId} faturado com sucesso. Charge ID: ${result.charge_id}`);
            successCount++;
          } else {
            console.error(`❌ [BILLING] Falha ao faturar período ${periodId}:`, result?.error || 'Erro desconhecido');
            errorCount++;
          }

        } catch (error) {
          console.error('❌ [BILLING] Erro no processamento do período:', error);
          errorCount++;
        }
      }

      return { successCount, errorCount };
    },
    {
      onSuccess: ({ successCount, errorCount }) => {
        // Mostrar resultado
        if (successCount > 0) {
          toast({
            title: "Faturamento realizado",
            description: `${successCount} contrato(s) faturado(s) com sucesso.${errorCount > 0 ? ` ${errorCount} erro(s) encontrado(s).` : ''}`,
          });
        }

        if (errorCount > 0 && successCount === 0) {
          toast({
            title: "Erro no faturamento",
            description: `Não foi possível faturar nenhum contrato. ${errorCount} erro(s) encontrado(s).`,
            variant: "destructive",
          });
        }

        // Limpar seleção e atualizar dados
        setSelectedContracts(new Set());
        setShowCheckboxes(false);
        refreshData();
      },
      onError: (error) => {
        console.error('❌ [BILLING] Erro geral no faturamento:', error);
        toast({
          title: "Erro no faturamento",
          description: error.message || "Ocorreu um erro inesperado durante o faturamento.",
          variant: "destructive",
        });
      },
      invalidateQueries: ['kanban', 'charges', 'contracts']
    }
  );

  // AIDEV-NOTE: Função wrapper para iniciar o faturamento
  // Agora usa period_ids em vez de contract_ids e attempt_billing_period_charge
  const handleBilling = useCallback(async () => {
    if (!currentTenant || selectedContracts.size === 0) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos um período para faturar.",
        variant: "destructive",
      });
      return;
    }

    setIsBilling(true);
    try {
      const periodIds = Array.from(selectedContracts);
      console.log('🚀 [BILLING] Iniciando faturamento para períodos:', periodIds);
      
      // Log de auditoria - início do faturamento
       await logger.audit({
         userId: user?.id || 'anonymous',
         tenantId: currentTenant.id,
         action: 'CREATE',
         resourceType: 'BILLING',
         resourceId: periodIds.join(','),
         metadata: {
           operation: 'bulk_billing_started',
           period_count: periodIds.length,
           period_ids: periodIds
         }
       });
       
       const result = await billingMutation.mutateAsync({ periodIds });
       
       // Log de auditoria - resultado do faturamento
       await logger.audit({
         userId: user?.id || 'anonymous',
         tenantId: currentTenant.id,
         action: 'CREATE',
         resourceType: 'BILLING',
         resourceId: periodIds.join(','),
         metadata: {
           operation: 'bulk_billing_completed',
           success_count: result?.successCount || 0,
           error_count: result?.errorCount || 0,
           total_processed: periodIds.length
         }
       });
    } catch (error) {
      // Log de auditoria - erro no faturamento
       await logger.audit({
         userId: user?.id || 'anonymous',
         tenantId: currentTenant.id,
         action: 'CREATE',
         resourceType: 'BILLING',
         resourceId: Array.from(selectedContracts).join(','),
         metadata: {
           operation: 'bulk_billing_failed',
           error_message: error instanceof Error ? error.message : 'Erro desconhecido',
           period_count: selectedContracts.size,
           period_ids: Array.from(selectedContracts)
         }
       });
      
      // Erro já tratado no onError do mutation
      console.error('❌ [BILLING] Erro capturado no handleBilling:', error);
    } finally {
      setIsBilling(false);
    }
  }, [currentTenant, selectedContracts, billingMutation, user?.id]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const contractId = active.id as string;
    
    // Encontrar o contrato ativo em todas as colunas
    const allContracts = Object.values(kanbanData).flat();
    const contract = allContracts.find(c => c.id === contractId);
    setActiveContract(contract || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContract(null);

    if (!over) return;

    const contractId = active.id as string;
    const newColumnId = over.id as string;

    // Verificar se é uma coluna válida
    if (!['faturar-hoje', 'pendente', 'faturados', 'renovar'].includes(newColumnId)) {
      return;
    }

    // AIDEV-NOTE: Otimização - criar mapa de contratos para busca mais eficiente
    const contractMap = new Map<string, { contract: KanbanContract; columnId: string }>();
    
    Object.entries(kanbanData).forEach(([columnId, columnContracts]) => {
      columnContracts.forEach(contract => {
        contractMap.set(contract.id, { contract, columnId });
      });
    });

    const contractInfo = contractMap.get(contractId);
    if (!contractInfo) {
      console.warn('Contrato não encontrado:', contractId);
      return;
    }

    const { contract: contractToMove, columnId: sourceColumnId } = contractInfo;

    if (!contractToMove || !sourceColumnId || sourceColumnId === newColumnId) {
      return;
    }

    // AIDEV-NOTE: Atualização otimista - mover o contrato imediatamente na UI
    const optimisticUpdate = () => {
      const newKanbanData = { ...kanbanData };
      
      // Remover da coluna origem
      newKanbanData[sourceColumnId as keyof KanbanData] = newKanbanData[sourceColumnId as keyof KanbanData]
        .filter(c => c.id !== contractId);
      
      // Adicionar na coluna destino com status atualizado
      const updatedContract = {
        ...contractToMove,
        status: newColumnId === 'faturados' ? 'Faturados no Mês' as const :
                newColumnId === 'pendente' ? 'Faturamento Pendente' as const :
                newColumnId === 'faturar-hoje' ? 'Faturar Hoje' as const :
                'Contratos a Renovar' as const
      };
      
      newKanbanData[newColumnId as keyof KanbanData] = [
        ...newKanbanData[newColumnId as keyof KanbanData],
        updatedContract
      ];
      
      return newKanbanData;
    };
    
    // Aplicar atualização otimista
    const previousData = kanbanData;
    const optimisticData = optimisticUpdate();
    
    // Atualizar estado local imediatamente
    // Note: Como estamos usando o hook useBillingKanban, precisamos atualizar via refreshData
    // Por isso vamos fazer a atualização após a operação no servidor

    // AIDEV-NOTE: Lógica corrigida para lidar com contratos sem billing_id
    try {
      if (newColumnId === 'faturados') {
        // Se o contrato não tem billing_id, precisamos criar uma cobrança primeiro
        if (!contractToMove.billing_id) {
          console.log('🔄 Criando cobrança para contrato sem billing_id:', contractToMove.contract_id);
          
          // AIDEV-NOTE: Buscar método de pagamento do contrato com contexto seguro para determinar tipo correto
          let paymentMethod = 'boleto'; // Default fallback
          try {
            // AIDEV-NOTE: Configura contexto de tenant antes de consulta para garantir RLS
            await supabase.rpc('set_tenant_context_simple', { p_tenant_id: currentTenant.id });
            const { data: contractData } = await supabase
              .from('contracts')
              .select('contract_services(payment_method), contract_products(payment_method)')
              .eq('id', contractToMove.contract_id)
              .eq('tenant_id', currentTenant.id)
              .single();
            
            // Pegar o primeiro método de pagamento encontrado
            const serviceMethod = contractData?.contract_services?.[0]?.payment_method;
            const productMethod = contractData?.contract_products?.[0]?.payment_method;
            paymentMethod = serviceMethod || productMethod || 'boleto';
          } catch (error) {
            console.warn('Erro ao buscar método de pagamento, usando padrão:', error);
          }
          
          // AIDEV-NOTE: Criar cobrança usando a função de utilidade com parâmetros corretos
          const chargeData = {
            tenant_id: currentTenant.id, // AIDEV-NOTE: Usar tenant_id do contexto seguro
            contract_id: contractToMove.contract_id,
            customer_id: contractToMove.customer_id,
            valor: contractToMove.valor, // AIDEV-NOTE: Usar 'valor' ao invés de 'amount'
            data_vencimento: format(startOfDay(new Date()), 'yyyy-MM-dd'), // AIDEV-NOTE: Usar startOfDay para consistência de timezone
            descricao: `Faturamento do contrato ${contractToMove.numero}`, // AIDEV-NOTE: Usar 'descricao' ao invés de 'description'
            status: 'RECEIVED', // Já marcar como recebido pois foi movido para 'faturados'
            tipo: mapPaymentMethodToChargeType(paymentMethod, null, null) // AIDEV-NOTE: Usar função para mapear tipo correto
          };
          
          const result = await insertChargeWithAuthContext(chargeData);
          if (result.success) {
            console.log('✅ Cobrança criada com sucesso:', result.data?.id);
            toast({
              title: "Sucesso",
              description: `Contrato ${contractToMove.numero} faturado com sucesso!`,
            });
          } else {
            throw new Error(result.error || 'Erro ao criar cobrança');
          }
        } else {
          // Se já tem billing_id, apenas atualizar o status
          await updateContractStatus(contractToMove.contract_id, contractToMove.billing_id, 'PAID');
        }
      } else if (newColumnId === 'pendente') {
        // Para mover para pendente, só atualizar se já tiver billing_id
        if (contractToMove.billing_id) {
          await updateContractStatus(contractToMove.contract_id, contractToMove.billing_id, 'SCHEDULED');
        }
      }
       
       // AIDEV-NOTE: Recarregar dados do kanban após operação bem-sucedida
       await refreshData();
       
       console.log(`✅ Contrato ${contractId} movido de ${sourceColumnId} para ${newColumnId}`);
     } catch (error) {
       console.error('❌ Erro ao processar movimento do contrato:', error);
       
       // AIDEV-NOTE: Em caso de erro, recarregar dados para reverter qualquer mudança otimista
       await refreshData();
       
       toast({
         title: "Erro",
         description: `Erro ao mover contrato: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
         variant: "destructive"
       });
     }
   };

  const handleDragCancel = () => {
    setActiveContract(null);
  };

  const columns = [
    {
      id: 'faturar-hoje',
      title: 'Faturar Hoje',
      contracts: kanbanData['faturar-hoje'],
      icon: <CalendarDays className="h-4 w-4" />,
      badgeVariant: 'destructive' as const
    },
    {
      id: 'pendente',
      title: 'Faturamento Pendente',
      contracts: kanbanData['pendente'],
      icon: <FileText className="h-4 w-4" />,
      badgeVariant: 'secondary' as const
    },
    {
      id: 'faturados',
      title: 'Faturados no Mês',
      contracts: kanbanData['faturados'],
      icon: <DollarSign className="h-4 w-4" />,
      badgeVariant: 'default' as const
    },
    {
      id: 'renovar',
      title: 'Contratos a Renovar',
      contracts: kanbanData['renovar'],
      icon: <RotateCcw className="h-4 w-4" />,
      badgeVariant: 'outline' as const
    }
  ];

  // 🛡️ VALIDAÇÃO CRÍTICA DE ACESSO
  if (!hasAccess) {
    return (
      <Layout title="Kanban de Faturamento">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {accessError || 'Acesso negado ao tenant'}
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Mostrar loading
  if (isLoading) {
    return (
      <Layout title="Kanban de Faturamento">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Kanban de Faturamento</h1>
            <p className="text-gray-600">Gerencie o fluxo de faturamento dos seus contratos</p>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Carregando contratos...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Mostrar erro
  if (error) {
    return (
      <Layout title="Kanban de Faturamento">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Kanban de Faturamento</h1>
            <p className="text-gray-600">Gerencie o fluxo de faturamento dos seus contratos</p>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados: {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={refreshData}
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Kanban de Faturamento">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="p-6">
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl shadow-black/5 p-6 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Kanban de Faturamento
                    </h1>
                    <p className="text-gray-600 font-medium mt-1">
                      Gerencie o fluxo de faturamento dos seus contratos com eficiência
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={toggleSelectionMode}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center space-x-2 font-medium transition-all duration-200",
                      "hover:shadow-md hover:scale-105 border-2",
                      showCheckboxes 
                        ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" 
                        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>{showCheckboxes ? 'Cancelar Seleção' : 'Selecionar para Faturar'}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={refreshData}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center space-x-2 font-medium transition-all duration-200",
                      "hover:shadow-md hover:scale-105 border-2 border-gray-200 bg-gray-50",
                      "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    <span>Atualizar</span>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Filtros */}
            <KanbanFilters
              filters={filters}
              onFilterChange={updateFilter}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          
            {/* Botão de faturamento - aparece quando há contratos selecionados */}
            {selectedContracts.size > 0 && (
              <div className="flex items-center justify-center mt-4">
                <Button 
                  onClick={handleBilling}
                  disabled={isBilling}
                  size="lg"
                  className={cn(
                    "flex items-center space-x-2 font-bold transition-all duration-200",
                    "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
                    "shadow-lg hover:shadow-xl hover:scale-105 border-0",
                    "text-white px-8 py-3 rounded-xl"
                  )}
                >
                  {isBilling ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processando Faturamento...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>Faturar {selectedContracts.size} Contrato{selectedContracts.size > 1 ? 's' : ''}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-6">
              {columns.map(column => {
                // Usar dados filtrados se houver filtros ativos
                const columnContracts = hasActiveFilters 
                  ? filteredData[column.id as keyof typeof filteredData] || []
                  : column.contracts;
                  
                return (
                  <KanbanColumn
                    key={column.id}
                    title={column.title}
                    contracts={columnContracts}
                    columnId={column.id}
                    icon={column.icon}
                    badgeVariant={column.badgeVariant}
                    onViewDetails={handleViewDetails}
                    selectedContracts={selectedContracts}
                    onSelectionChange={handleSelectionChange}
                    showCheckboxes={showCheckboxes}
                  />
                );
              })}
            </div>
          
            <DragOverlay>
              {activeContract ? (
                <KanbanCard contract={activeContract} isDragging onViewDetails={handleViewDetails} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Modal de detalhes de faturamento mensal */}
        <Dialog open={isContractModalOpen} onOpenChange={(open) => {
          if (!open) {
            handleCloseModal();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Detalhes de Faturamento Mensal</DialogTitle>
            </DialogHeader>
            {selectedContractId && isContractModalOpen && (
              <MonthlyBillingDetails
                contractId={selectedContractId}
                onClose={handleCloseModal}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
