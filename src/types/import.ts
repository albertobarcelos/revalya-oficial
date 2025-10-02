/**
 * Tipos para o sistema de importação com mapeamento de campos
 * 
 * @module ImportTypes
 */

import type { AsaasCustomer } from './asaas';

// AIDEV-NOTE: Definição dos campos disponíveis no sistema interno
export interface SystemField {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'email' | 'phone' | 'cpf_cnpj' | 'number';
  validation?: (value: string) => boolean;
}

// AIDEV-NOTE: Campos do sistema interno para mapeamento
export const SYSTEM_FIELDS: SystemField[] = [
  { key: 'name', label: 'Nome', required: true, type: 'text' },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ', required: true, type: 'cpf_cnpj' },
  { key: 'email', label: 'Email', required: false, type: 'email' },
  { key: 'celular_whatsapp', label: 'Celular e WhatsApp', required: false, type: 'phone' }, // AIDEV-NOTE: Campo celular/WhatsApp movido acima do telefone
  { key: 'phone', label: 'Telefone', required: false, type: 'phone' },
  { key: 'company', label: 'Empresa', required: false, type: 'text' },
  { key: 'address', label: 'Endereço', required: false, type: 'text' },
  { key: 'address_number', label: 'Número', required: false, type: 'text' },
  { key: 'complement', label: 'Complemento', required: false, type: 'text' },
  { key: 'neighborhood', label: 'Bairro', required: false, type: 'text' },
  { key: 'city', label: 'Cidade', required: false, type: 'text' },
  { key: 'state', label: 'Estado', required: false, type: 'text' },
  { key: 'postal_code', label: 'CEP', required: false, type: 'text' },
  { key: 'country', label: 'País', required: false, type: 'text' },
  { key: 'additional_info', label: 'Informações Adicionais', required: false, type: 'text' },
  { key: 'customer_asaas_id', label: 'ID_Externo', required: false, type: 'text' },
];

// AIDEV-NOTE: Estrutura para mapeamento de campos
export interface FieldMapping {
  sourceField: string | null;
  targetField: string | null;
  sampleData?: string;
  isAutoMapped?: boolean; // AIDEV-NOTE: Indica se o mapeamento foi criado automaticamente
  isImmutable?: boolean;  // AIDEV-NOTE: Impede alteração manual do mapeamento
}

// AIDEV-NOTE: Dados de origem (Asaas ou CSV)
export interface SourceData {
  [key: string]: string | null;
}

// AIDEV-NOTE: Resultado da validação de um registro
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'invalid_format' | 'invalid_value';
}

export interface ValidationWarning {
  field: string;
  message: string;
  type: 'missing_optional' | 'format_suggestion';
}

// AIDEV-NOTE: Registro processado com validação
export interface ProcessedRecord {
  id: string;
  sourceData: SourceData;
  mappedData: Record<string, string | null>;
  validation: ValidationResult;
  selected: boolean;
}

// AIDEV-NOTE: Estado do processo de importação
export interface ImportState {
  step: 'mapping' | 'confirmation' | 'preview' | 'importing' | 'rejected';
  sourceType: 'asaas' | 'csv';
  sourceData: SourceData[];
  fieldMappings: FieldMapping[];
  processedRecords: ProcessedRecord[];
  validRecords: ProcessedRecord[];
  invalidRecords: ProcessedRecord[];
  rejectedRecords?: RejectedRecord[]; // AIDEV-NOTE: Registros rejeitados pela Edge Function
}

// AIDEV-NOTE: Registro rejeitado com detalhes do erro
export interface RejectedRecord {
  row: number;
  data: Record<string, any>;
  error: string;
  field?: string;
  canBeFixed?: boolean; // AIDEV-NOTE: Indica se o erro pode ser corrigido pelo usuário
}

// AIDEV-NOTE: Configuração de importação
export interface ImportConfig {
  allowInvalidRecords: boolean;
  skipEmptyFields: boolean;
  autoCorrectFormats: boolean;
}

// AIDEV-NOTE: Resultado final da importação
export interface ImportResult {
  success: boolean;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errors: string[];
}