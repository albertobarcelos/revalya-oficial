"use client";

import React from "react";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";
import { useSecureTenantQuery } from "@/hooks/templates/useSecureTenantQuery";
import { logService } from "@/services/logService";

// AIDEV-NOTE: Importações modulares para melhor organização e manutenibilidade
import { CanalIntegrationProps } from './types';
import { MODULE_NAME, CANAL_TYPES } from './constants';
import { 
  useCanaisState, 
  useWhatsAppConnection, 
  useWhatsAppToggle, 
  useStatusMonitoring 
} from './hooks';
import { CanalCard, QRDialog } from './components';

/**
 * AIDEV-NOTE: Componente principal refatorado seguindo princípios de Clean Code
 * - Responsabilidade única: gerencia apenas a orquestração dos módulos
 * - Separação de responsabilidades: lógica extraída para hooks e componentes
 * - Facilidade de manutenção: código modular e testável
 */
export function CanalIntegration({ tenantId, tenantSlug, onToggle }: CanalIntegrationProps) {
  // AIDEV-NOTE: Hooks de segurança para validação de acesso ao tenant
  const { hasAccess: isAuthorized, isLoading: authLoading } = useTenantAccessGuard();
  
  // AIDEV-NOTE: Query segura para buscar dados das integrações do tenant usando RPC
  const { data: tenantData, isLoading: tenantLoading } = useSecureTenantQuery(
    ['tenant-integrations'],
    async (supabase, tenantId) => {
      const { data: integrations, error } = await supabase.rpc('get_tenant_integrations_by_tenant', {
        tenant_uuid: tenantId
      });
      
      if (error) throw error;
      
      return { integrations };
    }
  );

  // AIDEV-NOTE: Hooks modulares para gerenciamento de estado e funcionalidades
  const {
    canaisAtivos,
    loadingCanais,
    handleToggle,
    updateCanalState
  } = useCanaisState(tenantId, isAuthorized, tenantData, onToggle);

  // AIDEV-NOTE: Verificação de segurança para evitar undefined
  const whatsappActive = canaisAtivos?.whatsapp || false;

  const {
    connectionStatus,
    qrCode,
    qrDialogOpen,
    isLoading: whatsappLoading,
    setQrDialogOpen,
    setQrCode,
    setConnectionStatus,
    statusPollingEnabled,
    enableStatusPolling,
    handleConnectWhatsApp,
    resetConnection
  } = useWhatsAppConnection({
    tenantSlug,
    tenantId,
    isAuthorized,
    tenantData,
    integrations: tenantData?.integrations || [],
    updateCanalState
  });

  // AIDEV-NOTE: Hook para monitoramento contínuo do status
  useStatusMonitoring({
    canaisAtivos,
    statusPollingEnabled,
    qrDialogOpen,
    connectionStatus,
    tenantSlug,
    tenantId,
    integrations: tenantData?.integrations || [],
    setConnectionStatus,
    setQrCode,
    setQrDialogOpen,
    updateCanalState,
    enableStatusPolling
  });

  // AIDEV-NOTE: Manipulador de clique nos cards dos canais
  const handleCardClick = (canal: keyof typeof canaisAtivos) => {
    if (canal === 'whatsapp' && whatsappActive) {
      // Se o WhatsApp estiver ativo mas não conectado, abrir o diálogo de QR
      if (['disconnected', 'timeout', 'conflict'].includes(connectionStatus)) {
        handleConnectWhatsApp();
      }
    }
  };

  // AIDEV-NOTE: Loading states para melhor UX - verificação após todos os hooks
  if (authLoading || tenantLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // AIDEV-NOTE: Verificação de autorização - verificação após todos os hooks
  if (!isAuthorized) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Acesso não autorizado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Canais</h2>
          <p className="text-muted-foreground">Configure os canais que você deseja interagir com seu cliente.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* AIDEV-NOTE: Cards dos canais usando componente modular */}
          <CanalCard
            canal="whatsapp"
            isActive={whatsappActive}
            isLoading={loadingCanais?.whatsapp || false}
            connectionStatus={connectionStatus}
            onToggle={handleConnectWhatsApp}
          />

          <CanalCard
            canal="sms"
            isActive={canaisAtivos?.sms || false}
            isLoading={loadingCanais?.sms || false}
            onToggle={handleToggle}
            comingSoon={true}
          />

          <CanalCard
            canal="email"
            isActive={canaisAtivos?.email || false}
            isLoading={loadingCanais?.email || false}
            onToggle={handleToggle}
            comingSoon={true}
          />

          <CanalCard
            canal="twilio"
            isActive={canaisAtivos?.twilio || false}
            isLoading={loadingCanais?.twilio || false}
            onToggle={handleToggle}
            comingSoon={true}
          />
        </div>
      </div>

      {/* AIDEV-NOTE: Dialog modular para QR Code do WhatsApp */}
      <QRDialog
        isOpen={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        qrCode={qrCode}
        isLoading={whatsappLoading}
        connectionStatus={connectionStatus}
        onConnect={handleConnectWhatsApp}
      />
    </>
  );
}
