/**
 * Componente para a etapa de mapeamento de campos
 * 
 * @module FieldMappingStep
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye,
  Link2,
  Unlink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldMapping, SourceData } from '@/types/import';
import { useTenantContext } from '@/hooks/useTenantContext';

// AIDEV-NOTE: Campos reais da tabela customers do Revalya (em português)
// Excluindo campos de sistema: id, tenant_id, created_at, updated_at
// AIDEV-NOTE: Campo 'active' removido - todos clientes importados entram como ativos por padrão
const REVALYA_CUSTOMER_FIELDS = [
  { key: 'name', label: 'Nome', required: true, type: 'text' },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ', required: true, type: 'cpf_cnpj' },
  { key: 'email', label: 'Email', required: false, type: 'email' },
  { key: 'celular_whatsapp', label: 'Celular e WhatsApp', required: false, type: 'phone' }, // AIDEV-NOTE: Campo celular/WhatsApp movido acima do telefone
  { key: 'phone', label: 'Telefone', required: false, type: 'phone' },
  { key: 'company', label: 'Empresa', required: false, type: 'text' },
  { key: 'address', label: 'Endereço', required: false, type: 'text' },
  { key: 'address_number', label: 'Número do Endereço', required: false, type: 'text' },
  { key: 'neighborhood', label: 'Bairro', required: false, type: 'text' },
  { key: 'city', label: 'Cidade', required: false, type: 'text' },
  { key: 'state', label: 'Estado', required: false, type: 'text' },
  { key: 'country', label: 'País', required: false, type: 'text' },
  { key: 'postal_code', label: 'CEP', required: false, type: 'text' },
  { key: 'complement', label: 'Complemento', required: false, type: 'text' },
  { key: 'additional_info', label: 'Informações Adicionais', required: false, type: 'text' },
  { key: 'customer_asaas_id', label: 'ID_Externo', required: false, type: 'text' },
];

// AIDEV-NOTE: Mapeamento de tradução dos campos da API Asaas para português
const ASAAS_FIELD_TRANSLATIONS: Record<string, string> = {
  // Informações básicas
  'name': 'Nome do cliente',
  'email': 'Email',
  'phone': 'Telefone',
  'mobilePhone': 'Celular',
  'cpf_cnpj': 'CPF/CNPJ',
  'personType': 'Tipo de pessoa',
  'company': 'Empresa',
  'groupName': 'Nome do grupo',
  
  // Endereço
  'address': 'Endereço',
  'address_number': 'Número',
  'complement': 'Complemento',
  'neighborhood': 'Bairro',
  'province': 'Bairro',
  'city': 'Cidade',
  'cityName': 'Cidade',
  'state': 'Estado',
  'country': 'País',
  'postal_code': 'CEP',
  
  // Informações adicionais
  'observations': 'Observações',
  'notificationDisabled': 'Notificações desabilitadas',
  'additionalEmails': 'Emails adicionais',
  'municipalInscription': 'Inscrição municipal',
  'stateInscription': 'Inscrição estadual',
  'canDelete': 'Pode deletar',
  'cannotBeDeletedReason': 'Motivo não pode deletar',
  'canEdit': 'Pode editar',
  'cannotEditReason': 'Motivo não pode editar',
  
  // Datas
  'dateCreated': 'Data de criação',
  'birthDate': 'Data de nascimento',
  
  // IDs e referências - AIDEV-NOTE: Campo 'id' traduzido para 'ID_Externo' para mapeamento visual
  'asaas_customer_id': 'ID_Cliente',
  'object': 'Tipo de objeto',
  'deleted': 'Deletado'
};

interface FieldMappingStepProps {
  sourceData: SourceData[];
  fieldMappings: FieldMapping[];
  onUpdateMapping: (sourceField: string, targetField: string | null) => void;
  onNext: () => void;
  canProceed: boolean;
  mappingProgress: { mapped: number; total: number };
  fullSourceData: any[]; // AIDEV-NOTE: Dados completos para mostrar estatísticas
}

export function FieldMappingStep({
  sourceData,
  fieldMappings,
  onUpdateMapping,
  onNext,
  canProceed,
  mappingProgress,
  fullSourceData
}: FieldMappingStepProps) {
  const { currentTenant } = useTenantContext();

  // AIDEV-NOTE: Extrair campos únicos dos dados de origem (incluindo 'id' para Asaas)
  const sourceFields = Object.keys(sourceData[0] || {});
  
  console.log('🔍 [DEBUG][FieldMappingStep] Campos disponíveis:', {
    sourceFields,
    sourceDataLength: sourceData.length,
    firstRecord: sourceData[0],
    hasIdField: sourceFields.includes('id')
  });

  // AIDEV-NOTE: Debug dos fieldMappings recebidos
  console.log('🔍 [DEBUG][FieldMappingStep] Field Mappings recebidos:', {
    fieldMappings,
    mappingsCount: fieldMappings.length,
    idMapping: fieldMappings.find(m => m.sourceField === 'id'),
    customerAsaasIdMapping: fieldMappings.find(m => m.targetField === 'customer_asaas_id')
  });

  // AIDEV-NOTE: Estado para armazenar nomes de cidades resolvidos (não mais necessário)
  // Removido pois agora usamos apenas cityName que já contém o nome da cidade
  const { tenant } = useTenantContext(); // AIDEV-NOTE: Obter tenant_id para requisições do Asaas

  // AIDEV-NOTE: Função para obter dados de exemplo de um campo específico
  const getSampleData = (sourceFieldName: string): string => {
    // DEBUG: Log temporário para verificar dados
    if (sourceFieldName === 'id') {
      console.log('DEBUG - getSampleData para campo "id":', {
        sourceFieldName,
        sourceDataLength: sourceData.length,
        firstRecord: sourceData[0],
        hasIdField: sourceData[0] && 'id' in sourceData[0],
        idValue: sourceData[0] && sourceData[0]['id']
      });
    }
    
    // Para todos os campos, procurar em múltiplos registros
    for (let i = 0; i < sourceData.length; i++) {
      const record = sourceData[i];
      if (record && record[sourceFieldName]) {
        const value = String(record[sourceFieldName]).trim();
        if (value) {
          return value;
        }
      }
    }
    
    return 'Sem dados';
  };
  
  // AIDEV-NOTE: Lógica de resolução de cidades removida
  // Não é mais necessária pois usamos apenas cityName que já contém o nome da cidade

  // AIDEV-NOTE: Traduzir nome do campo da API Asaas para português
  const translateFieldName = (fieldName: string): string => {
    return ASAAS_FIELD_TRANSLATIONS[fieldName] || fieldName;
  };

  // AIDEV-NOTE: Verificar se um campo do sistema já está mapeado
  const isSystemFieldMapped = (systemFieldKey: string): boolean => {
    return fieldMappings.some(mapping => 
      mapping.targetField === systemFieldKey && 
      mapping.sourceField !== null && 
      mapping.sourceField !== undefined
    );
  };

  // AIDEV-NOTE: Obter campo de origem mapeado para um campo do sistema
  const getMappedSourceField = (systemFieldKey: string): string => {
    const mapping = fieldMappings.find(m => m.targetField === systemFieldKey);
    return mapping?.sourceField || '';
  };

  // AIDEV-NOTE: Obter campo do sistema mapeado para um campo de origem (para o Select)
  // AIDEV-NOTE: Função para obter o campo do sistema mapeado para um campo de origem
  const getMappedSystemField = (sourceField: string): string | null => {
    const mapping = fieldMappings.find(m => m.sourceField === sourceField);
    return mapping?.targetField ?? null;
  };

  // AIDEV-NOTE: Verificar se um campo de origem tem mapeamento imutável
  const isFieldImmutable = (sourceField: string): boolean => {
    const mapping = fieldMappings.find(m => m.sourceField === sourceField);
    return mapping?.isImmutable === true;
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Vincule os campos do seu arquivo com os campos do Revalya para importar os dados corretamente.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <span>Visualizando 1 registro de exemplo</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-600">{fullSourceData.length}</span>
              <span>registros serão importados após confirmação</span>
            </div>
          </div>
        </div>
        
        {/* Checkbox para primeira linha */}
        <div className="flex items-center gap-2 text-sm">
          <input 
            type="checkbox" 
            id="header-row"
            className="rounded border-gray-300"
            defaultChecked
          />
          <label htmlFor="header-row" className="text-muted-foreground">
            Minha planilha possui cabeçalho na primeira linha
          </label>
        </div>
      </div>

      {/* Table Layout */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30">
          <div className="grid grid-cols-12 gap-4 p-3 text-sm font-medium text-muted-foreground">
            <div className="col-span-1"></div>
            <div className="col-span-2">Coluna do seu arquivo</div>
            <div className="col-span-3">Pré-visualização</div>
            <div className="col-span-4">Campo no Revalya</div>
            <div className="col-span-2 text-center">Ação</div>
          </div>
        </div>
        
        <div className="divide-y">
          {sourceFields.map((field, index) => {
            const mappedSystemField = getMappedSystemField(field);
            const systemField = REVALYA_CUSTOMER_FIELDS.find(f => f.key === mappedSystemField);
            const sampleData = getSampleData(field);
            
            return (
              <motion.div
                key={field}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/20 transition-colors"
              >
                {/* Checkbox */}
                <div className="col-span-1 flex justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                
                {/* Campo da fonte */}
                <div className="col-span-2">
                  <span className="text-sm font-medium">{translateFieldName(field)}</span>
                </div>
                
                {/* Pré-visualização */}
                <div className="col-span-3">
                  <span className="text-sm text-muted-foreground truncate block">
                    {sampleData}
                  </span>
                </div>
                
                {/* Campo no Hiper (Select) */}
                <div className="col-span-4">
                  {(() => {
                    const mappedSystemField = getMappedSystemField(field);
                    const selectValue = mappedSystemField ?? "__unmapped__";
                    const isImmutable = isFieldImmutable(field);
                    
                    // AIDEV-NOTE: Debug específico para campo 'id'
                    if (field === 'id') {
                      console.log('🔍 [DEBUG][FieldMappingStep] Campo ID:', {
                        field,
                        mappedSystemField,
                        selectValue,
                        isImmutable
                      });
                    }
                    
                    // AIDEV-NOTE: Se o campo é imutável, mostrar badge especial
                    if (isImmutable) {
                      const displayLabel = REVALYA_CUSTOMER_FIELDS.find(f => f.key === mappedSystemField)?.label || mappedSystemField;
                      
                      return (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2 h-8 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-md shadow-sm"
                        >
                          <Link2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {displayLabel}
                          </span>
                          <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            Automático
                          </Badge>
                        </motion.div>
                      );
                    }
                    
                    return (
                      <Select
                        value={selectValue}
                        onValueChange={(value) => {
                          const newValue = value === "__unmapped__" ? null : value;
                          onUpdateMapping(field, newValue);
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecionar campo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unmapped__">
                            <span className="text-muted-foreground">Não mapear</span>
                          </SelectItem>
                          {REVALYA_CUSTOMER_FIELDS.map(sysField => (
                            <SelectItem 
                              key={sysField.key} 
                              value={sysField.key}
                              disabled={isSystemFieldMapped(sysField.key) && mappedSystemField !== sysField.key}
                            >
                              {sysField.label}
                              {sysField.required && <span className="text-red-500 ml-1">*</span>}
                              {isSystemFieldMapped(sysField.key) && mappedSystemField !== sysField.key && (
                                <span className="text-xs text-muted-foreground ml-2">(já mapeado)</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
                
                {/* Ação */}
                <div className="col-span-2 flex justify-center">
                  {isFieldImmutable(field) ? (
                    // AIDEV-NOTE: Para campos imutáveis, mostrar ícone de link fixo
                    <div className="flex items-center justify-center h-7 px-3 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <Link2 className="h-3 w-3" />
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onUpdateMapping(field, null)}
                      className="h-7 px-3 text-xs"
                    >
                      <Unlink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Progress and Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <Badge variant={canProceed ? "default" : "secondary"}>
            {mappingProgress.mapped}/{mappingProgress.total} campos obrigatórios mapeados
          </Badge>
          {canProceed && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </div>
        
        <Button 
          onClick={onNext}
          disabled={!canProceed}
          className="min-w-[120px]"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Próximo
        </Button>
      </div>
    </div>
  );
}