/**
 * Hook: useProductFormLoading
 * 
 * Responsabilidade: Gerenciar estados de loading do formulário
 * - Loading inicial (primeira vez que abre)
 * - Loading de seções específicas
 * - Prevenção de re-renders desnecessários
 * 
 * Clean Code: Single Responsibility Principle
 */

import { useState, useEffect, useRef } from 'react';
import type { FormSection } from '../types/product-form.types';

interface UseProductFormLoadingProps {
  open: boolean;
  productKey: string;
  activeSection: FormSection;
  isLoadingCategories: boolean;
  isLoadingBrands: boolean;
  isLoadingMaxCode: boolean;
  isLoadingCFOPs: boolean;
  isLoadingStock: boolean;
}

interface UseProductFormLoadingReturn {
  isInitialLoading: boolean;
  isSectionLoading: boolean;
  onStockLoadingChange: (isLoading: boolean) => void;
}

export function useProductFormLoading({
  open,
  productKey,
  activeSection,
  isLoadingCategories,
  isLoadingBrands,
  isLoadingMaxCode,
  isLoadingCFOPs,
  isLoadingStock,
}: UseProductFormLoadingProps): UseProductFormLoadingReturn {
  // Estados de loading
  const [isInitialLoadingState, setIsInitialLoadingState] = useState<boolean>(() => open);
  const [isSectionLoading, setIsSectionLoading] = useState<boolean>(false);
  const [isLoadingStockState, setIsLoadingStockState] = useState<boolean>(false);

  // Refs para rastrear estados sem causar re-renders
  const isLoadingRef = useRef<boolean>(false);
  const hasCheckedInitialLoadRef = useRef<boolean>(false);
  const loadedDataMapRef = useRef<Map<string, boolean>>(new Map());
  const visitedSectionsMapRef = useRef<Map<string, Set<FormSection>>>(new Map());
  const isLoadingCategoriesRef = useRef<boolean>(false);
  const isLoadingBrandsRef = useRef<boolean>(false);
  const isLoadingMaxCodeRef = useRef<boolean>(false);
  const isLoadingCFOPsRef = useRef<boolean>(false);

  // Atualizar refs quando estados mudarem (sem causar re-renders)
  useEffect(() => {
    isLoadingCategoriesRef.current = isLoadingCategories;
    isLoadingBrandsRef.current = isLoadingBrands;
    isLoadingMaxCodeRef.current = isLoadingMaxCode;
    isLoadingCFOPsRef.current = isLoadingCFOPs;
  }, [isLoadingCategories, isLoadingBrands, isLoadingMaxCode, isLoadingCFOPs]);

  // Gerenciar loading inicial
  useEffect(() => {
    if (!open) {
      hasCheckedInitialLoadRef.current = false;
      setIsSectionLoading(false);
      // AIDEV-NOTE: Limpar seções visitadas quando modal fecha
      visitedSectionsMapRef.current.delete(productKey);
      return;
    }

    const hasLoadedForThisKey = loadedDataMapRef.current.get(productKey) || false;

    if (hasLoadedForThisKey) {
      if (isInitialLoadingState || isLoadingRef.current) {
        setIsInitialLoadingState(false);
        isLoadingRef.current = false;
      }
      return;
    }

    if (!hasCheckedInitialLoadRef.current) {
      isLoadingRef.current = true;
      setIsInitialLoadingState(true);
      loadedDataMapRef.current.set(productKey, false);
      hasCheckedInitialLoadRef.current = true;
    }
  }, [open, productKey, isInitialLoadingState]);

  // Verificar quando dados iniciais estão carregados
  useEffect(() => {
    const hasLoadedForThisKey = loadedDataMapRef.current.get(productKey) || false;
    if (hasLoadedForThisKey) {
      return;
    }

    if (!open || !isLoadingRef.current) {
      return;
    }

    const initialDataLoaded =
      !isLoadingCategoriesRef.current &&
      !isLoadingBrandsRef.current &&
      !isLoadingMaxCodeRef.current;

    if (initialDataLoaded) {
      const timeoutId = setTimeout(() => {
        isLoadingRef.current = false;
        setIsInitialLoadingState(false);
        loadedDataMapRef.current.set(productKey, true);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [open, productKey]);

  // Gerenciar loading de seções específicas
  useEffect(() => {
    if (!open || isInitialLoadingState) {
      setIsSectionLoading(false);
      return;
    }

    const hasLoadedForThisKey = loadedDataMapRef.current.get(productKey) || false;
    
    // AIDEV-NOTE: Rastrear seções já visitadas para evitar loading desnecessário
    if (!visitedSectionsMapRef.current.has(productKey)) {
      visitedSectionsMapRef.current.set(productKey, new Set());
    }
    const visitedSections = visitedSectionsMapRef.current.get(productKey)!;
    
    // AIDEV-NOTE: Verificar se já visitou ANTES de marcar como visitada
    // Isso garante que na primeira visita mostra loading se necessário,
    // mas nas próximas visitas não mostra loading
    const hasVisitedSection = visitedSections.has(activeSection);
    
    // AIDEV-NOTE: Marcar seção como visitada após verificação
    visitedSections.add(activeSection);
    
    let isSectionDataLoading = false;

    if (activeSection === 'tributos-fiscais') {
      // AIDEV-NOTE: Só mostrar loading se nunca visitou esta seção E CFOPs estão carregando
      isSectionDataLoading = !hasVisitedSection && isLoadingCFOPs;
    } else if (activeSection === 'dados-gerais') {
      // AIDEV-NOTE: NUNCA mostrar loading em dados-gerais após primeira visita
      // Esta é a seção padrão e sempre deve estar pronta após carregamento inicial
      isSectionDataLoading = false;
    } else if (activeSection === 'estoque') {
      // AIDEV-NOTE: Só mostrar loading se nunca visitou esta seção E estoque está carregando
      isSectionDataLoading = !hasVisitedSection && isLoadingStockState;
    } else {
      // AIDEV-NOTE: Outras seções não precisam de loading específico
      isSectionDataLoading = false;
    }

    // AIDEV-NOTE: Usar requestAnimationFrame para evitar piscar visual
    // Isso garante que a mudança de estado acontece no próximo frame de renderização
    const rafId = requestAnimationFrame(() => {
      setIsSectionLoading(isSectionDataLoading);
    });

    return () => cancelAnimationFrame(rafId);
  }, [
    open,
    activeSection,
    isLoadingCFOPs,
    isLoadingStockState,
    isInitialLoadingState,
    productKey,
  ]);

  // Callback para mudanças de loading de estoque
  const onStockLoadingChange = (isLoading: boolean) => {
    setIsLoadingStockState(isLoading);
  };

  return {
    isInitialLoading: isInitialLoadingState,
    isSectionLoading,
    onStockLoadingChange,
  };
}

