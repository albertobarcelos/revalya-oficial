/**
 * Componente da etapa de Importação
 * Integrado com a nova solução de bulk insert otimizada
 * 
 * @module ImportingStep
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  X,
  Download,
  Edit,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BulkInsertProgress } from '@/components/ui/BulkInsertProgress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { DetailedError } from '@/types/bulkInsertTypes';
// AIDEV-NOTE: Importando hooks para obter tenantId e userId
import { useTenant } from '@/core/tenant/UnifiedTenantProvider';
import { useAuth } from '@/core/auth/AuthProvider';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
// AIDEV-NOTE: Importando novo sistema de inserção em lote
import { useBulkInsert } from '@/hooks/useBulkInsert';

interface ImportingStepProps {
  selectedRecords: any[];
  fieldMappings: any[];
  onImportComplete: (result: any) => void;
  onBack: () => void;
  onClose: () => void;
  onRejectedRecords?: (rejectedRecords: any[]) => void;
}

type ImportStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'partial';

export const ImportingStep: React.FC<ImportingStepProps> = ({
  selectedRecords,
  fieldMappings,
  onImportComplete,
  onBack,
  onClose,
  onRejectedRecords
}) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [ignoredErrors, setIgnoredErrors] = useState<Set<string>>(new Set());
  const [editingError, setEditingError] = useState<DetailedError | null>(null);
  const [viewingError, setViewingError] = useState<DetailedError | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  
  const { tenant } = useTenant();
  const { user } = useAuth();

  // AIDEV-NOTE: Função para ignorar erro específico
  const handleIgnoreError = (error: DetailedError) => {
    const newIgnored = new Set(ignoredErrors);
    newIgnored.add(error.id);
    setIgnoredErrors(newIgnored);
    
    toast.success(`Erro ignorado: ${error.userMessage}`);
    console.log('⏭️ Erro ignorado:', error);
  };

  // AIDEV-NOTE: Função para tentar novamente um erro específico
  const handleRetryError = async (error: DetailedError) => {
    if (!error.originalData) {
      toast.error('Dados originais não disponíveis para retry');
      return;
    }

    try {
      toast.loading('Tentando novamente...', { id: 'retry-error' });
      
      // Preparar dados para retry
      const retryData = [error.originalData];
      
      // Executar retry usando o mesmo serviço
      await insertCustomers(retryData);
      
      toast.success('Registro processado com sucesso!', { id: 'retry-error' });
      
    } catch (retryError) {
      console.error('Erro no retry:', retryError);
      toast.error('Falha ao tentar novamente', { id: 'retry-error' });
    }
  };

  // AIDEV-NOTE: Função para abrir modal de edição
  const handleEditError = (error: DetailedError) => {
    if (!error.originalData) {
      toast.error('Dados originais não disponíveis para edição');
      return;
    }
    
    setEditingError(error);
    setEditFormData({ ...error.originalData });
  };

  // AIDEV-NOTE: Função para salvar edição e tentar novamente
  const handleSaveEdit = async () => {
    if (!editingError) return;

    try {
      toast.loading('Salvando correção...', { id: 'save-edit' });
      
      // Executar insert com dados corrigidos
      await insertCustomers([editFormData]);
      
      toast.success('Registro corrigido e processado!', { id: 'save-edit' });
      setEditingError(null);
      setEditFormData({});
      
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast.error('Falha ao salvar correção', { id: 'save-edit' });
    }
  };

  // AIDEV-NOTE: Função para visualizar detalhes do erro
  const handleViewErrorDetails = (error: DetailedError) => {
    setViewingError(error);
  };

  // AIDEV-NOTE: Função para exportar erros para CSV
  const handleExportErrors = () => {
    if (!result || result.errors.length === 0) {
      toast.error('Nenhum erro para exportar');
      return;
    }

    try {
      // Filtrar erros não ignorados
      const errorsToExport = result.errors.filter(error => !ignoredErrors.has(error.id));
      
      if (errorsToExport.length === 0) {
        toast.error('Todos os erros foram ignorados');
        return;
      }

      // Preparar dados para CSV
      const csvData = errorsToExport.map(error => ({
        'ID do Erro': error.id,
        'Categoria': error.category,
        'Severidade': error.severity,
        'Mensagem': error.userMessage,
        'Campo': error.field || 'N/A',
        'Linha': error.rowIndex !== undefined ? error.rowIndex + 1 : 'N/A',
        'Ação Sugerida': error.suggestedAction || 'N/A',
        'Pode Tentar Novamente': error.canRetry ? 'Sim' : 'Não',
        'Pode Ignorar': error.canIgnore ? 'Sim' : 'Não',
        'Dados Originais': error.originalData ? JSON.stringify(error.originalData) : 'N/A'
      }));

      // Converter para CSV
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escapar aspas e quebras de linha
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `erros-importacao-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${errorsToExport.length} erros exportados para CSV`);
      
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Falha ao exportar erros');
    }
  };
  
  // AIDEV-NOTE: Usando o novo hook de bulk insert
  const {
    insertCustomers,
    isInserting,
    progress,
    result,
    error: bulkError
  } = useBulkInsert({
    onSuccess: (result) => {
      console.log('✅ Bulk insert concluído:', result);
      if (result.errors.length === 0) {
        setStatus('success');
      } else if (result.processedRecords > 0) {
        setStatus('partial');
      } else {
        setStatus('error');
      }
    },
    onError: (error) => {
      console.error('❌ Erro no bulk insert:', error);
      setStatus('error');
    }
  });

  // AIDEV-NOTE: Preparar dados para inserção em lote
  const prepareDataForBulkInsert = async (records: any[]) => {
    if (!tenant?.id || !user?.id) {
      console.error('❌ Tenant ou usuário não encontrado para preparação dos dados');
      return [];
    }

    // AIDEV-NOTE: Obter tenant_users.id para o created_by (foreign key correta)
    const { getTenantUserId } = await import('@/utils/tenantUserUtils');
    const tenantUserId = await getTenantUserId(user.id, tenant.id);
    
    if (!tenantUserId) {
      console.error('❌ Não foi possível obter tenant_users.id para o usuário atual');
      throw new Error('Usuário não tem acesso válido ao tenant atual');
    }

    return records.map(record => {
      // AIDEV-NOTE: Debug logs para investigar problema de mapeamento
      console.log('🔍 [DEBUG] Record structure:', record);
      console.log('🔍 [DEBUG] fieldMappings:', fieldMappings);
      console.log('🔍 [DEBUG] sourceData keys:', Object.keys(record.sourceData));
      console.log('🔍 [DEBUG] sourceData content:', record.sourceData);
      console.log('🔍 [DEBUG] mappedData content:', record.mappedData);
      
      // Debug específico para fieldMappings
      fieldMappings.forEach((mapping, index) => {
        console.log(`🔍 [DEBUG] Mapping ${index}:`, {
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          sourceValue: record.sourceData[mapping.sourceField],
          mappedValue: record.mappedData[mapping.targetField]
        });
      });
      
      const preparedRecord: any = {
        // Campos obrigatórios do sistema
        tenant_id: tenant.id,
        created_by: tenantUserId, // Usando tenant_users.id em vez de user.id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // AIDEV-NOTE: Mapear campos baseado no fieldMappings (sourceField -> targetField)
      // CORREÇÃO: Usar record.sourceData em vez de record diretamente
      fieldMappings.forEach(mapping => {
        if (mapping.sourceField && mapping.targetField && record.sourceData && record.sourceData[mapping.sourceField] !== undefined) {
          let value = record.sourceData[mapping.sourceField];
          
          console.log(`🔧 [FIX] Mapeando ${mapping.sourceField} -> ${mapping.targetField}:`, value);
          
          // Conversões específicas
          if (mapping.targetField === 'cpf_cnpj' && value) {
            value = value.toString().replace(/\D/g, '');
          }
          
          if (mapping.targetField === 'email' && value) {
            value = value.toString().toLowerCase().trim();
          }
          
          if (mapping.targetField === 'name' && value) {
            value = value.toString().trim();
          }
          
          preparedRecord[mapping.targetField] = value;
        }
      });
      
      // Garantir campos obrigatórios
      if (!preparedRecord.name) {
        preparedRecord.name = preparedRecord.nome || record.sourceData?.name || 'Nome não informado';
      }
      
      // Garantir que o nome não seja vazio
      if (!preparedRecord.name || preparedRecord.name.trim() === '') {
        preparedRecord.name = 'Cliente Importado';
      }
      
      console.log('🔧 [FIX] Registro preparado final:', preparedRecord);
      
      return preparedRecord;
    }).filter(record => record.name && record.name.trim() !== ''); // Filtrar registros sem nome
  };

  // AIDEV-NOTE: Executar inserção em lote
  const executeBulkInsert = async () => {
    if (!tenant?.id || !user?.id) {
      console.error('❌ Tenant ou usuário não encontrado');
      setStatus('error');
      return;
    }

    try {
      setStatus('processing');
      
      const preparedData = await prepareDataForBulkInsert(selectedRecords);
      console.log('📋 Dados preparados para inserção:', preparedData.length, 'registros');
      
      await insertCustomers(preparedData, {
        batchSize: 50,
        upsert: true
      });
      
    } catch (error) {
      console.error('❌ Erro na execução do bulk insert:', error);
      setStatus('error');
    }
  };

  // AIDEV-NOTE: Iniciar importação automaticamente
  useEffect(() => {
    if (selectedRecords.length > 0 && status === 'idle') {
      executeBulkInsert();
    }
  }, [selectedRecords, status]);

  // AIDEV-NOTE: Atualizar status baseado no hook useBulkInsert
  useEffect(() => {
    if (isInserting) {
      setStatus('processing');
    } else if (result) {
      if (result.errors.length === 0) {
        setStatus('success');
      } else if (result.processedRecords > 0) {
        setStatus('partial');
      } else {
        setStatus('error');
      }
    } else if (bulkError) {
      setStatus('error');
    }
  }, [isInserting, result, bulkError]);

  // AIDEV-NOTE: Renderizar cards de resultado baseado no novo sistema
  const renderResultCards = () => {
    if (!result || (status !== 'success' && status !== 'error' && status !== 'partial')) {
      return null;
    }

    const { processedRecords = 0, errors = [] } = result;
    const totalRecords = selectedRecords.length;
    const successCount = processedRecords - errors.length;
    const errorCount = errors.length;

    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total de registros */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
          <div className="text-sm text-blue-700">Total</div>
        </div>
        
        {/* Sucessos */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{successCount}</div>
          <div className="text-sm text-green-700">Sucessos</div>
        </div>
        
        {/* Erros */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          <div className="text-sm text-red-700">Erros</div>
        </div>
      </div>
    );
  };

  // AIDEV-NOTE: Obter cor do status
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'partial': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // AIDEV-NOTE: Obter ícone do status
  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'partial': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'processing': return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      default: return <Download className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2"
        >
          {getStatusIcon()}
          <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
            {status === 'uploading' && 'Enviando Arquivo...'}
            {status === 'processing' && 'Processando Clientes...'}
            {status === 'success' && 'Importação Concluída!'}
            {status === 'error' && 'Erro na Importação'}
            {status === 'partial' && 'Importação Parcial'}
            {status === 'idle' && 'Preparando Importação...'}
          </h2>
        </motion.div>
        
        <p className="text-muted-foreground">
          {status === 'uploading' && `Enviando ${selectedRecords.length} registros para processamento`}
          {status === 'processing' && `Processando ${selectedRecords.length} registros selecionados`}
          {status === 'success' && 'Todos os clientes foram importados com sucesso'}
          {status === 'error' && 'Ocorreu um erro durante a importação'}
          {status === 'partial' && 'Alguns registros foram importados com sucesso'}
          {status === 'idle' && 'Iniciando processo de importação...'}
        </p>
      </div>

      {/* Progress Section */}
      <Card>
        <CardContent className="pt-6">
          {/* Componente de progresso do bulk insert */}
          <BulkInsertProgress 
            isLoading={isInserting}
            progress={progress}
            result={result}
            error={bulkError}
            onRetryError={handleRetryError}
            onIgnoreError={handleIgnoreError}
            onEditError={handleEditError}
            onViewErrorDetails={handleViewErrorDetails}
            onExportErrors={handleExportErrors}
          />
          
          {/* Cards de resultado */}
          {renderResultCards()}
          
          {/* Detalhes dos erros */}
          {result && result.errors.length > 0 && (
            <div className="mt-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {bulkError?.data?.name || 'Erros encontrados'}
                    </p>
                    <p className="text-sm">
                      {bulkError?.message || `${result.errors.length} registro(s) não puderam ser processados.`}
                    </p>
                    {result.errors.slice(0, 3).map((error, index) => (
                      <div key={index} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-200">
                        {error.message || error.toString()}
                      </div>
                    ))}
                    {result.errors.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        ... e mais {result.errors.length - 3} erro(s)
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isInserting}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex gap-2">
          {(status === 'error' || status === 'partial') && (
            <Button
              variant="outline"
              onClick={executeBulkInsert}
              disabled={isInserting}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          )}
          
          {(status === 'success' || status === 'error' || status === 'partial') && (
            <Button
              onClick={() => {
                const successCount = result ? result.processedRecords - result.errors.length : 0;
                const errorCount = result ? result.errors.length : 0;
                const errors = result ? result.errors : [];
                
                onImportComplete({
                  success: successCount,
                  errors: errorCount,
                  details: errors
                });
              }}
              className="flex items-center gap-2"
            >
              {status === 'success' ? 'Concluir' : 'Fechar'}
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Edição de Erro */}
      <Dialog open={!!editingError} onOpenChange={(open) => !open && setEditingError(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Corrigir Registro com Erro
            </DialogTitle>
            <DialogDescription>
              Corrija os dados abaixo e tente processar novamente.
            </DialogDescription>
          </DialogHeader>
          
          {editingError && (
            <div className="space-y-4">
              {/* Informações do erro */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Erro: {editingError.userMessage}
                </p>
                {editingError.suggestedAction && (
                  <p className="text-xs text-red-600">
                    Sugestão: {editingError.suggestedAction}
                  </p>
                )}
              </div>

              {/* Formulário de edição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(editFormData).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Label>
                    <Input
                      id={key}
                      value={String(value || '')}
                      onChange={(e) => setEditFormData(prev => ({
                        ...prev,
                        [key]: e.target.value
                      }))}
                      className={editingError.field === key ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                ))}
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingError(null)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>
                  Salvar e Processar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Erro */}
      <Dialog open={!!viewingError} onOpenChange={(open) => !open && setViewingError(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do Erro
            </DialogTitle>
          </DialogHeader>
          
          {viewingError && (
            <div className="space-y-4">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">ID do Erro</Label>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">{viewingError.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Categoria</Label>
                  <Badge variant="outline" className="mt-1">
                    {viewingError.category}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Severidade</Label>
                  <Badge 
                    variant={viewingError.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="mt-1"
                  >
                    {viewingError.severity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Linha</Label>
                  <p className="text-sm">{viewingError.rowIndex !== undefined ? viewingError.rowIndex + 1 : 'N/A'}</p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Mensagem para o Usuário</Label>
                  <p className="text-sm p-3 bg-blue-50 border border-blue-200 rounded">
                    {viewingError.userMessage}
                  </p>
                </div>
                
                {viewingError.suggestedAction && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Ação Sugerida</Label>
                    <p className="text-sm p-3 bg-green-50 border border-green-200 rounded">
                      {viewingError.suggestedAction}
                    </p>
                  </div>
                )}
              </div>

              {/* Dados originais */}
              {viewingError.originalData && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Dados Originais</Label>
                  <Textarea
                    value={JSON.stringify(viewingError.originalData, null, 2)}
                    readOnly
                    className="font-mono text-xs h-32 bg-gray-50"
                  />
                </div>
              )}

              {/* Opções */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Pode tentar novamente:</span>
                  <Badge variant={viewingError.canRetry ? 'default' : 'secondary'}>
                    {viewingError.canRetry ? 'Sim' : 'Não'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Pode ignorar:</span>
                  <Badge variant={viewingError.canIgnore ? 'default' : 'secondary'}>
                    {viewingError.canIgnore ? 'Sim' : 'Não'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportingStep;