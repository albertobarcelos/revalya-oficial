// AIDEV-NOTE: Tipos e interfaces para o sistema de integração de canais
// Responsabilidade única: definições de tipos para canais de comunicação

export type ConnectionStatus = 
  | 'disconnected' 
  | 'connected' 
  | 'loading' 
  | 'scanning' 
  | 'connecting' 
  | 'syncing' 
  | 'paired' 
  | 'timeout' 
  | 'conflict';

export type CanalType = 'whatsapp' | 'sms' | 'email' | 'twilio';

export interface CanalIntegrationProps {
  tenantId: string;
  tenantSlug: string;
  onToggle?: (canal: string, enabled: boolean) => void;
}

export interface CanalState {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  twilio: boolean;
}

export interface LoadingState {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  twilio: boolean;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  integration_type: string;
  is_enabled: boolean;
  connection_status: string;
  instance_name?: string;
  api_url?: string;
  api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConnectionResult {
  success: boolean;
  qrCode?: string;
  error?: string;
}

export interface CanalCardProps {
  canal: CanalType;
  isActive: boolean;
  isLoading: boolean;
  connectionStatus?: ConnectionStatus;
  onToggle: (canal: CanalType) => void;
  onCardClick: (canal: CanalType) => void;
}

export interface QRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string | null;
  isLoading: boolean;
  connectionStatus: ConnectionStatus;
  onConnect: () => void;
}

export interface StatusBadgeProps {
  status: ConnectionStatus;
  isActive: boolean;
}