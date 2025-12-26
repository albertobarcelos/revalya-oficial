/**
 * Hook para gerenciar lógica de código interno do produto
 * 
 * AIDEV-NOTE: Isola toda a lógica relacionada ao código interno
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseProductCodeProps {
  formData: any;
  isEditMode: boolean;
  validateCodeExists?: ((code: string, productId?: string) => Promise<boolean>) | undefined;
  nextAvailableCode?: string | undefined;
  hasCodeAccess: boolean;
  productId?: string | undefined;
  onChange: (e: any) => void;
}

export function useProductCode({
  formData,
  isEditMode,
  validateCodeExists,
  nextAvailableCode,
  hasCodeAccess,
  productId,
  onChange,
}: UseProductCodeProps) {
  const { toast } = useToast();
  
  // Estados
  const [showCustomCode, setShowCustomCode] = useState(() => {
    return isEditMode && !!(formData as any).code;
  });
  
  const [internalCodeType, setInternalCodeType] = useState(() => {
    return isEditMode && !!(formData as any).code ? 'custom' : 'sequencia-normal';
  });
  
  const [codeError, setCodeError] = useState<string>('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCodeLocked, setIsCodeLocked] = useState(() => {
    return isEditMode && !!(formData as any).code;
  });
  
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoFilledCode = useRef(false);

  // AIDEV-NOTE: Preencher código automaticamente quando "sequência normal" estiver selecionada
  useEffect(() => {
    if (
      !hasAutoFilledCode.current &&
      internalCodeType === 'sequencia-normal' && 
      hasCodeAccess && 
      nextAvailableCode && 
      !(formData as any).code?.trim()
    ) {
      console.log(`🔢 [AUTO-CODE] Preenchendo código automaticamente: ${nextAvailableCode}`);
      onChange({
        target: { name: 'code', value: nextAvailableCode }
      } as any);
      setCodeError('');
      hasAutoFilledCode.current = true;
    }
  }, [internalCodeType, hasCodeAccess, nextAvailableCode, formData, onChange]);

  // AIDEV-NOTE: Validar código personalizado
  const handleCodeValidation = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCodeError('');
      return;
    }

    if (internalCodeType === 'custom' || (isEditMode && !isCodeLocked)) {
      setIsValidatingCode(true);
      setCodeError('');
      
      try {
        const exists = validateCodeExists ? await validateCodeExists(code.trim(), productId) : false;
        if (exists) {
          setCodeError(`O código "${code}" já está em uso. Escolha outro código.`);
          toast({
            title: 'Código duplicado',
            description: `O código "${code}" já está em uso.`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('[ERROR] Erro ao validar código:', error);
        setCodeError('Erro ao validar código. Tente novamente.');
      } finally {
        setIsValidatingCode(false);
      }
    }
  }, [internalCodeType, isEditMode, isCodeLocked, validateCodeExists, productId, toast]);

  // AIDEV-NOTE: Mudança de tipo de código
  const handleCodeTypeChange = useCallback((value: string) => {
    setInternalCodeType(value);
    setCodeError('');
    
    if (value === 'custom') {
      setShowCustomCode(true);
      if ((formData as any).code && (formData as any).code.startsWith('PRD')) {
        onChange({
          target: { name: 'code', value: '' }
        } as any);
      }
    } else {
      setShowCustomCode(false);
      if (hasCodeAccess && nextAvailableCode) {
        onChange({
          target: { name: 'code', value: nextAvailableCode }
        } as any);
      }
    }
  }, [formData, hasCodeAccess, nextAvailableCode, onChange]);

  // AIDEV-NOTE: Handler para mudança de código com debounce
  const handleCodeChange = useCallback((value: string) => {
    onChange({
      target: { name: 'code', value }
    } as any);
    setCodeError('');
    
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    validationTimeoutRef.current = setTimeout(() => {
      handleCodeValidation(value);
    }, 500);
  }, [onChange, handleCodeValidation]);

  // AIDEV-NOTE: Handler para blur do código
  const handleCodeBlur = useCallback((value: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    handleCodeValidation(value);
  }, [handleCodeValidation]);

  return {
    // Estados
    showCustomCode,
    internalCodeType,
    codeError,
    isValidatingCode,
    isCodeLocked,
    
    // Handlers
    setShowCustomCode,
    handleCodeTypeChange,
    handleCodeChange,
    handleCodeBlur,
    setIsCodeLocked,
  };
}

