/**
 * AIDEV-NOTE: Centralização de todas as tags de mensagem do sistema
 * 
 * Este arquivo é a única fonte de verdade para todas as tags disponíveis.
 * Qualquer alteração aqui será refletida automaticamente em:
 * - Tela de templates (TemplateDialog)
 * - Envio manual de mensagens (BulkMessageDialog, SendMessageModal)
 * - Processamento de tags (messageUtils, edge function)
 * - Páginas de templates e integrações
 * - Diálogo de tags disponíveis
 * 
 * IMPORTANTE: Sempre atualize este arquivo ao adicionar/remover tags!
 * 
 * @example
 * // Adicionar uma nova tag:
 * {
 *   key: 'NOVA_TAG',
 *   value: '{nova.tag}',
 *   label: 'Nova Tag',
 *   category: 'cobranca',
 *   color: '#ff0000',
 *   description: 'Descrição da tag'
 * }
 * 
 * @example
 * // Usar em componentes:
 * import { getTagsForTagSelector, extractTagsFromMessage } from '@/utils/messageTags';
 * const tags = getTagsForTagSelector();
 * const foundTags = extractTagsFromMessage(message);
 */

/**
 * Definição completa de cada tag disponível
 */
export interface TagDefinition {
  /** Chave única da tag (ex: 'CLIENTE_NOME') */
  key: string;
  /** Valor da tag para uso em mensagens (ex: '{cliente.nome}') */
  value: string;
  /** Label amigável para exibição (ex: 'Nome do Cliente') */
  label: string;
  /** Categoria da tag para organização */
  category: 'cliente' | 'cobranca' | 'dias';
  /** Cor para exibição em badges (opcional) */
  color?: string;
  /** Descrição da tag (opcional) */
  description?: string;
}

/**
 * AIDEV-NOTE: Definição completa de todas as tags disponíveis
 * Ordem importa: será a ordem de exibição na UI
 */
export const TAG_DEFINITIONS: TagDefinition[] = [
  // Tags de Cliente
  {
    key: 'CLIENTE_NOME',
    value: '{cliente.nome}',
    label: 'Nome do Cliente',
    category: 'cliente',
    color: '#3b82f6',
    description: 'Primeiro nome do cliente formatado'
  },
  {
    key: 'CLIENTE_EMPRESA',
    value: '{cliente.empresa}',
    label: 'Empresa do Cliente',
    category: 'cliente',
    color: '#10b981',
    description: 'Nome da empresa do cliente'
  },
  {
    key: 'CLIENTE_EMAIL',
    value: '{cliente.email}',
    label: 'Email',
    category: 'cliente',
    color: '#ef4444',
    description: 'Email do cliente'
  },
  {
    key: 'CLIENTE_CPF',
    value: '{cliente.cpf}',
    label: 'CPF',
    category: 'cliente',
    color: '#f59e0b',
    description: 'CPF ou CNPJ do cliente'
  },
  {
    key: 'CLIENTE_TELEFONE',
    value: '{cliente.telefone}',
    label: 'Telefone',
    category: 'cliente',
    color: '#8b5cf6',
    description: 'Telefone do cliente'
  },
  
  // Tags de Cobrança
  {
    key: 'COBRANCA_VALOR',
    value: '{cobranca.valor}',
    label: 'Valor da Cobrança',
    category: 'cobranca',
    color: '#06b6d4',
    description: 'Valor formatado em R$'
  },
  {
    key: 'COBRANCA_VENCIMENTO',
    value: '{cobranca.vencimento}',
    label: 'Data de Vencimento',
    category: 'cobranca',
    color: '#f97316',
    description: 'Data de vencimento formatada (dd/mm/yyyy)'
  },
  {
    key: 'COBRANCA_DESCRICAO',
    value: '{cobranca.descricao}',
    label: 'Descrição',
    category: 'cobranca',
    color: '#84cc16',
    description: 'Descrição da cobrança'
  },
  {
    key: 'COBRANCA_CODIGO_BARRAS',
    value: '{cobranca.codigoBarras}',
    label: 'Código de Barras',
    category: 'cobranca',
    color: '#14b8a6',
    description: 'Código de barras do boleto'
  },
  {
    key: 'COBRANCA_PIX_COPIA_COLA',
    value: '{cobranca.pix_copia_cola}',
    label: 'PIX Copia e Cola',
    category: 'cobranca',
    color: '#10b981',
    description: 'Chave PIX para copiar e colar'
  },
  {
    key: 'COBRANCA_LINK',
    value: '{cobranca.link}',
    label: 'Link Pagamento',
    category: 'cobranca',
    color: '#3b82f6',
    description: 'Link para pagamento online'
  },
  {
    key: 'COBRANCA_LINK_BOLETO',
    value: '{cobranca.link_boleto}',
    label: 'Link Boleto',
    category: 'cobranca',
    color: '#8b5cf6',
    description: 'Link para visualizar/download do boleto'
  },
  
  // Tags de Dias
  {
    key: 'DIAS_ATE_VENCIMENTO',
    value: '{dias.ateVencimento}',
    label: 'Dias até Vencimento',
    category: 'dias',
    color: '#22c55e',
    description: 'Número de dias até o vencimento'
  },
  {
    key: 'DIAS_APOS_VENCIMENTO',
    value: '{dias.aposVencimento}',
    label: 'Dias após Vencimento',
    category: 'dias',
    color: '#ef4444',
    description: 'Número de dias após o vencimento'
  },
];

