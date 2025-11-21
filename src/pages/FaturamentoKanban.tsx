import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
// UI: Tooltip para ícones discretos de status nos cards
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { BillingOrderDetails } from '@/components/billing/BillingOrderDetails';
import { CreateStandaloneBillingDialog } from '@/components/billing/CreateStandaloneBillingDialog';
import { ContractFormSkeleton } from '@/components/contracts/ContractFormSkeleton';
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

// AIDEV-NOTE: DialogContent customizado com sistema de scroll otimizado (mesmo padrão de Contracts.tsx)
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden flex flex-col",
        className
      )}
      onOpenAutoFocus={(e) => {
        // Previne o foco automático que pode causar conflito com aria-hidden
        e.preventDefault();
      }}
      {...props}
    >
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

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

/**
 * KanbanCard
 * Card de contrato dentro do Kanban.
 * Ajustado para um design clean: fundo branco, bordas discretas, menos sombra e sem gradientes.
 */
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
  
  // AIDEV-NOTE: Função para abrir modal de detalhes da ordem de faturamento
  // Agora passa period_id (contract.id) ao invés de contract_id
  const handleViewDetails = useCallback(async () => {
    if (isClicking) return;
    
    // AIDEV-NOTE: Validação para garantir que contract.id existe
    if (!contract.id) {
      console.error('❌ [KANBAN CARD] contract.id está vazio ou undefined');
      return;
    }
    
    // AIDEV-NOTE: contract.id é o period_id (id do contract_billing_periods)
    // Para faturamentos avulsos, também podemos exibir detalhes
    setIsClicking(true);
    try {
      // AIDEV-NOTE: Passar period_id (contract.id) para exibir ordem de faturamento
      onViewDetails(contract.id);
    } finally {
      // Reset após um pequeno delay
      setTimeout(() => setIsClicking(false), 500);
    }
  }, [isClicking, onViewDetails, contract.id]);
  
  // AIDEV-NOTE: Função para lidar com mudança de seleção do checkbox
  // Agora usa contract.id (period_id) em vez de contract.contract_id
  const handleSelectionChange = useCallback((checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(contract.id, checked);
    }
  }, [onSelectionChange, contract.id]);
  
  // AIDEV-NOTE: Mapeamento de acentos de cor por coluna (detalhe sutil para identificação visual)
  // Usamos cores suaves apenas como uma pequena barra lateral no card para indicar a coluna a que pertence
  const getAccentClasses = (col?: string) => {
    switch (col) {
      case 'faturar-hoje':
        return {
          bar: 'bg-blue-400',
          badge: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'pendente':
        return {
          bar: 'bg-amber-400',
          badge: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'faturados':
        return {
          bar: 'bg-emerald-400',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'renovar':
        return {
          bar: 'bg-violet-400',
          badge: 'bg-violet-50 text-violet-700 border-violet-200'
        };
      default:
        return {
          bar: 'bg-gray-200',
          badge: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  // AIDEV-NOTE: Estilos minimalistas para o card
  const getCardStyles = () => {
    return {
      border: 'border-gray-200 hover:border-gray-300',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      badgeNeutral: 'bg-gray-100 text-gray-700 border-gray-200'
    };
  };
  
  const styles = getCardStyles();
  const accents = getAccentClasses(columnId);
  
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200 ease-out",
      "hover:shadow-sm",
      "bg-white",
      styles.border,
      isDragging && "opacity-60",
      isSelected && "ring-1 ring-primary ring-offset-1 border-primary"
    )}>
      {/* Barra sutil de acento de cor indicando a coluna (2px) */}
      <div className={cn("absolute left-0 top-0 h-full w-[2px]", accents.bar)} aria-hidden="true" />
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
                Faturar
              </label>
            </div>
          )}
          
          {/* AIDEV-NOTE: Badge para faturamentos avulsos */}
          {!contract.contract_id && (
            <div className="mb-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
                Avulso
              </Badge>
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
              <span className={cn("font-semibold text-xs", styles.textPrimary)}>
                {contract.contract_id ? `#${contract.contract_id.slice(-8)}` : contract.contract_number || 'Avulso'}
              </span>
            </div>
            {/* Badge de status — agora discreto, somente ícone com tooltip */}
            {/*
             * Função: renderização de status do card em formato compacto.
             * Objetivo: reduzir ruído visual usando apenas ícones com cores suaves.
             * Acessibilidade: tooltip com descrição do status ao passar o mouse.
             */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary"
                    className={cn(
                      "p-1.5 rounded-full border",
                      accents.badge
                    )}
                    title={contract.status}
                    aria-label={`Status: ${contract.status}`}
                  >
                    {isFaturarHoje && <Clock className="w-3 h-3" />}
                    {isPending && <AlertCircle className="w-3 h-3" />}
                    {isFaturados && <CheckCircle2 className="w-3 h-3" />}
                    {isRenovar && <RotateCcw className="w-3 h-3" />}
                    {!isFaturarHoje && !isPending && !isFaturados && !isRenovar && (
                      <Inbox className="w-3 h-3" />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {contract.status}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              <span className={cn("text-base font-semibold", styles.textPrimary)}>
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
              "hover:bg-gray-50",
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

/**
 * KanbanColumn
 * Responsável por renderizar uma coluna do Kanban.
 * Refatorado para um visual mais clean: cabeçalho branco, bordas sutis e sem gradientes.
 */
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
  
  // AIDEV-NOTE: Estilos minimalistas para cada coluna (cores neutras e consistentes)
  const getColumnStyles = () => {
    return {
      headerBg: 'bg-white',
      borderColor: 'border-gray-200',
      bgColor: 'bg-transparent',
      iconColor: 'text-gray-600',
      titleColor: 'text-gray-900',
      badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200'
    };
  };

  // AIDEV-NOTE: Mapeamento de acentos de cor por coluna para o cabeçalho
  // Aplica a mesma ideia do card: uma barra vertical sutil (2px) e tons suaves no badge
  const getAccentClasses = (col?: string) => {
    switch (col) {
      case 'faturar-hoje':
        return {
          bar: 'bg-blue-400',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          iconBg: 'bg-blue-50'
        };
      case 'pendente':
        return {
          bar: 'bg-amber-400',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          iconBg: 'bg-amber-50'
        };
      case 'faturados':
        return {
          bar: 'bg-emerald-400',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          iconBg: 'bg-emerald-50'
        };
      case 'renovar':
        return {
          bar: 'bg-violet-400',
          badge: 'bg-violet-50 text-violet-700 border-violet-200',
          iconBg: 'bg-violet-50'
        };
      default:
        return {
          bar: 'bg-gray-200',
          badge: 'bg-gray-100 text-gray-700 border-gray-200',
          iconBg: 'bg-gray-50'
        };
    }
  };
  
  const styles = getColumnStyles();
  const accents = getAccentClasses(columnId);
  
  return (
    <div className={cn(
      "flex flex-col h-full rounded-xl overflow-hidden min-h-[500px]",
      "border transition-all duration-200",
      "hover:shadow-sm",
      styles.borderColor,
      styles.bgColor,
      isOver && "ring-1 ring-blue-600/20 bg-blue-50/30"
    )}>
      {/* Header clean com acento sutil de cor por coluna */}
      <div className={cn("relative overflow-hidden", styles.headerBg)}>
        {/* Barra sutil de acento de cor indicando a coluna (2px) */}
        <div className={cn("absolute left-0 top-0 h-full w-[2px]", accents.bar)} aria-hidden="true" />
        <div className="relative flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-md", accents.iconBg, styles.iconColor)}>
              {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
            </div>
            <div>
              <h3 className={cn("font-semibold text-sm tracking-tight", styles.titleColor)}>
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {contracts.length} {contracts.length === 1 ? 'contrato' : 'contratos'}
              </p>
            </div>
          </div>
          <Badge 
            className={cn(
              "font-medium text-xs px-2 py-0.5 rounded-full",
              "border",
              accents.badge
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
          "flex-1 p-3 space-y-3 overflow-y-auto",
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

/**
 * AIDEV-NOTE: FaturamentoKanban
 * Página principal do Kanban de Faturamento. Nesta revisão removemos o título
 * "Kanban de Faturamento" do topo e integramos o botão "Selecionar para Faturar"
 * diretamente no componente de filtros (KanbanFilters), resultando em um header
 * mais clean e compacto.
 */
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
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null); // AIDEV-NOTE: ID do período (ordem de faturamento)
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [isBilling, setIsBilling] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [contractMode, setContractMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isStandaloneBillingOpen, setIsStandaloneBillingOpen] = useState(false);

  // AIDEV-NOTE: Abrir modal com segurança multi-tenant para exibir ordem de faturamento
  // Agora recebe period_id diretamente do card
  // AIDEV-NOTE: Seguindo guia de segurança - não faz consultas diretas, apenas valida e abre modal
  // O BillingOrderDetails usa useBillingOrder que já é seguro (useSecureTenantQuery)
  const handleViewDetails = useCallback((periodId: string) => {
    // Previne múltiplos cliques rápidos
    if (isContractModalOpen) return;
    
    // AIDEV-NOTE: CAMADA 1 e 2 - Validação de acesso e tenant (conforme guia)
    if (!hasAccess || !currentTenant?.id) {
      console.warn('🚫 [SECURITY] Acesso negado ou tenant inválido ao abrir detalhes');
      toast({
        title: "Erro de acesso",
        description: "Não foi possível abrir os detalhes. Verifique suas permissões.",
        variant: "destructive",
      });
      return;
    }

    // AIDEV-NOTE: CAMADA 5 - Validação crítica antes da operação (conforme guia)
    if (!periodId || periodId.trim() === '') {
      console.error('❌ [SECURITY] periodId está vazio ou inválido:', periodId);
      toast({
        title: "Erro de validação",
        description: "ID do período inválido.",
        variant: "destructive",
      });
      return;
    }

    // AIDEV-NOTE: Validação adicional - garantir que tenant_id não está vazio
    if (!currentTenant.id || currentTenant.id.trim() === '') {
      console.error('❌ [SECURITY] Tenant ID está vazio ou inválido');
      toast({
        title: "Erro de segurança",
        description: "Tenant inválido. Tente fazer login novamente.",
        variant: "destructive",
      });
      return;
    }

    // AIDEV-NOTE: Log de auditoria (conforme guia)
    console.log(`🔍 [AUDIT] Abrindo detalhes da ordem - Tenant: ${currentTenant.name}, PeriodId: ${periodId}`);

    // AIDEV-NOTE: Apenas armazenar period_id e abrir modal
    // O BillingOrderDetails fará a busca segura via useBillingOrder (useSecureTenantQuery)
    setSelectedPeriodId(periodId);
    setIsContractModalOpen(true);
    
    console.log('✅ [MODAL DEBUG] Modal aberto para período:', periodId);
  }, [isContractModalOpen, hasAccess, currentTenant, toast]);

  // AIDEV-NOTE: Função para fechar modal de detalhes da ordem de faturamento
  const handleCloseModal = useCallback(() => {
    console.log('Fechando modal de ordem de faturamento');
    setIsContractModalOpen(false);
    setSelectedPeriodId(null);
  }, []);

  // AIDEV-NOTE: Handler para quando o formulário de contrato é salvo com sucesso
  const handleContractFormSuccess = useCallback((contractId: string) => {
    console.log('✅ [CONTRACT] Contrato salvo/atualizado:', contractId);
    refreshData();
    handleCloseModal();
  }, [refreshData, handleCloseModal]);

  // AIDEV-NOTE: Handler para solicitar edição do contrato
  const handleEditContract = useCallback((contractId: string) => {
    setContractMode('edit');
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

      // AIDEV-NOTE: Processar cada período de faturamento
      // AIDEV-NOTE: Detectar se é período de contrato ou faturamento avulso
      for (const periodId of periodIds) {
        try {
          // AIDEV-NOTE: CAMADA 5 - Validação crítica antes da operação
          if (!tenantId || !periodId) {
            console.error('❌ [SECURITY] Parâmetros inválidos:', { tenantId, periodId });
            errorCount++;
            continue;
          }

          console.log(`📋 [BILLING] Processando período de faturamento: ${periodId}`);

          // AIDEV-NOTE: Verificar se é período avulso ou de contrato
          // Buscar período para determinar o tipo
          const { data: standalonePeriod } = await supabase
            .from('standalone_billing_periods')
            .select('id')
            .eq('id', periodId)
            .eq('tenant_id', tenantId)
            .single();

          let result: any;
          let billingError: any;

          if (standalonePeriod) {
            // AIDEV-NOTE: É um faturamento avulso - usar serviço completo
            console.log(`📋 [BILLING] Processando faturamento avulso: ${periodId}`);
            try {
              // AIDEV-NOTE: CORREÇÃO - Importação dinâmica mantida para code splitting
              // O aviso do Vite é esperado quando há importação estática em outro arquivo
              // Isso não afeta a funcionalidade, apenas a otimização de chunks
              const standaloneBillingServiceModule = await import('@/services/standaloneBillingService');
              const { standaloneBillingService } = standaloneBillingServiceModule;
              const processResult = await standaloneBillingService.processStandaloneBilling(
                supabase,
                tenantId,
                periodId
              );

              if (processResult.success) {
                result = {
                  success: true,
                  charge_id: processResult.charge_id
                };
                billingError = null;
              } else {
                result = { success: false, error: processResult.error };
                billingError = new Error(processResult.error || 'Erro ao processar faturamento avulso');
              }
            } catch (serviceError: any) {
              console.error('❌ [BILLING] Erro ao processar faturamento avulso via serviço:', serviceError);
              result = { success: false, error: serviceError?.message || 'Erro desconhecido' };
              billingError = serviceError;
            }
          } else {
            // AIDEV-NOTE: É um período de contrato - usar função original
            console.log(`📋 [BILLING] Processando período de contrato: ${periodId}`);
            const { data: contractResult, error: contractError } = await supabase.rpc('attempt_billing_period_charge', {
              p_period_id: periodId,
              p_tenant_id: tenantId
            });

            result = contractResult;
            billingError = contractError;
          }

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
      icon: <CalendarDays className="h-4 w-4" />,
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

  // Mostrar loading (sem título de página para manter layout clean)
  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
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

  // Mostrar erro (sem título de página)
  if (error) {
    return (
      <Layout>
        <div className="p-6">
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
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="p-6">
          <div className="mb-6">
            {/* Filtros com botão integrado */}
            <KanbanFilters
              filters={filters}
              onFilterChange={updateFilter}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              onToggleSelectionMode={toggleSelectionMode}
              isSelectionMode={showCheckboxes}
              isLoading={isLoading}
              onOpenStandaloneBilling={() => {
                console.log('🔵 [STANDALONE] Botão clicado, abrindo dialog');
                setIsStandaloneBillingOpen(true);
              }}
            />
          
            {/* Botão de faturamento - aparece quando há contratos selecionados */}
            {selectedContracts.size > 0 && (
              <div className="flex items-center justify-center mt-4">
                <Button 
                  onClick={handleBilling}
                  disabled={isBilling}
                  size="lg"
                  className="flex items-center space-x-2"
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

        {/* AIDEV-NOTE: Modal de detalhes do contrato - mesmo design do dialog de criação */}
        <Dialog open={isContractModalOpen} onOpenChange={(open) => {
          if (!open) handleCloseModal();
          else setIsContractModalOpen(true);
        }} modal>
          <CustomDialogContent className="p-0 m-0 border-0">
          <DialogPrimitive.Title className="sr-only">
            Detalhes da Ordem de Faturamento
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Visualização dos detalhes da ordem de faturamento. Ordens faturadas estão congeladas e não refletem alterações no contrato.
          </DialogPrimitive.Description>
            {/* AIDEV-NOTE: Container otimizado para scroll com altura controlada */}
             <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
               {!selectedPeriodId ? (
                 <div className="flex-1 overflow-y-auto p-6">
                   <ContractFormSkeleton />
                 </div>
               ) : (
                 <BillingOrderDetails 
                   periodId={selectedPeriodId}
                   onClose={handleCloseModal}
                 />
               )}
             </div>
          </CustomDialogContent>
        </Dialog>

        {/* AIDEV-NOTE: Modal de faturamento avulso */}
        {isStandaloneBillingOpen && (
          <CreateStandaloneBillingDialog
            isOpen={isStandaloneBillingOpen}
            onClose={() => {
              console.log('🔴 [STANDALONE] Fechando dialog');
              setIsStandaloneBillingOpen(false);
            }}
            onSuccess={() => {
              console.log('✅ [STANDALONE] Faturamento criado com sucesso');
              refreshData();
              setIsStandaloneBillingOpen(false);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
