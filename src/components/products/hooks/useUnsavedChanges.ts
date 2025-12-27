/**
 * Hook: useUnsavedChanges
 * 
 * Responsabilidade: Rastrear mudanças não salvas no formulário
 * - Detecta se há alterações em relação aos dados iniciais
 * - Compara formData atual com dados iniciais
 * - Ignora diferenças irrelevantes (undefined vs null, strings vazias, etc)
 * 
 * Clean Code: Single Responsibility Principle
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseUnsavedChangesProps<T> {
  currentData: T;
  initialData: T;
  enabled?: boolean;
}

// AIDEV-NOTE: Campos que devem ser ignorados na comparação (metadados, timestamps, etc)
const IGNORED_FIELDS = ['updated_at', 'created_at', 'id', 'tenant_id', 'created_by'];

// AIDEV-NOTE: Campos relevantes que indicam mudança real pelo usuário
const RELEVANT_FIELDS = [
  'name', 'description', 'code', 'sku', 'barcode',
  'unit_price', 'cost_price', 'stock_quantity', 'min_stock_quantity',
  'category_id', 'brand_id', 'unit_of_measure', 'supplier',
  'tax_rate', 'has_inventory', 'is_active', 'image_url',
  'ncm', 'cest', 'cfop_id', 'origem', 'product_type_id',
  'cst_icms', 'cst_ipi', 'cst_pis', 'cst_cofins',
  'aliquota_pis', 'aliquota_cofins'
];

/**
 * Normaliza valor para comparação
 * - null, undefined, '' são considerados equivalentes (vazio)
 * - Números são convertidos para string para comparação consistente
 */
function normalizeValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  return String(value);
}

/**
 * Compara dois objetos considerando apenas campos relevantes
 */
function hasRealChanges<T extends Record<string, any>>(current: T, initial: T): boolean {
  for (const field of RELEVANT_FIELDS) {
    const currentValue = normalizeValue(current[field]);
    const initialValue = normalizeValue(initial[field]);
    
    if (currentValue !== initialValue) {
      console.log('[useUnsavedChanges] Campo alterado:', {
        field,
        current: currentValue,
        initial: initialValue
      });
      return true;
    }
  }
  return false;
}

export function useUnsavedChanges<T extends Record<string, any>>({
  currentData,
  initialData,
  enabled = true,
}: UseUnsavedChangesProps<T>) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialDataRef = useRef<T>(initialData);

  // AIDEV-NOTE: Atualizar referência inicial quando dados iniciais mudam (ex: após salvar)
  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  // AIDEV-NOTE: Comparar dados atuais com dados iniciais para detectar mudanças REAIS
  useEffect(() => {
    if (!enabled) {
      setHasUnsavedChanges(false);
      return;
    }

    // AIDEV-NOTE: Comparação inteligente considerando apenas campos relevantes
    const hasChanges = hasRealChanges(currentData, initialDataRef.current);
    
    setHasUnsavedChanges(hasChanges);
  }, [currentData, enabled]);

  // AIDEV-NOTE: Função para marcar como salvo (resetar estado)
  const markAsSaved = useCallback(() => {
    initialDataRef.current = currentData;
    setHasUnsavedChanges(false);
  }, [currentData]);

  return {
    hasUnsavedChanges,
    markAsSaved,
  };
}

