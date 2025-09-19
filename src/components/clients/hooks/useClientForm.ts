import { clientsService } from '@/services/clientsService';
import type { Customer } from '@/types/database';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { FormData } from '@/types/forms';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';

interface CustomerFormData extends Omit<FormData, 'cpfCnpj'> {
  cpfCnpj: string;
}

export function useClientForm(customer: Customer, onSuccess?: () => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🔒 Validação de segurança: tenant deve estar definido
  if (!hasAccess || !currentTenant?.id) {
    console.error('[SECURITY] useClientForm: Tentativa de uso sem tenant definido');
    throw new Error(accessError || 'Tenant não definido - operação não permitida');
  }
  
  // Referência para controlar a inicialização
  const initializedRef = useRef(false);
  
  // AIDEV-NOTE: Converter CPF/CNPJ para string, pois pode vir como número do banco
  const cpfCnpjValue = customer.cpf_cnpj ? String(customer.cpf_cnpj) : '';
  console.log('Inicializando useClientForm com CPF/CNPJ:', cpfCnpjValue);
  console.log('Dados do cliente recebidos:', customer);
  console.log('Tipo original do CPF/CNPJ:', typeof customer.cpf_cnpj);
  
  const [formData, setFormData] = useState<CustomerFormData>(() => {
    initializedRef.current = true;
    return {
      name: customer.name,
      cpfCnpj: cpfCnpjValue,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      address: customer.address || '',
      addressNumber: customer.address_number || '',
      complement: customer.complement || '',
      neighborhood: customer.neighborhood || '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
      postal_code: customer.postal_code || '', // AIDEV-NOTE: Campo correto conforme schema da tabela customers
      city: customer.city || '',
      state: customer.state || '',
      // AIDEV-NOTE: Removido mobilePhone - campo não existe na tabela customers
    };
  });
  
  // Atualizar o formData quando o customer mudar
  useEffect(() => {
    if (initializedRef.current && customer) {
      console.log('useEffect - Atualizando dados do cliente:', customer);
      console.log('useEffect - CPF/CNPJ do customer:', customer.cpf_cnpj);
      console.log('useEffect - Tipo do CPF/CNPJ:', typeof customer.cpf_cnpj);
      setFormData(prev => {
        const newFormData = {
          ...prev,
          cpfCnpj: customer.cpf_cnpj ? String(customer.cpf_cnpj) : prev.cpfCnpj,
          address: customer.address || prev.address,
          addressNumber: customer.address_number || prev.addressNumber, // AIDEV-NOTE: Incluir address_number na atualização
          complement: customer.complement || prev.complement, // AIDEV-NOTE: Incluir complement na atualização
          neighborhood: customer.neighborhood || prev.neighborhood, // AIDEV-NOTE: Campo neighborhood estava faltando na atualização
          city: customer.city || prev.city,
          state: customer.state || prev.state,
          postal_code: customer.postal_code || prev.postal_code // AIDEV-NOTE: Campo correto conforme schema da tabela customers
        };
        console.log('useEffect - Novo formData.cpfCnpj:', newFormData.cpfCnpj);
        console.log('useEffect - Campo neighborhood atualizado:', newFormData.neighborhood);
        return newFormData;
      });
    }
  }, [customer]);
  
  const handleChange = (field: keyof CustomerFormData, value: string) => {
    // Se o campo for cpfCnpj e o valor estiver vazio, não atualize
    if (field === 'cpfCnpj' && !value && customer.cpf_cnpj) {
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // AIDEV-NOTE: Garantir que o CPF/CNPJ seja sempre uma string válida
      const dataToSubmit = {
        ...formData,
        cpfCnpj: formData.cpfCnpj || (customer.cpf_cnpj ? String(customer.cpf_cnpj) : '')
      };
      
      console.log('Enviando dados para atualização:', dataToSubmit);
      
      await clientsService.updateCustomer(customer.id, dataToSubmit);
      
      // 🔄 Invalidar queries específicas do tenant para segurança
      const tenantId = currentTenant.id;
      
      // Invalidar todas as queries relacionadas a clientes do tenant atual
      queryClient.invalidateQueries({ 
        queryKey: ['customers', tenantId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['clients', tenantId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['customer-details', customer.id, tenantId] 
      });
      
      console.log(`[AUDIT] Queries invalidadas para tenant: ${tenantId} após atualização do cliente: ${customer.id}`);
      
      toast({
        title: 'Cliente atualizado',
        description: 'As informações do cliente foram atualizadas com sucesso.',
      });
      onSuccess?.();
    } catch (error) {
      console.error('[ERROR] Erro ao atualizar cliente:', {
        error: error instanceof Error ? error.message : error,
        customerId: customer.id,
        tenantId: currentTenant.id
      });
      
      toast({
        title: 'Erro ao atualizar cliente',
        description: 'Ocorreu um erro ao atualizar o cliente. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return {
    formData,
    handleSubmit,
    handleChange,
  };
}
