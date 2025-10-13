// =====================================================
// RECONCILIATION ACTION MODAL
// Descrição: Modal para executar ações específicas de conciliação
// Tecnologias: Shadcn/UI + Tailwind + Motion + React Hook Form + Zod
// =====================================================

import React, { useState, useCallback } from 'react';
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
  User
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

// =====================================================
// TYPES PARA OS FORMULÁRIOS
// =====================================================

type LinkToContractForm = z.infer<typeof linkToContractSchema>;
type CreateStandaloneForm = z.infer<typeof createStandaloneSchema>;
type RegisterCustomerForm = z.infer<typeof registerCustomerSchema>;
type MarkDivergentForm = z.infer<typeof markDivergentSchema>;

// =====================================================
// INTERFACE DO COMPONENTE
// =====================================================

interface ReconciliationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: ImportedMovement | null;
  action: ReconciliationAction | null;
  onActionComplete: (movement: ImportedMovement, action: ReconciliationAction, data: any) => Promise<void>;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const ReconciliationActionModal: React.FC<ReconciliationActionModalProps> = ({
  isOpen,
  onClose,
  movement,
  action,
  onActionComplete
}) => {
  // =====================================================
  // HOOKS & STATE
  // =====================================================
  const { toast } = useToast();
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const { logAction } = useAuditLogger();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AIDEV-NOTE: Hook para buscar contratos reais do tenant
  const { contracts, isLoading: contractsLoading } = useContracts();

  // =====================================================
  // FORM CONFIGURATIONS
  // =====================================================

  const linkForm = useForm<LinkToContractForm>({
    resolver: zodResolver(linkToContractSchema),
    defaultValues: {
      contractId: '',
      observacao: '',
      adjustValue: false,
      newValue: movement?.valor_pago || 0
    }
  });

  const standaloneForm = useForm<CreateStandaloneForm>({
    resolver: zodResolver(createStandaloneSchema),
    defaultValues: {
      customerId: '',
      description: `Cobrança importada - ${movement?.origem || ''}`,
      dueDate: movement?.data_vencimento || new Date().toISOString().split('T')[0],
      value: movement?.valor_pago || 0,
      observacao: ''
    }
  });

  const customerForm = useForm<RegisterCustomerForm>({
    resolver: zodResolver(registerCustomerSchema),
    defaultValues: {
      name: movement?.customerName || '',
      document: movement?.customerDocument || '',
      email: movement?.customerEmail || '',
      phone: movement?.customerPhone || '',
      address: '',
      observacao: ''
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
    if (!movement || !action || !hasAccess) return;

    setIsSubmitting(true);
    try {
      await onActionComplete(movement, action, formData);
      
      // Log da ação
      await logAction('USER_ACTION', {
        action: `reconciliation_${action.toLowerCase()}`,
        resource: 'conciliation_staging',
        resourceId: movement.id,
        details: {
          movementId: movement.id,
          action,
          formData,
          tenantId: currentTenant?.id
        }
      });

      toast({
        title: 'Ação executada com sucesso',
        description: getActionSuccessMessage(action),
        variant: 'default'
      });

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
  }, [movement, action, hasAccess, onActionComplete, logAction, currentTenant, toast, onClose]);

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

  const renderImportToChargeForm = () => (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-medium text-blue-900">
              Confirmar Importação para Cobranças
            </h4>
            <p className="text-sm text-blue-700">
              Esta movimentação será importada diretamente para a tabela de cobranças. 
              Uma nova cobrança será criada com base nos dados da movimentação.
            </p>
          </div>
        </div>
      </div>

      {/* AIDEV-NOTE: Resumo da operação */}
      <div className="space-y-3">
        <h5 className="font-medium text-sm">Dados que serão importados:</h5>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground">Valor:</span>
            <div className="font-medium">
              R$ {movement?.valor_pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Data de Pagamento:</span>
            <div className="font-medium">
              {movement?.data_pagamento ? new Date(movement.data_pagamento).toLocaleDateString('pt-BR') : 'N/A'}
            </div>
          </div>
          {movement?.customerName && (
            <div className="space-y-1 col-span-2">
              <span className="text-muted-foreground">Cliente:</span>
              <div className="font-medium">{movement.customerName}</div>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-muted-foreground">Origem:</span>
            <div className="font-medium">{movement?.origem}</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">ID Externo:</span>
            <div className="font-medium">{movement?.id_externo}</div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={() => handleSubmit({})}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Importando...' : 'Confirmar Importação'}
        </Button>
      </DialogFooter>
    </div>
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
                  {/* AIDEV-NOTE: Busca real de contratos do tenant */}
                  {contractsLoading ? (
                    <SelectItem value="" disabled>Carregando contratos...</SelectItem>
                  ) : contracts.length === 0 ? (
                    <SelectItem value="" disabled>Nenhum contrato encontrado</SelectItem>
                  ) : (
                    contracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.contract_number} - {contract.customers?.name || 'Cliente não informado'}
                      </SelectItem>
                    ))
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {action && (
            <motion.div
              key={action}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {getActionIcon(action)}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      {getActionTitle(action)}
                    </DialogTitle>
                    <DialogDescription>
                      Executar ação para a movimentação selecionada
                    </DialogDescription>
                  </div>
                </div>

                {/* AIDEV-NOTE: Informações da movimentação */}
                {movement && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Movimentação:</span>
                      <Badge variant="outline">{movement.origem}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="ml-2 font-medium">
                          R$ {movement.valor_pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data:</span>
                        <span className="ml-2">
                          {movement.data_pagamento ? new Date(movement.data_pagamento).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      {movement.customerName && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Cliente:</span>
                          <span className="ml-2">{movement.customerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </DialogHeader>

              <Separator className="my-4" />

              {/* AIDEV-NOTE: Renderização condicional dos formulários */}
              <div className="space-y-4">
                {action === ReconciliationAction.IMPORT_TO_CHARGE && renderImportToChargeForm()}
                {action === ReconciliationAction.LINK_TO_CONTRACT && renderLinkToContractForm()}
                {action === ReconciliationAction.CREATE_STANDALONE && renderCreateStandaloneForm()}
                {action === ReconciliationAction.REGISTER_CUSTOMER && renderRegisterCustomerForm()}
                {action === 'MARK_DIVERGENT' && renderMarkDivergentForm()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default ReconciliationActionModal;