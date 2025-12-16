// AIDEV-NOTE: Constantes para o sistema de integração de canais
// Responsabilidade única: valores fixos e configurações do sistema

export const MODULE_NAME = 'CanalIntegration';

export const CANAL_LABELS = {
  whatsapp: 'Whatsapp - QRCode',
  sms: 'SMS',
  email: 'Email',
  twilio: 'Twilio'
} as const;

export const CANAL_DESCRIPTIONS = {
  whatsapp: 'Integre seu WhatsApp com QR Code através da Evolution API',
  sms: 'Envie mensagens SMS para seus clientes',
  email: 'Configure envio de emails automáticos',
  twilio: 'Integração com serviços Twilio'
} as const;

export const CONNECTION_STATUS_LABELS = {
  disconnected: 'Desconectado',
  connected: 'Conectado',
  loading: 'Carregando',
  scanning: 'Escaneando',
  connecting: 'Conectando',
  syncing: 'Sincronizando',
  paired: 'Pareado',
  timeout: 'Timeout',
  conflict: 'Conflito Detectado'
} as const;

// AIDEV-NOTE: Alias para compatibilidade com componentes existentes
export const STATUS_LABELS = CONNECTION_STATUS_LABELS;

export const TIMEOUTS = {
  SAFETY_TIMEOUT: 15000, // 15 segundos
  STATUS_CHECK_INTERVAL: 3000, // 3 segundos
  MAX_STATUS_CHECKS: 60, // máximo de verificações
  LOADING_SIMULATION: 1000 // 1 segundo para simular loading
} as const;

export const TOAST_MESSAGES = {
  WHATSAPP_ACTIVATING: {
    title: "Ativando WhatsApp...",
    description: "Por favor, aguarde enquanto processamos sua solicitação."
  },
  WHATSAPP_DEACTIVATING: {
    title: "Desativando WhatsApp...",
    description: "Por favor, aguarde enquanto processamos sua solicitação."
  },
  WHATSAPP_ACTIVATED: {
    title: "WhatsApp ativado",
    description: "Clique em \"Conectar Whatsapp - QRCode\" para escanear o QR Code e finalizar a configuração."
  },
  WHATSAPP_DEACTIVATED: {
    title: "WhatsApp desativado",
    description: "Sua integração com WhatsApp foi desativada com sucesso."
  },
  WHATSAPP_CONNECTED: {
    title: "WhatsApp conectado",
    description: "Seu WhatsApp já está conectado e pronto para uso."
  },
  QR_GENERATED: {
    title: "QR Code gerado",
    description: "Escaneie o QR Code com seu WhatsApp para conectar."
  },
  FEATURE_COMING_SOON: {
    title: "Funcionalidade em breve",
    description: "estará disponível em breve."
  },
  ACCESS_DENIED: {
    title: "Acesso negado",
    description: "Você não tem permissão para esta operação."
  },
  WHATSAPP_ERROR: {
    title: "Erro no WhatsApp",
    description: "Não foi possível realizar a operação com o WhatsApp."
  },
  ERROR_GENERIC: {
    title: "Erro ao processar solicitação",
    description: "Ocorreu um erro inesperado."
  }
} as const;
