// =====================================================
// RECONCILIATION ACTION MODAL
// Descrição: Modal para executar ações específicas de conciliação
// Tecnologias: Shadcn/UI + Tailwind + Motion + React Hook Form + Zod
// =====================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';

// Hooks
import { useContracts } from '@/hooks/useContracts';
import { supabase } from '@/lib/supabase';

// Icons
import {
  Link,
  Plus,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Calendar,
  User,
  ArrowRight,
  Loader2,
  ChevronDown
} from 'lucide-react';

// Types
import { 
  ReconciliationAction, 
  ImportedMovement, 
  LinkToContractData, 
  CreateStandaloneChargeData,
  ComplementExistingChargeData,
  RegisterCustomerData
} from '@/types/reconciliation';

// Hooks
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { useAuditLogger } from '@/hooks/useAuditLogger';

// =====================================================
// UTILITÁRIOS DE NORMALIZAÇÃO/FORMATAÇÃO
// =====================================================

// Converte valores em BRL aceitando number e string com vírgula decimal e pontos de milhar
const normalizeBRLValue = (val: any): number => {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const s = val.trim();
    const normalized = parseFloat(s.replace(/\./g, '').replace(/,/g, '.'));
    return isNaN(normalized) ? 0 : normalized;
  }
  return 0;
};

// Formata em moeda BRL após normalização
const formatBRL = (val: any): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalizeBRLValue(val));
};

