import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { asaasService } from '@/services/asaas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAsaasCustomers } from '@/hooks/useAsaasData';
import { CreateClientForm } from '@/components/clients/CreateClientForm';
import { ClientSelect } from './form/ClientSelect';
import { PaymentDetails } from './form/PaymentDetails';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';

interface CreateChargeFormProps {
  onSuccess?: () => void;
}

export function CreateChargeForm({ onSuccess }: CreateChargeFormProps) {
  // 🛡️ GUARD DE ACESSO OBRIGATÓRIO
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  
  const [formData, setFormData] = useState({
    customer: '',
    billingType: 'BOLETO',
    value: 0,
    dueDate: '',
    description: '',
  });
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customersData } = useAsaasCustomers({ limit: 100 });
  const customers = customersData?.pages.flatMap(page => page.data) || [];

  const createChargeMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      // AIDEV-NOTE: Passando tenantId para resolver erro de "Tenant ID não fornecido"
      if (!currentTenant?.id) {
        throw new Error('Tenant não definido');
      }
      return asaasService.createPayment(data, currentTenant.id);
    },
    onSuccess: () => {
      // AIDEV-NOTE: Invalidar cache das cobranças para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({
        title: 'Cobrança criada',
        description: 'A cobrança foi criada com sucesso.',
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar cobrança',
        description: 'Ocorreu um erro ao criar a cobrança. Tente novamente.',
        variant: 'destructive',
      });
      console.error('Error creating charge:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🚨 GUARD CLAUSE - Verificar acesso antes de prosseguir
    if (!hasAccess) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para criar cobranças.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.customer || !formData.value || !formData.dueDate) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    createChargeMutation.mutate(formData);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 p-4 md:p-6">
        {/* Seção de Seleção de Cliente */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Cliente</h3>
            <p className="text-sm text-gray-600">Selecione ou cadastre um cliente</p>
          </div>
          <ClientSelect
            value={formData.customer}
            onValueChange={(value) => setFormData({ ...formData, customer: value })}
            onNewClient={() => setIsNewClientDialogOpen(true)}
            clients={customers}
          />
        </div>

        <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>
                Cadastre um novo cliente para criar a cobrança
              </DialogDescription>
            </DialogHeader>
            <CreateClientForm
              onSuccess={(newCustomerId: string) => {
                setIsNewClientDialogOpen(false);
                setFormData(prev => ({ ...prev, customer: newCustomerId }));
                queryClient.invalidateQueries({ queryKey: ['customers'] });
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Seção de Detalhes do Pagamento */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Detalhes da Cobrança</h3>
            <p className="text-sm text-gray-600">Informações de valor e vencimento</p>
          </div>
          <PaymentDetails
            value={formData.value}
            onValueChange={(value) => setFormData({ ...formData, value })}
            dueDate={formData.dueDate}
            onDueDateChange={(date) => setFormData({ ...formData, dueDate: date })}
            billingType={formData.billingType}
            onBillingTypeChange={(type) => setFormData({ ...formData, billingType: type })}
            description={formData.description}
            onDescriptionChange={(desc) => setFormData({ ...formData, description: desc })}
          />
        </div>

        {/* Botão de ação */}
        <div className="pt-4 border-t">
          <Button
            type="submit"
            className="w-full md:w-auto md:min-w-[200px] h-11 text-base font-medium"
            disabled={createChargeMutation.isPending}
          >
            {createChargeMutation.isPending ? 'Criando...' : 'Criar Cobrança'}
          </Button>
        </div>
      </form>
    </div>
  );
}
