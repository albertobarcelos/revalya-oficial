import { useState, useEffect } from 'react';
import { type CreateCustomerDTO } from '@/types/asaas';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PersonalInfoFields } from './form/PersonalInfoFields';
import { AddressFields } from './form/AddressFields';
import { useCustomers } from '@/hooks/useCustomers';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { CNPJStatusIndicator } from '@/components/ui/CNPJStatusIndicator';
import { supabase } from '@/lib/supabase';

interface CreateClientFormProps {
  onSuccess?: (customerId: string) => void;
}

export function CreateClientForm({ onSuccess }: CreateClientFormProps) {
  const [formData, setFormData] = useState<CreateCustomerDTO>({
    name: '',
    email: '',
    phone: '',
    // AIDEV-NOTE: Removido mobilePhone - campo não existe na tabela customers
    cpfCnpj: '',
    postal_code: '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
    address: '',
    address_number: '',
    complement: '',
    neighborhood: '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
    city: '',
    state: '',
    company: '' // Updated to match DTO
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
    const customerData = {
      ...formData,
      // AIDEV-NOTE: Mapear cpfCnpj para cpf_cnpj (campo correto do banco)
      cpf_cnpj: formData.cpfCnpj,
      // AIDEV-NOTE: Mapear addressNumber para address_number (campo correto do banco)
      address_number: formData.addressNumber,
      // AIDEV-NOTE: Remover campos em camelCase para evitar conflitos
      cpfCnpj: undefined,
      addressNumber: undefined
    };
    
    try {
      const data = await createCustomer(customerData);
      console.log('Cliente criado com sucesso no formulário:', data);
      
      // AIDEV-NOTE: Armazena ID do cliente para mostrar status CNPJ
      if (data?.id) {
        setCreatedCustomerId(data.id);
      }
      
      toast({
        title: 'Cliente criado',
        description: 'O cliente foi criado com sucesso. Se for CNPJ, os dados serão preenchidos automaticamente.',
      });
      
      if (onSuccess && data?.id) {
        onSuccess(data.id);
      }
      
      // AIDEV-NOTE: Não limpa o formulário imediatamente para mostrar status CNPJ
      // Será limpo após alguns segundos ou quando o usuário sair
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

  const handleFieldChange = (field: keyof CreateCustomerDTO, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // AIDEV-NOTE: Função para atualizar múltiplos campos de uma vez (consulta CNPJ)
  const handleBulkChange = (data: Partial<CreateCustomerDTO>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 p-4 md:p-6">
        {/* Seção de Informações Pessoais */}
        <div className="space-y-4">
          <div className="border-b pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
              <p className="text-sm text-gray-600">Dados básicos do cliente</p>
            </div>
            {/* AIDEV-NOTE: Indicador de status CNPJ se cliente foi criado */}
            {createdCustomerId && (
              <CNPJStatusIndicator 
                customerId={createdCustomerId}
                showDetails={true}
                className="ml-4"
              />
            )}
          </div>
          <PersonalInfoFields 
            formData={formData} 
            onChange={handleFieldChange}
            onBulkChange={handleBulkChange}
          />
        </div>

        {/* Seção de Endereço */}
        <div className="space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Endereço</h3>
            <p className="text-sm text-gray-600">Informações de localização</p>
          </div>
          <AddressFields formData={formData} onChange={handleFieldChange} />
        </div>
        
        {/* Botão de ação */}
        <div className="pt-4 border-t flex items-center justify-between">
          <Button
            type="submit"
            className="w-full md:w-auto md:min-w-[200px] h-11 text-base font-medium"
            disabled={isCreating}
          >
            {isCreating ? 'Criando...' : 'Criar Cliente'}
          </Button>
          
          {/* AIDEV-NOTE: Botão para limpar formulário após criação */}
          {createdCustomerId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  // AIDEV-NOTE: Removido mobilePhone - campo não existe na tabela customers
                  cpfCnpj: '',
                  postal_code: '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
                  address: '',
                  addressNumber: '',
                  complement: '',
                  neighborhood: '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
                  city: '',
                  state: '',
                  company: '',
                });
                setCreatedCustomerId(null);
              }}
              className="ml-4"
            >
              Novo Cliente
            </Button>
          )}
        </div>
      </form>
    </div>
  );

  const { isVisible } = usePageVisibility();

  useEffect(() => {
    const revalidateSession = async () => {
      if (isVisible) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Revalidar contexto do tenant se necessário
          console.log('Sessão revalidada com sucesso');
        }
      }
    };
    revalidateSession();
  }, [isVisible]);
}
