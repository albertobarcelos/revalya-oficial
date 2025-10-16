// AIDEV-NOTE: Hook para gerenciar estado dos canais de comunicação
// Responsabilidade única: controle de estado ativo/inativo dos canais

import { useState, useEffect, useCallback } from 'react';
import { CanalState, LoadingState, CanalType } from '../types';
import { logService } from '@/services/logService';
import { MODULE_NAME } from '../constants';

interface UseCanaisStateProps {
  tenantId?: string;
  isAuthorized?: boolean;
  tenantData?: any;
  onToggle?: (canal: string, enabled: boolean) => void;
}

export function useCanaisState(
  tenantId?: string,
  isAuthorized?: boolean,
  tenantData?: any,
  onToggle?: (canal: string, enabled: boolean) => void
) {
  const [canaisAtivos, setCanaisAtivos] = useState<CanalState>({
    whatsapp: false,
    sms: false,
    email: false,
    twilio: false,
  });

  const [loadingCanais, setLoadingCanais] = useState<LoadingState>({
    whatsapp: false,
    sms: false,
    email: false,
    twilio: false,
  });

  // AIDEV-NOTE: Inicializar estados dos canais baseado nos dados do tenant
  useEffect(() => {
    if (tenantData?.integrations) {
      logService.info(MODULE_NAME, 'Inicializando estados dos canais', { tenantId });
      logService.debug(MODULE_NAME, 'Dados das integrações:', tenantData.integrations);
      
      const newCanaisAtivos: CanalState = {
        whatsapp: false,
        sms: false,
        email: false,
        twilio: false,
      };

      tenantData.integrations.forEach((integration: any) => {
        if (integration.integration_type in newCanaisAtivos) {
          // AIDEV-NOTE: Usar apenas is_active que é o campo correto na tabela tenant_integrations
          const isActive = integration.is_active || false;
          logService.debug(MODULE_NAME, `Canal ${integration.integration_type}: is_active=${integration.is_active}, resultado=${isActive}`);
          newCanaisAtivos[integration.integration_type as CanalType] = isActive;
        }
      });

      logService.debug(MODULE_NAME, 'Estados finais dos canais:', newCanaisAtivos);
      setCanaisAtivos(newCanaisAtivos);
    } else {
      logService.warn(MODULE_NAME, 'Dados do tenant não disponíveis ou sem integrações', { tenantData });
    }
  }, [tenantData, tenantId]);

  const updateCanalState = useCallback((canal: CanalType, isActive: boolean) => {
    setCanaisAtivos(prev => ({ ...prev, [canal]: isActive }));
  }, []);

  const updateLoadingState = useCallback((canal: CanalType, isLoading: boolean) => {
    setLoadingCanais(prev => ({ ...prev, [canal]: isLoading }));
  }, []);

  const resetLoadingStates = useCallback(() => {
    setLoadingCanais({
      whatsapp: false,
      sms: false,
      email: false,
      twilio: false,
    });
  }, []);

  // AIDEV-NOTE: Função handleToggle para gerenciar mudanças de estado dos canais
  const handleToggle = useCallback(async (canal: CanalType, novoEstado: boolean) => {
    if (!isAuthorized || !tenantId) {
      logService.warn(MODULE_NAME, 'Tentativa de toggle sem autorização', { canal, tenantId });
      return;
    }

    logService.info(MODULE_NAME, `Toggle do canal ${canal}`, { 
      canal, 
      novoEstado, 
      tenantId 
    });

    // Atualizar estado local imediatamente para feedback visual
    updateCanalState(canal, novoEstado);
    
    // Chamar callback externo se fornecido
    if (onToggle) {
      onToggle(canal, novoEstado);
    }
  }, [isAuthorized, tenantId, onToggle, updateCanalState]);

  return {
    canaisAtivos,
    loadingCanais,
    updateCanalState,
    updateLoadingState,
    resetLoadingStates,
    handleToggle,
    setCanaisAtivos,
    setLoadingCanais
  };
}