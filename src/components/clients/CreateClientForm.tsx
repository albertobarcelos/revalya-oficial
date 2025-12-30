import { useState, useEffect } from 'react';
import { type CreateCustomerDTO } from '@/types/asaas';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PersonalInfoFields } from './form/PersonalInfoFields';
import { AddressFields } from './form/AddressFields';
import { ClientTypeSidebar } from './form/ClientTypeSidebar';
import { useCustomers } from '@/hooks/useCustomers';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { CNPJStatusIndicator } from '@/components/ui/CNPJStatusIndicator';
import { supabase } from '@/lib/supabase';
import { User, MapPin } from 'lucide-react';

interface CreateClientFormProps {
  onSuccess?: (customerId: string) => void;
  onCancel?: () => void;
}

export function CreateClientForm({ onSuccess, onCancel }: CreateClientFormProps) {
  const [formData, setFormData] = useState<CreateCustomerDTO>({
    name: '',
    email: '',
    phone: '',
    celular_whatsapp: '',
    // AIDEV-NOTE: Removido mobilePhone - campo não existe na tabela customers
    cpfCnpj: '',
    postal_code: '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
    address: '',
    addressNumber: '',
    complement: '',
    neighborhood: '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
    city: '',
    state: '',
    company: '', // Updated to match DTO
    is_supplier: false,
    is_carrier: false
  });
  
  // AIDEV-NOTE: Estado para rastrear cliente criado e mostrar status CNPJ
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);

  const { toast } = useToast();
  const { createCustomer, isCreating } = useCustomers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulário enviado:', formData);
    
    if (!formData.name || !formData.cpfCnpj) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    
    // AIDEV-NOTE: Mapeando campos do formulário para a estrutura do banco
    // Limpa o CNPJ removendo formatação antes de enviar para o banco
    const cleanCpfCnpj = formData.cpfCnpj.replace(/\D/g, '');
    
    const customerData = {
      ...formData,
      // AIDEV-NOTE: Mapear cpfCnpj para cpf_cnpj (campo correto do banco)
      cpf_cnpj: cleanCpfCnpj ? Number(cleanCpfCnpj) : undefined,
      // AIDEV-NOTE: Mapear addressNumber para address_number (campo correto do banco)
      address_number: formData.addressNumber,
      // AIDEV-NOTE: Remover campos em camelCase para evitar conflitos
      cpfCnpj: undefined,
      addressNumber: undefined
    };
    
    try {
      const data = await createCustomer(customerData);
      console.log('Cliente criado com sucesso no formulário:', data);
      
      // AIDEV-NOTE: Armazena ID do cliente para mostrar status CNPJ e exibir sucesso apenas quando houver ID
      if (data?.id) {
        setCreatedCustomerId(data.id);
        toast({
          title: 'Cliente criado',
          description: 'O cliente foi criado com sucesso. Se for CNPJ, os dados serão preenchidos automaticamente.',
        });
        
        // AIDEV-NOTE: Chama onSuccess imediatamente para fechar modal
        if (onSuccess) {
          // Usar setTimeout para garantir que o toast seja exibido antes do fechamento
          setTimeout(() => {
            onSuccess(data.id);
          }, 100);
        }
      } else {
        toast({
          title: 'Falha ao criar cliente',
          description: 'Não foi possível obter o ID do cliente criado. Tente novamente.',
          variant: 'destructive',
        });
      }
      
      // AIDEV-NOTE: Limpa o formulário após sucesso para evitar interferência no fechamento do modal
      setFormData({
        name: '',
        email: '',
        phone: '',
        celular_whatsapp: '',
        cpfCnpj: '',
        postal_code: '',
        address: '',
        address_number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        company: '',
      });
      setCreatedCustomerId(null);
    } catch (error: any) {
      console.error('Erro na criação do cliente no formulário:', error);
      
      // Verificar tipo específico de erro para exibir mensagem apropriada
      let errorMessage = 'Ocorreu um erro ao criar o cliente. Tente novamente.';
      
      if (error.message?.includes('tenant')) {
        errorMessage = 'Erro de tenant: Não foi possível associar o cliente ao seu tenant. Contate o administrador.';
      } else if (error.message?.includes('autenticado') || error.message?.includes('auth')) {
        errorMessage = 'Erro de autenticação: Você precisa estar logado para criar um cliente. Tente fazer login novamente.';
      } else if (error.message?.includes('policy')) {
        errorMessage = 'Erro de permissão: Você não tem permissão para criar clientes. Contate o administrador.';
      }
      
      toast({
        title: 'Erro ao criar cliente',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleFieldChange = (field: keyof CreateCustomerDTO, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // AIDEV-NOTE: Função para atualizar múltiplos campos de uma vez (consulta CNPJ)
  const handleBulkChange = (data: Partial<CreateCustomerDTO>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            {/* Seção de Informações Pessoais - Estilo Card */}
            <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
              <h2 className="font-medium flex items-center gap-2 mb-4 text-foreground">
                <User className="h-4 w-4 text-primary" />
                Informações Pessoais
              </h2>
              <div className="space-y-4">
                <PersonalInfoFields 
                  formData={formData} 
                  onChange={handleFieldChange}
                  onBulkChange={handleBulkChange}
                />
                {/* AIDEV-NOTE: Indicador de status CNPJ se cliente foi criado */}
                {createdCustomerId && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/30">
                    <CNPJStatusIndicator 
                      customerId={createdCustomerId}
                      showDetails={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Seção de Endereço - Estilo Card */}
            <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
              <h2 className="font-medium flex items-center gap-2 mb-4 text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Endereço
              </h2>
              <div className="space-y-4">
                <AddressFields formData={formData} onChange={handleFieldChange} />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80 space-y-6">
            <ClientTypeSidebar 
              formData={formData} 
              onChange={(field, value) => handleFieldChange(field as keyof CreateCustomerDTO, value)} 
            />
          </div>
        </div>
        
        {/* Botão de ação - Estilo Card para ações */}
        <div className="mt-6 bg-card rounded-lg border border-border/50 p-4 shadow-sm flex items-center justify-between sticky bottom-0 z-10">
          {/* AIDEV-NOTE: Botão para limpar formulário após criação */}
          {createdCustomerId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  celular_whatsapp: '',
                  cpfCnpj: '',
                  postal_code: '',
                  address: '',
                  address_number: '',
                  complement: '',
                  neighborhood: '',
                  city: '',
                  state: '',
                  company: '',
                });
                setCreatedCustomerId(null);
              }}
              className="mr-auto"
            >
              Novo Cliente
            </Button>
          ) : (
            <div /> // Espaçador
          )}
          
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
