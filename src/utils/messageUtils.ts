import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatFirstName = (fullName?: string): string => {
  if (!fullName) return '';
  const firstName = fullName.split(' ')[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

// Ajustado para garantir o cálculo correto de dias em atraso
const calculateDaysOverdue = (dueDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Certifica-se de que a data de vencimento seja interpretada como dia local (sem ajuste de fuso)
  const dueDateParts = dueDate.split('-').map(Number);
  const dueDateTime = new Date(dueDateParts[0], dueDateParts[1] - 1, dueDateParts[2]);
  
  return dueDateTime < today ? differenceInDays(today, dueDateTime) : 0;
};

// Formata a data para dd/mm/yyyy garantindo o uso do dia correto
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // Usa as partes da data diretamente para evitar ajustes de fuso
  const [year, month, day] = dateString.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

/**
 * AIDEV-NOTE: Processa tags em mensagens substituindo por dados reais
 * Função responsável por substituir tags como {cliente.nome}, {cobranca.valor} etc.
 * com dados reais do cliente e cobrança. Suporta múltiplas variações de tags.
 */
export const processMessageTags = (message: string, data: { 
  customer: { 
    name?: string; 
    email?: string; 
    phone?: string; 
    cpf_cnpj?: string;
    company?: string;
  }; 
  charge: { 
    valor: number; 
    data_vencimento: string; 
    descricao?: string; 
    codigo_barras?: string;
    status?: string;        // AIDEV-NOTE: Status da cobrança
    pix_key?: string;        // AIDEV-NOTE: Chave PIX copia e cola
    invoice_url?: string;   // AIDEV-NOTE: URL da fatura do Asaas
    pdf_url?: string;        // AIDEV-NOTE: URL do PDF do boleto
  }; 
}) => {
  if (!message) return '';

  // AIDEV-NOTE: Verificação de dados válidos
  const hasValidData = data && data.customer && data.charge;
  
  if (!hasValidData) {
    console.warn('⚠️ Dados inválidos para processamento de tags:', data);
    return message; // Retorna mensagem original se dados inválidos
  }

  const daysOverdue = calculateDaysOverdue(data.charge.data_vencimento);
  
  // Adicionando logs para depuração
  console.log('🏷️ Processando tags da mensagem:', { 
    originalMessage: message,
    customerData: data.customer,
    chargeData: {
      ...data.charge,
      formattedDate: formatDate(data.charge.data_vencimento)
    }
  });
  
  // AIDEV-NOTE: Log específico para debugar campos empresa e cpf_cnpj
  console.log('🔍 Debug campos específicos:', {
    'customer.company': data.customer?.company,
    'customer.cpf_cnpj': data.customer?.cpf_cnpj,
    'typeof company': typeof data.customer?.company,
    'typeof cpf_cnpj': typeof data.customer?.cpf_cnpj
  });

  // Processando as tags com logs para cada substituição
  let processedMessage = message;
  
  // AIDEV-NOTE: Tags do cliente - suportando múltiplas variações
  const customerName = formatFirstName(data.customer?.name);
  processedMessage = processedMessage.replace(/{cliente\.nome}/g, customerName || 'Cliente');
  processedMessage = processedMessage.replace(/{cliente\.email}/g, data.customer?.email || 'email@exemplo.com');
  processedMessage = processedMessage.replace(/{cliente\.telefone}/g, data.customer?.phone || '(11) 99999-9999');
  processedMessage = processedMessage.replace(/{cliente\.cpf}/g, data.customer?.cpf_cnpj || '000.000.000-00');
  processedMessage = processedMessage.replace(/{cliente\.cpf_cnpj}/g, data.customer?.cpf_cnpj || '000.000.000-00');
  processedMessage = processedMessage.replace(/{cliente\.empresa}/g, data.customer?.company || 'Empresa não informada');
  
  // AIDEV-NOTE: Tags da cobrança com formatação adequada
  const formattedValue = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(data.charge?.valor || 0);
  
  const formattedDueDate = formatDate(data.charge?.data_vencimento);
  
  processedMessage = processedMessage.replace(/{cobranca\.valor}/g, formattedValue);
  processedMessage = processedMessage.replace(/{cobranca\.vencimento}/g, formattedDueDate || new Date().toLocaleDateString('pt-BR'));
  processedMessage = processedMessage.replace(/{cobranca\.descricao}/g, data.charge?.descricao || 'Descrição da cobrança');
  processedMessage = processedMessage.replace(/{cobranca\.status}/g, data.charge?.status || 'Status não disponível');
  processedMessage = processedMessage.replace(/{cobranca\.codigoBarras}/g, data.charge?.codigo_barras || '00000000000000000000000000000000000000000000');
  
  // AIDEV-NOTE: Tag PIX copia e cola - usa pix_key diretamente
  processedMessage = processedMessage.replace(/{cobranca\.pix_copia_cola}/g, data.charge?.pix_key || 'Chave PIX não disponível');
  // AIDEV-NOTE: Manter compatibilidade com tag antiga {cobranca.pix}
  processedMessage = processedMessage.replace(/{cobranca\.pix}/g, data.charge?.pix_key || 'Chave PIX não disponível');
  
  // AIDEV-NOTE: Tag link principal - usa invoice_url
  const cobrancaLink = data.charge?.invoice_url || 'Link não disponível';
  processedMessage = processedMessage.replace(/{cobranca\.link}/g, cobrancaLink);
  // AIDEV-NOTE: Manter compatibilidade com tag antiga {cobranca.link_pix}
  processedMessage = processedMessage.replace(/{cobranca\.link_pix}/g, cobrancaLink);
  
  // AIDEV-NOTE: Tag link boleto - usa pdf_url
  const linkBoleto = data.charge?.pdf_url || 'Link do boleto não disponível';
  processedMessage = processedMessage.replace(/{cobranca\.link_boleto}/g, linkBoleto);
  
  // AIDEV-NOTE: Tags de dias
  processedMessage = processedMessage.replace(/{dias\.aposVencimento}/g, daysOverdue.toString());
  
  // AIDEV-NOTE: Calcular dias até vencimento (para tags futuras)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateParts = data.charge.data_vencimento.split('-').map(Number);
  const dueDateTime = new Date(dueDateParts[0], dueDateParts[1] - 1, dueDateParts[2]);
  const daysUntilDue = dueDateTime > today ? differenceInDays(dueDateTime, today) : 0;
  
  processedMessage = processedMessage.replace(/{dias\.ateVencimento}/g, daysUntilDue.toString());
  
  console.log('✅ Mensagem processada:', processedMessage);
  
  return processedMessage;
};
