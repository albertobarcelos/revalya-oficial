import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EditPersonalInfoFields } from './form/EditPersonalInfoFields';
import { AddressFields } from './form/AddressFields';
import { useClientForm } from './hooks/useClientForm';
import type { Customer } from '@/types/database';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';

interface EditClientDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditClientDialog({
  customer,
  open,
  onOpenChange,
  onSuccess,
}: EditClientDialogProps) {
  // 🔐 Hook seguro para buscar dados completos do cliente
  const {
    data: completeCustomer,
    isLoading: isLoadingCustomer,
    error: customerError
  } = useSecureTenantQuery(
    ['customer-details', customer?.id],
    async (supabase, tenantId) => {
      console.log(`[AUDIT] Buscando dados completos do cliente - Tenant: ${tenantId}, Cliente: ${customer?.id}`);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer?.id)
        .eq('tenant_id', tenantId) // 🔒 Filtro de segurança obrigatório
        .single();
        
      if (error) {
        console.error('Erro ao buscar dados completos do cliente:', error);
        throw error;
      }
      
      // 🛡️ Validação dupla de segurança
      if (data && data.tenant_id !== tenantId) {
        console.error('[SECURITY] Tentativa de acesso a cliente de outro tenant:', {
          clientId: customer?.id,
          expectedTenant: tenantId,
          actualTenant: data.tenant_id
        });
        throw new Error('Violação de segurança: cliente não pertence ao tenant');
      }
      
      console.log('Dados completos do cliente obtidos com segurança:', {
        id: data.id,
        name: data.name,
        tenant_id: data.tenant_id,
        cpf_cnpj: data.cpf_cnpj ? '[REDACTED]' : null
      });
      
      return data;
    },
    {
      enabled: open && !!customer?.id, // Só executa quando diálogo está aberto e tem ID
      staleTime: 5 * 60 * 1000 // 5 minutos de cache
    }
  );

  const { formData, isLoading, handleSubmit, handleChange } = useClientForm(
    completeCustomer || customer, // Usa dados completos ou fallback para dados básicos
    () => {
      onSuccess?.();
      onOpenChange(false);
    }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader className="px-0">
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Atualize as informações do cliente. Os campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        {isLoadingCustomer ? (
          <div className="flex items-center justify-center py-8">
            <p>Carregando dados do cliente...</p>
          </div>
        ) : customerError ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <p>Erro ao carregar dados do cliente. Tente novamente.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4">
            <ScrollArea className="h-[60vh] pr-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informações Pessoais</h3>
                  <EditPersonalInfoFields 
                    formData={formData} 
                    onChange={(field, value) => handleChange(field as keyof typeof formData, value)} 
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Endereço</h3>
                  <AddressFields 
                    formData={formData} 
                    onChange={(field, value) => handleChange(field as keyof typeof formData, value)} 
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
