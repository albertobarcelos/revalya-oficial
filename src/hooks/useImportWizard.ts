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
    invalidRecords: [],
    rejectedRecords: [] // AIDEV-NOTE: Inicializar array de registros rejeitados
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
    console.log('🔍 [DEBUG][useImportWizard] initializeSourceData chamada:', {
      sourceType,
      dataLength: data.length,
      firstRecord: data[0],
      hasIdInFirstRecord: data[0]?.id ? 'SIM' : 'NÃO'
    });
    
    // AIDEV-NOTE: Armazenar dados completos para uso posterior
    setFullSourceData(data);

    // AIDEV-NOTE: Usar apenas o primeiro registro para mapeamento
    const sampleData = data.slice(0, 1);
    
    const sourceData: SourceData[] = sampleData.map(item => {
      if (sourceType === 'asaas') {
        // Mapear dados do Asaas para formato padrão
        const processedItem = {
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
          asaas_customer_id: item.id || '', // AIDEV-NOTE: Preservar ID original do Asaas para mapeamento
          observations: item.observations || ''
        };

        console.log('🔍 [DEBUG][useImportWizard] Dados processados do Asaas:', {
          originalItem: item,
          processedItem,
          fieldsPreserved: Object.keys(processedItem).filter(key => processedItem[key])
        });

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
    const initialMappings: FieldMapping[] = SYSTEM_FIELDS.map(field => {
      let sourceField: string | null = null;
      let isAutoMapped = false;
      let isImmutable = false;

      if (sourceType === 'asaas') {
        // Mapeamento automático para dados do Asaas
        switch (field.key) {
          case 'name':
            sourceField = 'name';
            isAutoMapped = true;
            break;
          case 'email':
            sourceField = 'email';
            isAutoMapped = true;
            break;
          case 'cpf_cnpj':
            sourceField = 'cpf_cnpj';
            isAutoMapped = true;
            break;
          case 'company':
            sourceField = 'company';
            isAutoMapped = true;
            break;
          case 'address':
            sourceField = 'address';
            isAutoMapped = true;
            break;
          case 'address_number':
            sourceField = 'address_number';
            isAutoMapped = true;
            break;
          case 'complement':
            sourceField = 'complement';
            isAutoMapped = true;
            break;
          case 'neighborhood':
            sourceField = 'province';
            isAutoMapped = true;
            break;
          case 'city':
            sourceField = 'city';
            isAutoMapped = true;
            break;
          case 'state':
            sourceField = 'state';
            isAutoMapped = true;
            break;
          case 'postal_code':
            sourceField = 'postal_code';
            isAutoMapped = true;
            break;
          case 'country':
            sourceField = 'country';
            isAutoMapped = true;
            break;
          case 'customer_asaas_id':
            sourceField = 'asaas_customer_id'; // AIDEV-NOTE: Mapear para o campo preservado
            isAutoMapped = true;
            isImmutable = false; // AIDEV-NOTE: Permitir que o usuário desmapeie se desejar
            break;
          case 'additional_info':
            sourceField = 'observations';
            isAutoMapped = true;
            break;
          case 'celular_whatsapp':
            // AIDEV-NOTE: Mapeamento automático inteligente para celular_whatsapp (com fallback)
            const mobilePhoneData = sourceData[0]?.mobilePhone?.trim();
            const phoneData = sourceData[0]?.phone?.trim();
            
            // AIDEV-NOTE: Priorizar mobilePhone, mas fazer fallback para phone se mobilePhone estiver vazio
            sourceField = mobilePhoneData ? 'mobilePhone' : (phoneData ? 'phone' : 'mobilePhone');
            isAutoMapped = true;
            
            console.log('🔍 [DEBUG][useImportWizard] Mapeamento celular_whatsapp:', {
              mobilePhoneData,
              phoneData,
              selectedSourceField: sourceField
            });
            break;
          case 'phone':
            // AIDEV-NOTE: Mapeamento automático para phone -> phone (telefone fixo) - apenas se não foi usado no celular
            const mobilePhoneDataForPhone = sourceData[0]?.mobilePhone?.trim();
            const phoneDataForPhone = sourceData[0]?.phone?.trim();
            
            // AIDEV-NOTE: Se mobilePhone está vazio e phone foi usado para celular, deixar phone vazio
            // Se mobilePhone tem dados, phone pode ser mapeado normalmente
            const shouldMapPhone = mobilePhoneDataForPhone || !phoneDataForPhone;
            sourceField = shouldMapPhone ? 'phone' : null;
            isAutoMapped = true;
            
            console.log('🔍 [DEBUG][useImportWizard] Mapeamento phone:', {
              mobilePhoneDataForPhone,
              phoneDataForPhone,
              shouldMapPhone,
              selectedSourceField: sourceField
            });
            break;
        }
      }

      return {
        sourceField,
        targetField: field.key,
        isAutoMapped,
        isImmutable
      };
    });

    console.log('🔍 [DEBUG][useImportWizard] Mapeamentos iniciais criados:', {
      totalMappings: initialMappings.length,
      autoMappedCount: initialMappings.filter(m => m.isAutoMapped).length,
      mappingsWithSource: initialMappings.filter(m => m.sourceField).length,
      detailedMappings: initialMappings.filter(m => m.sourceField).map(m => ({
        source: m.sourceField,
        target: m.targetField,
        autoMapped: m.isAutoMapped
      }))
    });

    setImportState(prev => ({
      ...prev,
      sourceType,
      sourceData,
      fieldMappings: initialMappings,
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
    console.log('🔍 [DEBUG][useImportWizard] processRecords iniciado:', {
      sourceDataLength: sourceData.length,
      fullSourceDataLength: fullSourceData.length,
      fieldMappingsCount: fieldMappings.length,
      sourceType: importState.sourceType
    });

    // AIDEV-NOTE: Processar todos os dados usando o mapeamento confirmado
    const allSourceData: SourceData[] = fullSourceData.map((item, index) => {
      if (importState.sourceType === 'asaas') {
        // Mapear dados do Asaas para formato padrão
        const processedItem = {
          id: item.id || uuidv4(),
          asaas_customer_id: item.id || '', // AIDEV-NOTE: Preservar ID original do Asaas para mapeamento
          name: item.name || '',
          email: item.email || '',
          phone: item.phone || '', // AIDEV-NOTE: Preservar campo phone original
          mobilePhone: item.mobilePhone || '', // AIDEV-NOTE: Preservar campo mobilePhone original separadamente
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
          observations: item.observations || ''
        };

        // AIDEV-NOTE: Log detalhado apenas para os primeiros 3 registros
        if (index < 3) {
          console.log(`🔍 [DEBUG][useImportWizard] Processamento Asaas item ${index}:`, {
            originalItem: item,
            processedItem,
            fieldsWithData: Object.keys(processedItem).filter(key => processedItem[key])
          });
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

    console.log('🔍 [DEBUG][useImportWizard] allSourceData processado:', {
      totalRecords: allSourceData.length,
      firstRecord: allSourceData[0],
      availableFields: Object.keys(allSourceData[0] || {})
    });

    const processedRecords: ProcessedRecord[] = allSourceData.map((source, index) => {
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

      // AIDEV-NOTE: Log detalhado do mapeamento apenas para os primeiros 3 registros
      if (index < 3) {
        console.log(`🔍 [DEBUG][useImportWizard] Mapeamento aplicado item ${index}:`, {
          sourceData: source,
          appliedMappings: fieldMappings.filter(m => m.sourceField && m.targetField).map(m => ({
            source: m.sourceField,
            target: m.targetField,
            sourceValue: source[m.sourceField!],
            mappedValue: mappedData[m.targetField!]
          })),
          finalMappedData: mappedData
        });
      }

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

    console.log('🔍 [DEBUG][useImportWizard] processRecords finalizado:', {
      totalProcessed: processedRecords.length,
      validCount: processedRecords.filter(r => r.isValid).length,
      invalidCount: processedRecords.filter(r => !r.isValid).length,
      firstValidRecord: processedRecords.find(r => r.isValid),
      firstInvalidRecord: processedRecords.find(r => !r.isValid)
    });

    return processedRecords;
  }, [fullSourceData, importState.sourceType, config]);

  // AIDEV-NOTE: Processar dados completos após confirmação do mapeamento
  const processAllRecords = useCallback(async () => {
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
      invalidRecords: [],
      rejectedRecords: [] // AIDEV-NOTE: Resetar registros rejeitados
    });
    setSelectedRecords([]);
  }, []);

  // AIDEV-NOTE: Função para definir registros rejeitados e navegar para o step de correção
  const setRejectedRecords = useCallback((rejectedRecords: any[]) => {
    setImportState(prev => ({
      ...prev,
      rejectedRecords,
      step: 'rejected'
    }));
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
    setConfig,
    setRejectedRecords // AIDEV-NOTE: Exportar função para definir registros rejeitados
  };
}