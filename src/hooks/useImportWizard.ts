/**
 * Hook para gerenciar o estado do wizard de importação
 * 
 * @module useImportWizard
 */

import { useState, useMemo, useCallback } from 'react';
import type { 
  ImportState, 
  FieldMapping, 
  SourceData, 
  ProcessedRecord,
  ImportConfig 
} from '@/types/import';
import { SYSTEM_FIELDS } from '@/types/import';
import { validateRecord, autoFormatField } from '@/utils/importValidation';
import { v4 as uuidv4 } from 'uuid';
import { useTenantContext } from '@/hooks/useTenantContext';

export function useImportWizard() {
  const { tenant } = useTenantContext(); // AIDEV-NOTE: Obter tenant_id para requisições do Asaas
  
  // AIDEV-NOTE: Estado principal do wizard
  const [importState, setImportState] = useState<ImportState>({
    step: 'mapping',
    sourceType: 'asaas',
    sourceData: [],
    fieldMappings: [],
    processedRecords: [],
    validRecords: [],
    invalidRecords: []
  });

  // AIDEV-NOTE: Dados completos para carregamento após mapeamento
  const [fullSourceData, setFullSourceData] = useState<any[]>([]);

  // AIDEV-NOTE: Configurações de importação
  const [config, setConfig] = useState<ImportConfig>({
    allowInvalidRecords: false,
    skipEmptyFields: true,
    autoCorrectFormats: true
  });

  // AIDEV-NOTE: Estado para registros selecionados
  const [selectedRecords, setSelectedRecords] = useState<ProcessedRecord[]>([]);

  // AIDEV-NOTE: Inicializar dados de origem (apenas 1 registro para mapeamento)
  const initializeSourceData = useCallback((data: any[], sourceType: 'asaas' | 'csv') => {
    // AIDEV-NOTE: Armazenar dados completos para uso posterior
    setFullSourceData(data);
    
    // AIDEV-NOTE: Usar apenas o primeiro registro para mapeamento
    const sampleData = data.slice(0, 1);
    
    const sourceData: SourceData[] = sampleData.map(item => {
      if (sourceType === 'asaas') {
        // Mapear dados do Asaas para formato padrão
        const processedItem = {
          id: item.id || uuidv4(),
          name: item.name || '',
          email: item.email || '',
          phone: item.phone || '', // AIDEV-NOTE: Preservar campo phone original
          mobilePhone: item.mobilePhone || '', // AIDEV-NOTE: Preservar campo mobilePhone original
          cpf_cnpj: item.cpfCnpj || '',
          company: item.company || '',
          address: item.address || '',
          address_number: item.addressNumber || '',
          complement: item.complement || '',
          province: item.province || '', // AIDEV-NOTE: Manter campo original province do Asaas
          city: item.cityName || item.city || '',
          state: item.state || '',
          postal_code: item.postalCode || '',
          country: item.country || 'Brasil',
          external_reference: item.externalReference || '',
          observations: item.observations || ''
        };

        // AIDEV-NOTE: Debug específico para investigar problema do campo neighborhood
        if (item.id === 'cus_000136093936') {
          console.log('🔍 [DEBUG] Cliente cus_000136093936 - Dados originais (2ª ocorrência):', {
            id: item.id,
            name: item.name,
            province: item.province,
            neighborhood: item.neighborhood,
            'province || neighborhood': item.province || item.neighborhood || '',
            allFields: Object.keys(item)
          });
          console.log('🔍 [DEBUG] Cliente cus_000136093936 - Dados processados (2ª ocorrência):', processedItem);
        }

        return processedItem;
      } else {
        // Dados do CSV já vêm no formato correto
        return {
          id: uuidv4(),
          ...item
        };
      }
    });

    // AIDEV-NOTE: Criar mapeamentos com mapeamento automático para campos específicos do Asaas
    const emptyMappings: FieldMapping[] = SYSTEM_FIELDS.map(systemField => {
      // AIDEV-NOTE: Mapeamento automático e imutável para customer_asaas_id
      if (systemField.key === 'customer_asaas_id' && sourceType === 'asaas') {
        return {
          sourceField: 'external_reference',
          targetField: systemField.key,
          sampleData: sourceData[0]?.external_reference || '',
          isAutoMapped: true, // AIDEV-NOTE: Marca como mapeamento automático
          isImmutable: true   // AIDEV-NOTE: Impede alteração manual
        };
      }
      
      // AIDEV-NOTE: Mapeamento automático para phone -> phone
      if (systemField.key === 'phone' && sourceType === 'asaas') {
        return {
          sourceField: 'phone',
          targetField: systemField.key,
          sampleData: sourceData[0]?.phone || '',
          isAutoMapped: true, // AIDEV-NOTE: Marca como mapeamento automático
          isImmutable: false  // AIDEV-NOTE: Permite alteração manual se necessário
        };
      }
      
      // AIDEV-NOTE: Mapeamento automático para mobilePhone -> celular_whatsapp
      if (systemField.key === 'celular_whatsapp' && sourceType === 'asaas') {
        return {
          sourceField: 'mobilePhone',
          targetField: systemField.key,
          sampleData: sourceData[0]?.mobilePhone || '',
          isAutoMapped: true, // AIDEV-NOTE: Marca como mapeamento automático
          isImmutable: false  // AIDEV-NOTE: Permite alteração manual se necessário
        };
      }
      
      return {
        sourceField: null,
        targetField: systemField.key,
        sampleData: ''
      };
    });

    setImportState(prev => ({
      ...prev,
      sourceType,
      sourceData,
      fieldMappings: emptyMappings,
      step: 'mapping'
    }));
  }, []);

  // AIDEV-NOTE: Atualizar mapeamento de campo
  const updateFieldMapping = useCallback((sourceField: string, targetField: string | null) => {
    setImportState(prev => {
      // Primeiro, limpar qualquer mapeamento existente para o targetField se não for null
      let updatedMappings = prev.fieldMappings.map(mapping => {
        if (targetField && mapping.targetField === targetField) {
          return { ...mapping, sourceField: null };
        }
        return mapping;
      });

      // Depois, encontrar o mapeamento que tinha esse sourceField e limpar
      updatedMappings = updatedMappings.map(mapping => {
        if (mapping.sourceField === sourceField) {
          return { ...mapping, sourceField: null };
        }
        return mapping;
      });

      // Finalmente, se targetField não for null, mapear o sourceField para o targetField
      if (targetField) {
        updatedMappings = updatedMappings.map(mapping => {
          if (mapping.targetField === targetField) {
            return { ...mapping, sourceField };
          }
          return mapping;
        });
      }
      
      return {
        ...prev,
        fieldMappings: updatedMappings
      };
    });
  }, []);

  // AIDEV-NOTE: Função para processar registros
  const processRecords = useCallback(async (sourceData: SourceData[], fieldMappings: FieldMapping[]): Promise<ProcessedRecord[]> => {
    console.log('🔍 [DEBUG] processRecords - Iniciando processamento de registros');
    console.log('🔍 [DEBUG] sourceData length:', sourceData.length);
    console.log('🔍 [DEBUG] fieldMappings:', fieldMappings);

    // AIDEV-NOTE: Processar todos os dados usando o mapeamento confirmado
    const allSourceData: SourceData[] = fullSourceData.map(item => {
      if (importState.sourceType === 'asaas') {
        // Mapear dados do Asaas para formato padrão
        return {
          id: item.id || uuidv4(),
          name: item.name || '',
          email: item.email || '',
          phone: item.phone || item.mobilePhone || '',
          cpf_cnpj: item.cpfCnpj || '',
          company: item.company || '',
          address: item.address || '',
          address_number: item.addressNumber || '',
          complement: item.complement || '',
          province: item.province || '', // AIDEV-NOTE: Manter campo original province do Asaas
          city: item.city || item.cityName || '',
          state: item.state || '',
          postal_code: item.postalCode || '',
          country: item.country || 'Brasil',
          external_reference: item.externalReference || '',
          observations: item.observations || ''
        };
      } else {
        // Dados do CSV já vêm no formato correto
        return {
          id: uuidv4(),
          ...item
        };
      }
    });

    console.log('🔍 [DEBUG] allSourceData length:', allSourceData.length);
    console.log('🔍 [DEBUG] allSourceData[0]:', allSourceData[0]);

    const processedRecords: ProcessedRecord[] = allSourceData.map(source => {
      // Aplicar mapeamento
      const mappedData: Record<string, string | null> = {};
      
      fieldMappings.forEach(mapping => {
        if (mapping.targetField && mapping.sourceField) {
          let value = source[mapping.sourceField] || null;
          
          // Aplicar formatação automática se habilitada
          if (value && config.autoCorrectFormats) {
            const systemField = SYSTEM_FIELDS.find(f => f.key === mapping.targetField);
            if (systemField) {
              value = autoFormatField(String(value), systemField.type);
            }
          }
          
          mappedData[mapping.targetField] = value;
        }
      });

      // Validar registro
      const validation = validateRecord(mappedData, SYSTEM_FIELDS);

      return {
        id: source.id || uuidv4(),
        sourceData: source,
        mappedData,
        validation,
        isValid: validation.isValid,
        selected: validation.isValid // Selecionar automaticamente apenas registros válidos
      };
    });

    console.log('🔍 [DEBUG] processedRecords length:', processedRecords.length);
    console.log('🔍 [DEBUG] processedRecords[0]:', processedRecords[0]);

    return processedRecords;
  }, [fullSourceData, importState.sourceType, config]);

  // AIDEV-NOTE: Processar dados completos após confirmação do mapeamento
  const processAllRecords = useCallback(async () => {
    console.log('🔍 [DEBUG] processAllRecords - Iniciando processamento');
    console.log('🔍 [DEBUG] importState.sourceData:', importState.sourceData);
    console.log('🔍 [DEBUG] importState.fieldMappings:', importState.fieldMappings);
    
    if (!importState.sourceData.length || !importState.fieldMappings.length) {
      console.error('❌ [ERROR] Dados ou mapeamentos ausentes');
      return;
    }

    setImportState(prev => ({ ...prev, isProcessing: true }));

    try {
      const processedRecords = await processRecords(
        importState.sourceData,
        importState.fieldMappings
      );
      
      console.log('🔍 [DEBUG] processedRecords:', processedRecords);
      
      const validRecords = processedRecords.filter(record => record.isValid);
      const invalidRecords = processedRecords.filter(record => !record.isValid);

      console.log('🔍 [DEBUG] validRecords:', validRecords.length);
      console.log('🔍 [DEBUG] invalidRecords:', invalidRecords.length);

      setImportState(prev => ({
        ...prev,
        processedRecords,
        validRecords,
        invalidRecords,
        step: 'preview',
        isProcessing: false
      }));

      // AIDEV-NOTE: Selecionar automaticamente todos os registros válidos
      setSelectedRecords(validRecords);
    } catch (error) {
      console.error('❌ [ERROR] Erro ao processar registros:', error);
      setImportState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [importState, processRecords]);

  // AIDEV-NOTE: Alternar seleção de registro
  const toggleRecordSelection = useCallback((recordId: string) => {
    setImportState(prev => ({
      ...prev,
      processedRecords: prev.processedRecords.map(record =>
        record.id === recordId 
          ? { ...record, selected: !record.selected }
          : record
      )
    }));
  }, []);

  // AIDEV-NOTE: Selecionar todos os registros válidos
  const selectAllValid = useCallback(() => {
    setImportState(prev => ({
      ...prev,
      processedRecords: prev.processedRecords.map(record => ({
        ...record,
        selected: record.validation.isValid
      }))
    }));
  }, []);

  // AIDEV-NOTE: Desselecionar todos os registros
  const deselectAll = useCallback(() => {
    setImportState(prev => ({
      ...prev,
      processedRecords: prev.processedRecords.map(record => ({
        ...record,
        selected: false
      }))
    }));
  }, []);

  // AIDEV-NOTE: Navegar entre etapas
  const goToStep = useCallback((step: ImportState['step']) => {
    setImportState(prev => ({ ...prev, step }));
  }, []);

  // AIDEV-NOTE: Resetar wizard
  const resetWizard = useCallback(() => {
    setImportState({
      step: 'mapping',
      sourceType: 'asaas',
      sourceData: [],
      fieldMappings: [],
      processedRecords: [],
      validRecords: [],
      invalidRecords: []
    });
    setSelectedRecords([]);
  }, []);

  // AIDEV-NOTE: Computações derivadas
  const mappingProgress = useMemo(() => {
    const totalRequired = SYSTEM_FIELDS.filter(f => f.required).length;
    const mappedRequired = importState.fieldMappings.filter(m => 
      m.targetField && 
      m.sourceField && 
      SYSTEM_FIELDS.find(f => f.key === m.targetField)?.required
    ).length;
    
    return { mapped: mappedRequired, total: totalRequired };
  }, [importState.fieldMappings]);

  const canProceedToPreview = useMemo(() => 
    mappingProgress.mapped === mappingProgress.total,
    [mappingProgress]
  );

  return {
    // Estado
    importState,
    config,
    selectedRecords,
    mappingProgress,
    canProceedToPreview,
    fullSourceData,

    // Ações
    initializeSourceData,
    updateFieldMapping,
    processAllRecords,
    toggleRecordSelection,
    selectAllValid,
    deselectAll,
    goToStep,
    resetWizard,
    setConfig
  };
}