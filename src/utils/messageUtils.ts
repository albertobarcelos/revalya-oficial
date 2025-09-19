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
    link_pagamento?: string; 
    codigo_barras?: string; 
    // codigo_pix?: string; // Column doesn't exist in database 
  }; 
}) => {
  if (!message) return '';

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

  // Processando as tags com logs para cada substituição
  let processedMessage = message;
  
  // Cliente
  processedMessage = processedMessage.replace(/{cliente\.nome}/g, formatFirstName(data.customer?.name));
  processedMessage = processedMessage.replace(/{cliente\.email}/g, data.customer?.email || '');
  processedMessage = processedMessage.replace(/{cliente\.telefone}/g, data.customer?.phone || '');
  processedMessage = processedMessage.replace(/{cliente\.cpf}/g, data.customer?.cpf_cnpj || '');
  
  // Cobrança
  processedMessage = processedMessage.replace(/{cobranca\.valor}/g, new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(data.charge?.valor || 0));
  
  // Usando o formatDate para garantir o formato correto da data
  processedMessage = processedMessage.replace(/{cobranca\.vencimento}/g, formatDate(data.charge?.data_vencimento));
  
  processedMessage = processedMessage.replace(/{cobranca\.descricao}/g, data.charge?.descricao || '');
  processedMessage = processedMessage.replace(/{cobranca\.linkPagamento}/g, data.charge?.link_pagamento || '');
  processedMessage = processedMessage.replace(/{cobranca\.codigoBarras}/g, data.charge?.codigo_barras || '');
  // processedMessage = processedMessage.replace(/{cobranca\.pix}/g, data.charge?.codigo_pix || ''); // Column doesn't exist in database
  
  // Empresa
  processedMessage = processedMessage.replace(/{empresa\.nome}/g, data.customer?.company || '');
  
  // Dias após vencimento
  processedMessage = processedMessage.replace(/{dias\.aposVencimento}/g, daysOverdue.toString());
  
  console.log('✅ Mensagem processada:', processedMessage);
  
  return processedMessage;
};