/**
 * AIDEV-NOTE: Objeto AVAILABLE_TAGS para compatibilidade com código existente
 * Usado principalmente no TemplateDialog
 */
export const AVAILABLE_TAGS = TAG_DEFINITIONS.reduce((acc, tag) => {
  acc[tag.key] = tag.value;
  return acc;
}, {} as Record<string, string>) as {
  [K in typeof TAG_DEFINITIONS[number]['key']]: typeof TAG_DEFINITIONS[number]['value'];
};

/**
 * AIDEV-NOTE: Lista de tags no formato para TagSelector (BulkMessageDialog)
 */
export function getTagsForTagSelector() {
  return TAG_DEFINITIONS.map(tag => ({
    id: tag.value,
    name: tag.label,
    color: tag.color || '#6b7280'
  }));
}

/**
 * AIDEV-NOTE: Lista de tags no formato para Select (SendMessageModal)
 */
export function getTagsForSelect() {
  return TAG_DEFINITIONS.map(tag => ({
    label: tag.label,
    value: tag.value
  }));
}

/**
 * AIDEV-NOTE: Obter todas as tags de uma categoria específica
 */
export function getTagsByCategory(category: TagDefinition['category']) {
  return TAG_DEFINITIONS.filter(tag => tag.category === category);
}

/**
 * AIDEV-NOTE: Obter definição de uma tag pelo seu valor
 */
export function getTagByValue(value: string): TagDefinition | undefined {
  return TAG_DEFINITIONS.find(tag => tag.value === value);
}

/**
 * AIDEV-NOTE: Obter definição de uma tag pela sua chave
 */
export function getTagByKey(key: string): TagDefinition | undefined {
  return TAG_DEFINITIONS.find(tag => tag.key === key);
}

/**
 * AIDEV-NOTE: Validar se uma tag existe no sistema
 */
export function isValidTag(tagValue: string): boolean {
  return TAG_DEFINITIONS.some(tag => tag.value === tagValue);
}

/**
 * AIDEV-NOTE: Extrair todas as tags de uma mensagem
 */
export function extractTagsFromMessage(message: string): string[] {
  const tagPattern = /\{[\w\.]+\}/g;
  const matches = message.match(tagPattern) || [];
  return [...new Set(matches)]; // Remove duplicatas
}

/**
 * AIDEV-NOTE: Validar se todas as tags em uma mensagem são válidas
 */
export function validateMessageTags(message: string): {
  valid: boolean;
  invalidTags: string[];
} {
  const tags = extractTagsFromMessage(message);
  const invalidTags = tags.filter(tag => !isValidTag(tag));
  
  return {
    valid: invalidTags.length === 0,
    invalidTags
  };
}

