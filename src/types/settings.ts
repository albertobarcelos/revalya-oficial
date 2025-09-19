export interface NotificationMessage {
  id: string;
  days: number;
  isBeforeDue: boolean;
  message: string;
  active: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description?: string;
  message: string;
  category: string;
  days_offset: number;
  is_before_due: boolean;
  active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalReceivable: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  chargesByStatus: {
    status: string;
    count: number;
  }[];
  chargesByPriority: {
    priority: string;
    count: number;
  }[];
}

export interface NotificationSettings {
  automaticNotifications: boolean;
  messages: NotificationMessage[];
}

export const AVAILABLE_TAGS = {
  CLIENTE_NOME: '{cliente.nome}',
  CLIENTE_EMAIL: '{cliente.email}',
  CLIENTE_CPF: '{cliente.cpf}',
  CLIENTE_TELEFONE: '{cliente.telefone}',
  COBRANCA_VALOR: '{cobranca.valor}',
  COBRANCA_VENCIMENTO: '{cobranca.vencimento}',
  COBRANCA_DESCRICAO: '{cobranca.descricao}',
  COBRANCA_LINK_PAGAMENTO: '{cobranca.linkPagamento}',
  COBRANCA_CODIGO_BARRAS: '{cobranca.codigoBarras}',
  COBRANCA_PIX: '{cobranca.pix}',
  DIAS_ATE_VENCIMENTO: '{dias.ateVencimento}',
  DIAS_APOS_VENCIMENTO: '{dias.aposVencimento}',
  EMPRESA_NOME: '{empresa.nome}',
  EMPRESA_TELEFONE: '{empresa.telefone}'
} as const;
