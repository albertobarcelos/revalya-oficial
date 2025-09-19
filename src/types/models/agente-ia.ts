/**
 * Tipos para o Agente de IA de Cobrança
 * Usado para configurar o comportamento do agente virtual por tenant
 */

export type AgenteIA = {
  id: string;
  tenant_id: string;
  nome_agente: string;
  tom_de_voz: string;
  exemplos_de_mensagem: string[];
  usa_emojis: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type AgenteIAInsert = Omit<AgenteIA, 'id' | 'criado_em' | 'atualizado_em'>;

export type AgenteIAUpdate = Partial<AgenteIAInsert> & { id: string };

// Modelo para pré-visualização na UI
export type AgenteIAPreview = {
  nome: string;
  estilo: string;
  mensagens: string[];
  usaEmojis: boolean;
};

/**
 * Tipos para integração entre Agente IA e Régua de Cobrança
 */
export type AgenteIAMensagemRegua = {
  id: string;
  tenant_id: string;
  etapa_regua_id: string;
  mensagem: string;
  variaveis_contexto: string[];
  personalizado: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type AgenteIAMensagemReguaInsert = Omit<AgenteIAMensagemRegua, 'id' | 'criado_em' | 'atualizado_em'>;

export type AgenteIAMensagemReguaUpdate = Partial<AgenteIAMensagemReguaInsert> & { id: string };

// Tipo para exibição integrada de etapas com mensagens do agente
export type EtapaReguaComAgente = {
  etapa_id: string;
  posicao: number;
  gatilho: 'antes_vencimento' | 'no_vencimento' | 'apos_vencimento';
  dias: number;
  canal: 'whatsapp' | 'email' | 'sms';
  mensagem_agente: string;
  personalizado: boolean;
  ativo: boolean;
};
