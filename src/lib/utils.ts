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

/**
 * Normaliza CPF/CNPJ removendo pontuação
 * @param value - CPF ou CNPJ com ou sem formatação
 * @returns String apenas com números
 */
export function normalizeCpfCnpj(value: unknown): string {
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
  
  // Remove todos os caracteres não numéricos
  return stringValue.replace(/\D/g, '');
}

/**
 * Converte uma string de data (YYYY-MM-DD) para um objeto Date local
 * Isso evita problemas de fuso horário onde o navegador converte UTC para local (ex: dia anterior)
 */
export function parseLocalDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined;
  // Pega apenas a parte da data (YYYY-MM-DD) caso venha ISO completo
  const cleanDate = dateString.split('T')[0];
  const [year, month, day] = cleanDate.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/**
 * Formata uma data localmente para exibição
 */
export function formatDate(date: string | Date | null | undefined, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return '-';
  
  let dateObj: Date | undefined;
  
  if (typeof date === 'string') {
    dateObj = parseLocalDate(date);
  } else {
    dateObj = date;
  }
  
  if (!dateObj || isNaN(dateObj.getTime())) return '-';
  
  return format(dateObj, formatStr, { locale: ptBR });
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
