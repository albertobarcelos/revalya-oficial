import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2
  });
  
  return formatter.format(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatCpfCnpj(value: unknown): string {
  // AIDEV-NOTE: Função corrigida para tratar tanto strings quanto números do banco
  if (!value) {
    return "";
  }
  
  // Converte para string se for número
  let stringValue: string;
  if (typeof value === 'number') {
    stringValue = value.toString();
  } else if (typeof value === 'string') {
    stringValue = value.trim();
  } else {
    return "";
  }
  
  // Se string vazia, retorna vazio
  if (stringValue === '') {
    return "";
  }
  
  // Remove todos os caracteres não numéricos
  const numericValue = stringValue.replace(/\D/g, '');
  
  // Se não há valor numérico, retorna string vazia
  if (!numericValue) {
    return "";
  }
  
  // Se já estiver formatado, retorna o valor original
  if (stringValue.includes('.') || stringValue.includes('/') || stringValue.includes('-')) {
    // Verifica se o formato está correto
    if ((numericValue.length === 11 && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(stringValue)) ||
        (numericValue.length === 14 && /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(stringValue))) {
      return stringValue;
    }
  }
  
  // CNPJ (14 dígitos)
  if (numericValue.length === 14) {
    return numericValue.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
  
  // CPF (11 dígitos)
  if (numericValue.length === 11) {
    return numericValue.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    );
  }
  
  // Se não for CPF nem CNPJ completo, retorna o valor numérico parcial
  return numericValue;
}

// AIDEV-NOTE: Corrigido problema de timezone - usar parseISO para strings de data
export function formatDate(dateString: string, formatString: string = "dd/MM/yyyy") {
  if (!dateString) return '-';
  try {
    // Usar parseISO para evitar problemas de timezone com strings no formato ISO
    const date = parseISO(dateString);
    return format(date, formatString, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
}

// Função para sanitizar inputs de texto
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Função para validar CPF/CNPJ
export function isValidCpfCnpj(value: string): boolean {
  const numericValue = value.replace(/\D/g, '');
  if (numericValue.length !== 11 && numericValue.length !== 14) {
    return false;
  }
  return true;
}

// Função para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para validar telefone
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\d{10,11}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

// Adicionar a função formatPhoneNumber ao arquivo de utilitários existente
export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  // Remover todos os caracteres não numéricos
  const numericOnly = phone.replace(/\D/g, '');
  
  // Verificar o tamanho do número para aplicar a formatação correta
  if (numericOnly.length === 11) {
    // Formato para celular: (XX) XXXXX-XXXX
    return `(${numericOnly.substring(0, 2)}) ${numericOnly.substring(2, 7)}-${numericOnly.substring(7, 11)}`;
  } else if (numericOnly.length === 10) {
    // Formato para telefone fixo: (XX) XXXX-XXXX
    return `(${numericOnly.substring(0, 2)}) ${numericOnly.substring(2, 6)}-${numericOnly.substring(6, 10)}`;
  }
  
  // Se não se encaixar nos padrões, retorna o número formatado da melhor forma possível
  return numericOnly;
}

/**
 * Formata um número com separadores de milhares
 */
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat('pt-BR').format(value);
  } else {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 1
    }).format(value);
  }
}
