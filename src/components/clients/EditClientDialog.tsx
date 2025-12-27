import {
  Dialog,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomClientDialogContent } from './CustomClientDialogContent';
import { EditPersonalInfoFields } from './form/EditPersonalInfoFields';
import { AddressFields } from './form/AddressFields';
import { useClientForm } from './hooks/useClientForm';
import type { Customer } from '@/types/database';
import { useSecureTenantQuery } from '@/hooks/templates/useSecureTenantQuery';
import { ClientDialogHeader } from './ClientDialogHeader';
import { User, MapPin } from 'lucide-react';

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
      <CustomClientDialogContent>
        <ClientDialogHeader 
          mode="edit" 
          title="Editar Cliente"
          subtitle="Atualize as informações do cliente. Os campos com * são obrigatórios."
          onBack={() => onOpenChange(false)}
        />

        <div className="flex-1 overflow-y-auto bg-muted/30 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
          {isLoadingCustomer ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground">Carregando dados do cliente...</p>
            </div>
          ) : customerError ? (
            <div className="flex items-center justify-center py-20 text-destructive">
              <p>Erro ao carregar dados do cliente. Tente novamente.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
              {/* Seção Dados Pessoais - Estilo Card */}
              <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
                <h2 className="font-medium flex items-center gap-2 mb-4 text-foreground">
                  <User className="h-4 w-4 text-primary" />
                  Dados Pessoais
                </h2>
                <EditPersonalInfoFields 
                  formData={formData} 
                  onChange={(field, value) => handleChange(field as keyof typeof formData, value)} 
                />
              </div>

              {/* Seção Endereço - Estilo Card */}
              <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
                <h2 className="font-medium flex items-center gap-2 mb-4 text-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Endereço
                </h2>
                <AddressFields 
                  formData={formData} 
                  onChange={(field, value) => handleChange(field as keyof typeof formData, value)} 
                />
              </div>

              {/* Botões de Ação */}
              <div className="bg-card rounded-lg border border-border/50 p-4 shadow-sm flex items-center justify-end gap-3 sticky bottom-0 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </CustomClientDialogContent>
    </Dialog>
  );
}
