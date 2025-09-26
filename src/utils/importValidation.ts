/**
 * Utilitários de validação para importação de clientes
 * 
 * @module ImportValidation
 */

import type { ValidationResult, ValidationError, ValidationWarning, SystemField } from '@/types/import';

// AIDEV-NOTE: Validação de email
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// AIDEV-NOTE: Validação de CPF
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

// AIDEV-NOTE: Validação de CNPJ
export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se não são todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação dos dígitos verificadores
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

// AIDEV-NOTE: Validação de CPF ou CNPJ
export function isValidCpfCnpj(value: string): boolean {
  if (!value) return false;
  
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length === 11) {
    return isValidCPF(cleanValue);
  } else if (cleanValue.length === 14) {
    return isValidCNPJ(cleanValue);
  }
  
  return false;
}

// AIDEV-NOTE: Validação de telefone (formato brasileiro)
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Aceita telefones com 10 ou 11 dígitos (com ou sem 9 no celular)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

// AIDEV-NOTE: Função principal de validação de um registro
export function validateRecord(
  data: Record<string, string | null>,
  systemFields: SystemField[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  systemFields.forEach(field => {
    const value = data[field.key];

    // Verificar campos obrigatórios
    if (field.required && (!value || value.trim() === '')) {
      errors.push({
        field: field.key,
        message: `${field.label} é obrigatório`,
        type: 'required'
      });
      return;
    }

    // Pular validação se o campo estiver vazio e não for obrigatório
    if (!value || value.trim() === '') {
      if (!field.required) {
        warnings.push({
          field: field.key,
          message: `${field.label} não foi preenchido`,
          type: 'missing_optional'
        });
      }
      return;
    }

    // Validações específicas por tipo
    switch (field.type) {
      case 'email':
        if (!isValidEmail(value)) {
          errors.push({
            field: field.key,
            message: `${field.label} deve ter um formato válido`,
            type: 'invalid_format'
          });
        }
        break;

      case 'cpf_cnpj':
        if (!isValidCpfCnpj(value)) {
          errors.push({
            field: field.key,
            message: `${field.label} deve ser um CPF ou CNPJ válido`,
            type: 'invalid_format'
          });
        }
        break;

      case 'phone':
        if (!isValidPhone(value)) {
          warnings.push({
            field: field.key,
            message: `${field.label} pode ter um formato inválido`,
            type: 'format_suggestion'
          });
        }
        break;
    }

    // Validação customizada se existir
    if (field.validation && !field.validation(value)) {
      errors.push({
        field: field.key,
        message: `${field.label} não atende aos critérios de validação`,
        type: 'invalid_value'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// AIDEV-NOTE: Formatação automática de campos
export function autoFormatField(value: string, fieldType: string): string {
  if (!value) return value;

  switch (fieldType) {
    case 'cpf_cnpj':
      const cleanValue = value.replace(/\D/g, '');
      if (cleanValue.length === 11) {
        // Formato CPF: 000.000.000-00
        return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      } else if (cleanValue.length === 14) {
        // Formato CNPJ: 00.000.000/0000-00
        return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      }
      return value;

    case 'phone':
      const cleanPhone = value.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        // Formato: (00) 0000-0000
        return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else if (cleanPhone.length === 11) {
        // Formato: (00) 00000-0000
        return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      return value;

    case 'email':
      return value.toLowerCase().trim();

    default:
      return value.trim();
  }
}