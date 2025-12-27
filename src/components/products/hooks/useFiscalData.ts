/**
 * Hook para gerenciar dados fiscais do produto
 * 
 * AIDEV-NOTE: Estado isolado para dados fiscais
 */

import { useState, useEffect, useRef } from 'react';
import type { Product } from '@/hooks/useSecureProducts';
import type { FiscalData } from '../types/product-form.types';

const initialFiscalData: FiscalData = {
  ncm: '',
  // AIDEV-NOTE: ncm_id removido - NCM validado via API FocusNFe
  cest: '',
  // AIDEV-NOTE: cest_id removido - CEST não possui API pública
  product_type_id: null,
  cfop_id: null,
  origem: '0',
  cst_icms: '',
  cst_icms_id: null,
  cst_ipi: '',
  cst_ipi_id: null,
  cst_pis: '',
  cst_pis_id: null,
  cst_cofins: '',
  cst_cofins_id: null,
  use_default_pis_cofins: false,
  aliquota_pis: '',
  aliquota_cofins: '',
  cst_ibs_cbs: '',
  cclass_trib: '',
};

export function useFiscalData(product?: Product | null) {
  const [fiscalData, setFiscalData] = useState<FiscalData>(initialFiscalData);
  
  // AIDEV-NOTE: Ref para rastrear o último produto processado e evitar atualizações desnecessárias
  const lastProductIdRef = useRef<string | null>(null);

  // AIDEV-NOTE: Inicializar com dados do produto se estiver em modo edição
  // AIDEV-NOTE: Atualizar apenas quando o produto realmente mudar (comparar ID)
  useEffect(() => {
    // AIDEV-NOTE: Se não há produto, resetar dados fiscais
    if (!product || !product.id) {
      // AIDEV-NOTE: Resetar apenas se não estava vazio antes (evita atualizações desnecessárias)
      if (lastProductIdRef.current !== null) {
        setFiscalData(initialFiscalData);
        lastProductIdRef.current = null;
      }
      return;
    }
    
    // AIDEV-NOTE: Se o produto não mudou (mesmo ID), não atualizar
    // Isso evita múltiplas atualizações quando o objeto product muda mas é o mesmo produto
    if (lastProductIdRef.current === product.id) {
      return;
    }
    
    // AIDEV-NOTE: Atualizar dados fiscais apenas quando produto realmente mudou
    lastProductIdRef.current = product.id;
    
    setFiscalData({
      ncm: (product as any).ncm || '',
      // AIDEV-NOTE: ncm_id removido - NCM validado via API FocusNFe
      cest: (product as any).cest || '',
      // AIDEV-NOTE: cest_id removido - CEST não possui API pública
      product_type_id: (product as any).product_type_id || null,
      cfop_id: (product as any).cfop_id || null,
      origem: (product as any).origem || '0',
      cst_icms: (product as any).cst_icms || '',
      cst_icms_id: (product as any).cst_icms_id || null,
      cst_ipi: (product as any).cst_ipi || '',
      cst_ipi_id: (product as any).cst_ipi_id || null,
      cst_pis: (product as any).cst_pis || '',
      cst_pis_id: (product as any).cst_pis_id || null,
      cst_cofins: (product as any).cst_cofins || '',
      cst_cofins_id: (product as any).cst_cofins_id || null,
      use_default_pis_cofins: (product as any).use_default_pis_cofins || false,
      aliquota_pis: (product as any).aliquota_pis != null ? String((product as any).aliquota_pis) : '',
      aliquota_cofins: (product as any).aliquota_cofins != null ? String((product as any).aliquota_cofins) : '',
      cst_ibs_cbs: (product as any).cst_ibs_cbs || '',
      cclass_trib: (product as any).cclass_trib || '',
    });
  }, [product?.id]); // AIDEV-NOTE: Usar apenas product.id como dependência para evitar atualizações desnecessárias

  const updateFiscalData = (data: Partial<FiscalData>) => {
    setFiscalData(prev => ({ ...prev, ...data }));
  };

  const resetFiscalData = () => {
    setFiscalData(initialFiscalData);
    // AIDEV-NOTE: Resetar ref para permitir que dados sejam carregados novamente na próxima abertura
    lastProductIdRef.current = null;
  };

  return {
    fiscalData,
    updateFiscalData,
    resetFiscalData,
  };
}

