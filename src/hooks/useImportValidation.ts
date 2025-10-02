import { useMemo } from 'react';
import type { AsaasCustomer } from '@/types/asaas';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationResultWithCustomer {
  customer: AsaasCustomer;
  validation: ValidationResult;
}

/**
 * AIDEV-NOTE: Hook para validação de dados de clientes na importação
 * Centraliza toda a lógica de validação e categorização dos dados
 */
export function useImportValidation(data: AsaasCustomer[]) {
  // AIDEV-NOTE: Função de validação individual do cliente
  const validateCustomer = (customer: AsaasCustomer): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validações obrigatórias
    if (!customer.name?.trim()) {
      errors.push('Nome é obrigatório');
    }
    if (!customer.email?.trim()) {
      errors.push('Email é obrigatório');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errors.push('Email inválido');
    }

    // Validações de aviso
    if (!customer.cpfCnpj?.trim()) {
      warnings.push('CPF/CNPJ não informado');
    }
    if (!customer.phone?.trim()) {
      warnings.push('Telefone não informado');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // AIDEV-NOTE: Memoização das validações para performance
  const validationResults = useMemo(() => {
    return data.map(customer => ({
      customer,
      validation: validateCustomer(customer)
    }));
  }, [data]);

  const validCustomers = useMemo(() => 
    validationResults.filter(result => result.validation.isValid), 
    [validationResults]
  );

  const invalidCustomers = useMemo(() => 
    validationResults.filter(result => !result.validation.isValid), 
    [validationResults]
  );

  return {
    validationResults,
    validCustomers,
    invalidCustomers,
    validateCustomer
  };
}