// Normaliza datas aceitando strings; retorna null se inválida
const normalizeDate = (val: any): Date | null => {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

// =====================================================
// ZOD SCHEMAS PARA VALIDAÇÃO
// =====================================================

// AIDEV-NOTE: Schema para vincular a contrato existente
const linkToContractSchema = z.object({
  contractId: z.string().min(1, 'Selecione um contrato'),
  observacao: z.string().optional(),
  adjustValue: z.boolean().default(false),
  newValue: z.number().optional()
});

// AIDEV-NOTE: Schema para criar cobrança avulsa
const createStandaloneSchema = z.object({
  customerId: z.string().min(1, 'Selecione um cliente'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  value: z.number().min(0.01, 'Valor deve ser maior que zero'),
  observacao: z.string().optional()
});

// AIDEV-NOTE: Schema para cadastrar novo cliente
const registerCustomerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  document: z.string().min(11, 'Documento inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  observacao: z.string().optional()
});

// AIDEV-NOTE: Schema para marcar como divergente
const markDivergentSchema = z.object({
  reason: z.string().min(1, 'Motivo da divergência é obrigatório'),
  observacao: z.string().optional()
});

// AIDEV-NOTE: Schema para importação de cobranças
// AIDEV-NOTE: importToChargeSchema removido - não é mais necessário
const importToChargeSchemaRemoved = z.object({
  due_date: z.date(),
  description: z.string().min(1, 'Descrição é obrigatória')
});

// =====================================================
// TYPES PARA OS FORMULÁRIOS
// =====================================================

type LinkToContractForm = z.infer<typeof linkToContractSchema>;
type CreateStandaloneForm = z.infer<typeof createStandaloneSchema>;
type RegisterCustomerForm = z.infer<typeof registerCustomerSchema>;
type MarkDivergentForm = z.infer<typeof markDivergentSchema>;
// AIDEV-NOTE: ImportToChargeFormData removido - não é mais necessário

// =====================================================
// INTERFACE DO COMPONENTE
// =====================================================

interface ReconciliationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: ImportedMovement | null;
  movements?: ImportedMovement[]; // Array de movimentações para ações em lote
  action: ReconciliationAction | null;
  onActionComplete: (movement: ImportedMovement, action: ReconciliationAction, data: any) => Promise<void>;
  // AIDEV-NOTE: Adicionando função para importação em lote de cobranças
  // AIDEV-NOTE: onBulkImportToCharges removido - charges já são criadas diretamente
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const ReconciliationActionModal: React.FC<ReconciliationActionModalProps> = ({
  isOpen,
  onClose,
  movement,
  movements = [],
  action,
  onActionComplete,
  // AIDEV-NOTE: onBulkImportToCharges removido
}) => {
  // Determinar se estamos em modo de processamento em lote
  // AIDEV-NOTE: Corrigido para considerar qualquer array com pelo menos um item como processamento em lote
  const isBatchProcessing = movements && movements.length >= 1;
  // =====================================================
  // HOOKS & STATE
  // =====================================================
  const { toast } = useToast();
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const { logAction } = useAuditLogger();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const [isResolvingCustomer, setIsResolvingCustomer] = useState(false);

  // AIDEV-NOTE: Resolver customer_id da movimentação para filtrar contratos
  useEffect(() => {
    const resolveCustomer = async () => {
      if (!currentTenant?.id) return;
      
      // AIDEV-NOTE: Para ações em lote, usar dados do primeiro movimento
      const targetMovement = isBatchProcessing && movements.length > 0 
        ? movements[0] 
        : movement;
      
      if (!targetMovement) {
        setMatchedCustomerId(null);
        return;
      }

      setIsResolvingCustomer(true);
      
      try {
        // AIDEV-NOTE: 1. Tentar buscar por documento (CPF/CNPJ) - maior prioridade
        if (targetMovement.customer_document) {
          const cleanDocument = targetMovement.customer_document.replace(/\D/g, '');
          
          const { data: customerByDoc, error: docError } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', currentTenant.id)
            .eq('cpf_cnpj', cleanDocument)
            .limit(1)
            .maybeSingle();
          
          if (!docError && customerByDoc) {
            console.log('✅ [LINK_CONTRACT] Cliente encontrado por documento:', customerByDoc.id);
            setMatchedCustomerId(customerByDoc.id);
            setIsResolvingCustomer(false);
            return;
          }
        }

        // AIDEV-NOTE: 2. Tentar buscar por nome (busca aproximada)
        if (targetMovement.customer_name) {
          const { data: customerByName, error: nameError } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', currentTenant.id)
            .ilike('name', `%${targetMovement.customer_name.trim()}%`)
            .limit(1)
            .maybeSingle();
          
          if (!nameError && customerByName) {
            console.log('✅ [LINK_CONTRACT] Cliente encontrado por nome:', customerByName.id);
            setMatchedCustomerId(customerByName.id);
            setIsResolvingCustomer(false);
            return;
          }
        }

        // AIDEV-NOTE: 3. Tentar buscar por email
        if (targetMovement.customer_email) {
          const { data: customerByEmail, error: emailError } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', currentTenant.id)
            .ilike('email', targetMovement.customer_email.trim())
            .limit(1)
            .maybeSingle();
          
          if (!emailError && customerByEmail) {
            console.log('✅ [LINK_CONTRACT] Cliente encontrado por email:', customerByEmail.id);
            setMatchedCustomerId(customerByEmail.id);
            setIsResolvingCustomer(false);
            return;
          }
        }

        // AIDEV-NOTE: Nenhum cliente encontrado
        console.log('⚠️ [LINK_CONTRACT] Nenhum cliente encontrado para a movimentação');
        setMatchedCustomerId(null);
      } catch (error) {
        console.error('❌ [LINK_CONTRACT] Erro ao resolver cliente:', error);
        setMatchedCustomerId(null);
      } finally {
        setIsResolvingCustomer(false);
      }
    };

    resolveCustomer();
  }, [currentTenant?.id, movement, movements, isBatchProcessing]);

  // AIDEV-NOTE: Buscar contratos filtrados por customer_id se encontrado
  // Se não encontrar cliente, buscar todos os contratos ativos
  const { contracts: allContracts, isLoading: contractsLoading } = useContracts({
    customer_id: matchedCustomerId || undefined,
    status: matchedCustomerId ? undefined : 'active', // Se não tem cliente, mostrar apenas ativos
    limit: 100 // AIDEV-NOTE: Limite maior para dropdown
  });

  // AIDEV-NOTE: Filtrar contratos relevantes baseado na movimentação
  const relevantContracts = useMemo(() => {
    if (!allContracts || allContracts.length === 0) return [];
    
    // Se encontrou cliente, já está filtrado por customer_id
    if (matchedCustomerId) {
      return allContracts;
    }
    
    // Se não encontrou cliente, mostrar apenas contratos ativos
    return allContracts.filter(contract => 
      contract.status === 'active' || contract.status === 'ACTIVE'
    );
  }, [allContracts, matchedCustomerId]);

  // =====================================================
  // FORM CONFIGURATIONS
  // =====================================================

  const linkForm = useForm<LinkToContractForm>({
    resolver: zodResolver(linkToContractSchema),
    defaultValues: {
      contractId: '',
      observacao: '',
      adjustValue: false,
      // AIDEV-NOTE: Para ações em lote, usar o valor total agregado
      newValue: isBatchProcessing 
        ? movements.reduce((acc, mov) => acc + (mov.valor_pago || 0), 0)
        : (movement?.valor_pago || 0)
    }
  });

  const standaloneForm = useForm<CreateStandaloneForm>({
    resolver: zodResolver(createStandaloneSchema),
    defaultValues: {
      customerId: '',
      description: isBatchProcessing 
        ? `Cobrança em lote - ${movements.length} itens`
        : `Cobrança importada - ${movement?.origem || ''}`,
      dueDate: movement?.data_vencimento || new Date().toISOString().split('T')[0],
      // AIDEV-NOTE: Para ações em lote, usar o valor total agregado
      value: isBatchProcessing 
        ? movements.reduce((acc, mov) => acc + (mov.valor_pago || 0), 0)
        : (movement?.valor_pago || 0),
      observacao: ''
    }
  });

  const customerForm = useForm<RegisterCustomerForm>({
    resolver: zodResolver(registerCustomerSchema),
    defaultValues: {
      // AIDEV-NOTE: Para ações em lote, usar dados do primeiro cliente ou deixar vazio se houver múltiplos clientes diferentes
      name: isBatchProcessing 
        ? (movements.length > 0 ? movements[0]?.customerName || '' : '')
        : (movement?.customerName || ''),
      document: isBatchProcessing 
        ? (movements.length > 0 ? movements[0]?.customerDocument || '' : '')
        : (movement?.customerDocument || ''),
      email: isBatchProcessing 
        ? (movements.length > 0 ? movements[0]?.customerEmail || '' : '')
        : (movement?.customerEmail || ''),
      phone: isBatchProcessing 
        ? (movements.length > 0 ? movements[0]?.customerPhone || '' : '')
        : (movement?.customerPhone || ''),
      address: '',
      observacao: isBatchProcessing 
        ? `Cliente para lote de ${movements.length} movimentações`
        : ''
    }
  });

  const divergentForm = useForm<MarkDivergentForm>({
    resolver: zodResolver(markDivergentSchema),
    defaultValues: {
      reason: '',
      observacao: ''
    }
  });

  // =====================================================
  // HANDLERS
  // =====================================================

  // AIDEV-NOTE: Handler genérico para submissão de formulários
  const handleSubmit = useCallback(async (formData: any) => {
    if (!action || !hasAccess) return;
    
    // Verificar se estamos processando uma ou múltiplas movimentações
    const movsToProcess = isBatchProcessing ? movements : (movement ? [movement] : []);
    if (movsToProcess.length === 0) return;

    setIsSubmitting(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Processar cada movimentação
      for (const mov of movsToProcess) {
        try {
          await onActionComplete(mov, action, formData);
          
          // Log da ação
          await logAction('USER_ACTION', {
            action: `reconciliation_${action.toLowerCase()}`,
            resource: 'charges', // AIDEV-NOTE: Atualizado - agora trabalhamos com charges diretamente
            resourceId: mov.id,
            details: {
              movementId: mov.id,
              action,
              formData,
              tenantId: currentTenant?.id,
              batchProcessing: isBatchProcessing
            }
          });
          
          successCount++;
        } catch (error) {
          console.error(`Erro ao processar movimentação ${mov.id}:`, error);
          errorCount++;
        }
      }
      
      // Feedback baseado no resultado do processamento em lote
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: isBatchProcessing ? 'Processamento em lote concluído' : 'Ação executada com sucesso',
          description: isBatchProcessing 
            ? `${successCount} movimentações processadas com sucesso` 
            : getActionSuccessMessage(action),
          variant: 'default'
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: 'Processamento parcialmente concluído',
          description: `${successCount} movimentações processadas com sucesso, ${errorCount} com erro`,
          variant: 'warning'
        });
      } else {
        throw new Error('Nenhuma movimentação foi processada com sucesso');
      }

      onClose();
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      toast({
        title: 'Erro ao executar ação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [movement, movements, isBatchProcessing, action, hasAccess, onActionComplete, logAction, currentTenant, toast, onClose]);

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  const getActionTitle = (action: ReconciliationAction): string => {
    switch (action) {
      case ReconciliationAction.LINK_TO_CONTRACT:
        return 'Vincular a Contrato';
      case ReconciliationAction.CREATE_STANDALONE:
        return 'Criar Cobrança Avulsa';
      case ReconciliationAction.COMPLEMENT_EXISTING:
        return 'Complementar Cobrança';
      case ReconciliationAction.REGISTER_CUSTOMER:
        return 'Cadastrar Cliente';
      case ReconciliationAction.DELETE_IMPORTED:
        return 'Excluir Importação';
      default:
        return 'Ação de Conciliação';
    }
  };

  const getActionIcon = (action: ReconciliationAction) => {
    switch (action) {
      case ReconciliationAction.LINK_TO_CONTRACT:
        return <Link className="h-5 w-5" />;
      case ReconciliationAction.CREATE_STANDALONE:
        return <Plus className="h-5 w-5" />;
      case ReconciliationAction.COMPLEMENT_EXISTING:
        return <FileText className="h-5 w-5" />;
      case ReconciliationAction.REGISTER_CUSTOMER:
        return <UserPlus className="h-5 w-5" />;
      case ReconciliationAction.DELETE_IMPORTED:
        return <X className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getActionSuccessMessage = (action: ReconciliationAction): string => {
    switch (action) {
      case ReconciliationAction.LINK_TO_CONTRACT:
        return 'Movimentação vinculada ao contrato com sucesso';
      case ReconciliationAction.CREATE_STANDALONE:
        return 'Cobrança avulsa criada com sucesso';
      case ReconciliationAction.COMPLEMENT_EXISTING:
        return 'Cobrança complementada com sucesso';
      case ReconciliationAction.REGISTER_CUSTOMER:
        return 'Cliente cadastrado com sucesso';
      case ReconciliationAction.DELETE_IMPORTED:
        return 'Importação excluída com sucesso';
      default:
        return 'Ação executada com sucesso';
    }
  };

  // =====================================================
  // FORM RENDERERS
  // =====================================================

  // AIDEV-NOTE: Configurações de animação para feedback visual premium
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
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
  
  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    }
  };

  const renderImportToChargeForm = () => (
    <motion.div 
      className="space-y-6"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div 
        className="p-6 bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-100 rounded-xl"
        variants={itemVariants}
      >
        <div className="flex items-start gap-4">
          <CheckCircle2 className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
          <div className="space-y-2 flex-grow">
            <h4 className="font-medium text-blue-900 text-lg">
              Confirmar Importação para Cobranças
            </h4>
            <p className="text-sm text-blue-700">
              {isBatchProcessing 
                ? `${movements.length} movimentações serão importadas diretamente para a tabela de cobranças. Novas cobranças serão criadas com base nos dados das movimentações.`
                : "Esta movimentação será importada diretamente para a tabela de cobranças. Uma nova cobrança será criada com base nos dados da movimentação."
              }
            </p>
          </div>
        </div>
      </motion.div>
  
      {/* AIDEV-NOTE: Melhorando a renderização dos detalhes da movimentação individual */}
      {!isBatchProcessing && movement && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 p-4 bg-muted/30 rounded-lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-3 bg-background rounded-md">
            <DollarSign className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(movement?.valor_cobranca || movement?.valor_pago || 0)}
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-background rounded-md">
            <User className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cliente</p>
              <p className="text-base">
                {movement?.customer_name || 'Cliente não identificado'}
                {movement?.customer_document && (
                  <Badge variant="outline" className="ml-2 font-normal">
                    {movement.customer_document}
                  </Badge>
                )}
              </p>
            </div>
          </div>
      
          <div className="flex items-start space-x-3 p-3 bg-background rounded-md">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data</p>
              <p className="text-base">
                {(() => {
                  // AIDEV-NOTE: Tentar múltiplos campos de data e usar normalizeDate para validação
                  const dateValue = normalizeDate(
                    movement?.data_pagamento || 
                    movement?.data_vencimento || 
                    movement?.payment_date ||
                    movement?.dueDate
                  );
                  return dateValue 
                    ? new Intl.DateTimeFormat('pt-BR').format(dateValue)
                    : 'Data não disponível';
                })()}
              </p>
            </div>
          </div>
      
          <div className="flex items-start space-x-3 p-3 bg-background rounded-md">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID Externo</p>
              <p className="text-base font-mono">{movement?.id_externo || 'N/A'}</p>
            </div>
          </div>
        </div>
      </motion.div>
      )}
  
      {isBatchProcessing && (
        <motion.div 
          className="space-y-4"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-sm text-muted-foreground">
              Itens selecionados para importação
            </h5>
            <Badge variant="secondary">
              {movements.length} {movements.length === 1 ? 'item' : 'itens'}
            </Badge>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {movements.map((mov, index) => (
              <motion.div 
                key={mov.id}
                variants={itemVariants}
                className="p-4 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatBRL(mov.valor_cobranca ?? mov.valor_pago ?? mov.valor)}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          const d = normalizeDate(mov.data_pagamento ?? mov.data_vencimento ?? mov.payment_date);
                          return d ? new Intl.DateTimeFormat('pt-BR').format(d) : 'Data não disponível';
                        })()}
                      </span>
                    </div>
                    <div className="text-sm">
                      {mov.customer_name || mov.customerName || mov.cliente_nome || 'Cliente não identificado'}
                      {mov.customer_document && (
                        <Badge variant="outline" className="ml-2 text-xs">{mov.customer_document}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {mov.origem}
                      </Badge>
                      <span>{mov.id_externo}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
  
      <motion.div 
        className="flex justify-end gap-3 pt-4"
        variants={itemVariants}
      >
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          type="submit"
          disabled={isSubmitting}
          onClick={() => handleSubmit({})}
          className="relative"
        >
          <motion.span
            className="flex items-center gap-2"
            initial={false}
            animate={{ opacity: isSubmitting ? 0 : 1 }}
          >
            <span>
              {isBatchProcessing 
                ? `Confirmar Importação (${movements.length})`
                : "Confirmar Importação"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </motion.span>
          
          {isSubmitting && (
            <motion.span
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.span>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );

  const renderLinkToContractForm = () => (
    <Form {...linkForm}>
      <form onSubmit={linkForm.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={linkForm.control}
          name="contractId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contrato</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contrato" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* AIDEV-NOTE: Busca real de contratos do tenant filtrados por cliente da movimentação */}
                  {isResolvingCustomer || contractsLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Carregando contratos...
                    </div>
                  ) : relevantContracts.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {matchedCustomerId 
                        ? 'Nenhum contrato encontrado para este cliente' 
                        : 'Nenhum contrato ativo encontrado'}
                    </div>
                  ) : (
                    <>
                      {matchedCustomerId && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                          Contratos do cliente da movimentação
                        </div>
                      )}
                      {!matchedCustomerId && (
                        <div className="px-2 py-1.5 text-xs text-amber-600 border-b bg-amber-50">
                          ⚠️ Cliente não identificado - mostrando todos os contratos ativos
                        </div>
                      )}
                      {relevantContracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.contract_number} - {contract.customers?.name || 'Cliente não informado'}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={linkForm.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre a vinculação..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Vinculando...' : 'Vincular'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const renderCreateStandaloneForm = () => (
    <Form {...standaloneForm}>
      <form onSubmit={standaloneForm.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={standaloneForm.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* AIDEV-NOTE: Aqui será implementada a busca de clientes */}
                  <SelectItem value="customer1">Cliente A - 123.456.789-00</SelectItem>
                  <SelectItem value="customer2">Cliente B - 987.654.321-00</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={standaloneForm.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Descrição da cobrança" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={standaloneForm.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={standaloneForm.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={standaloneForm.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre a cobrança..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Criando...' : 'Criar Cobrança'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const renderRegisterCustomerForm = () => (
    <Form {...customerForm}>
      <form onSubmit={customerForm.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={customerForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input placeholder="Nome do cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={customerForm.control}
            name="document"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF/CNPJ</FormLabel>
                <FormControl>
                  <Input placeholder="000.000.000-00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={customerForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={customerForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="(11) 99999-9999" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={customerForm.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input placeholder="Endereço completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={customerForm.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações sobre o cliente..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Cliente'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const renderMarkDivergentForm = () => (
    <Form {...divergentForm}>
      <form onSubmit={divergentForm.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={divergentForm.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo da Divergência</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="valor_diferente">Valor diferente do esperado</SelectItem>
                  <SelectItem value="cliente_nao_encontrado">Cliente não encontrado</SelectItem>
                  <SelectItem value="data_incorreta">Data de pagamento incorreta</SelectItem>
                  <SelectItem value="duplicacao">Possível duplicação</SelectItem>
                  <SelectItem value="outros">Outros motivos</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={divergentForm.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação Detalhada</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva detalhadamente a divergência encontrada..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Forneça o máximo de detalhes possível para facilitar a resolução posterior.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? 'Marcando...' : 'Marcar como Divergente'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================

  if (!hasAccess) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={modalVariants}
      >
        <DialogContent className="sm:max-w-[600px] p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {getActionIcon(action)}
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {getActionTitle(action)}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Executar ação para {isBatchProcessing ? `${movements.length} movimentações selecionadas` : 'a movimentação selecionada'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Separator />
          
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {/* AIDEV-NOTE: IMPORT_TO_CHARGE removido - charges já são criadas diretamente */}
            {action === ReconciliationAction.LINK_TO_CONTRACT && renderLinkToContractForm()}
            {action === ReconciliationAction.CREATE_STANDALONE && renderCreateStandaloneForm()}
            {action === ReconciliationAction.REGISTER_CUSTOMER && renderRegisterCustomerForm()}
            {action === ReconciliationAction.DELETE_IMPORTED && renderDeleteImportedForm()}
          </div>
        </DialogContent>
      </motion.div>
    </Dialog>
  );
};

export default ReconciliationActionModal;

// AIDEV-NOTE: Configurações de animação do modal
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

// AIDEV-NOTE: Componente para exibir itens selecionados em lote
const BatchItemsPreview: React.FC<{ movements: Movement[] }> = ({ movements }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Itens selecionados:
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          {isExpanded ? 'Mostrar menos' : 'Mostrar mais'}
          <ChevronDown
            className={cn(
              "ml-1 h-4 w-4 transition-transform",
              isExpanded && "transform rotate-180"
            )}
          />
        </Button>
      </div>
      
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2"
          >
            {movements.map((mov, index) => (
              <motion.div
                key={mov.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 text-sm bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    R$ {mov.valor_pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-muted-foreground">
                    {mov.data_pagamento ? new Date(mov.data_pagamento).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {mov.origem}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-2 bg-muted/30 rounded-lg"
          >
            <div className="flex items-center justify-between text-sm">
              <span>
                Total: <span className="font-medium">{movements.length} itens</span>
              </span>
              <span className="text-muted-foreground">
                Valor total: R$ {movements.reduce((acc, mov) => acc + (mov.valor_pago || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// AIDEV-NOTE: renderImportToChargeForm removido - charges já são criadas diretamente