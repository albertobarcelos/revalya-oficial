import type { AsaasCustomer } from '@/types/asaas';

/**
 * AIDEV-NOTE: Utilitários para auxiliar na importação de clientes
 * Funções auxiliares para formatação e processamento de dados
 */

/**
 * Retorna o rótulo da fonte de dados
 */
export function getSourceLabel(source: 'asaas' | 'csv'): string {
  return source === 'asaas' ? 'Asaas' : 'arquivo CSV';
}

/**
 * Aplica as edições aos dados selecionados
 */
export function applyEditsToSelectedData(
  data: AsaasCustomer[],
  selectedItems: Set<string>,
  editedData: Map<string, Partial<AsaasCustomer>>
): AsaasCustomer[] {
  const selectedCustomers = data.filter(customer => selectedItems.has(customer.id));
  
  return selectedCustomers.map(customer => {
    const edits = editedData.get(customer.id);
    return edits ? { ...customer, ...edits } : customer;
  });
}

/**
 * Formata o número de telefone para exibição
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Formata conforme o padrão brasileiro
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Formata CPF/CNPJ para exibição
 */
export function formatCpfCnpj(cpfCnpj: string): string {
  if (!cpfCnpj) return '';
  
  // Remove caracteres não numéricos
  const cleaned = cpfCnpj.replace(/\D/g, '');
  
  // Formata CPF
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  // Formata CNPJ
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return cpfCnpj;
}