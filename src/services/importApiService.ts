import { supabase } from '../lib/supabase';

// AIDEV-NOTE: Usando cliente Supabase autenticado do projeto para respeitar RLS

// AIDEV-NOTE: Interface para resposta de upload
export interface ImportUploadResponse {
  success: boolean;
  jobId: string;
  totalRecords: number;
  message: string;
}

// AIDEV-NOTE: Interface para status do job
export interface ImportJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors: any[];
  filename: string;
  createdAt: string;
  updatedAt: string;
  estimatedTimeRemaining?: number;
}

// AIDEV-NOTE: Interface para histórico de importações
export interface ImportHistoryItem {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  successCount: number;
  errorCount: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
  fileSize: number;
}

// AIDEV-NOTE: Interface para resposta paginada do histórico
export interface ImportHistoryResponse {
  items: ImportHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// AIDEV-NOTE: Interface para parâmetros de filtro do histórico
export interface ImportHistoryFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  startDate?: string;
  endDate?: string;
}

class ImportApiService {
  // AIDEV-NOTE: URL base das Edge Functions do Supabase
  private baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  // AIDEV-NOTE: Obter token de autenticação
  private async getAuthToken(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      throw new Error('Usuário não autenticado');
    }
    
    return session.access_token;
  }

  // AIDEV-NOTE: Obter dados do usuário atual
  private async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error('Usuário não autenticado');
    }
    
    return user;
  }

  // AIDEV-NOTE: Fazer upload de arquivo para importação usando Supabase Edge Function
  async uploadFile(file: File, tenantId: string, userId: string, fieldMappings?: any[]): Promise<{ jobId: string; estimatedTime: number }> {
    // AIDEV-NOTE: Debug logs para verificar fieldMappings no service
    console.log('🔍 [DEBUG][importApiService] uploadFile chamado com:', {
      fileName: file.name,
      fileSize: file.size,
      tenantId: tenantId,
      userId: userId,
      fieldMappingsCount: fieldMappings?.length || 0,
      fieldMappings: fieldMappings,
      hasFieldMappings: !!fieldMappings && fieldMappings.length > 0
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenantId', tenantId);
    formData.append('userId', userId);
    
    // AIDEV-NOTE: Adicionar fieldMappings se fornecido
    if (fieldMappings && fieldMappings.length > 0) {
      const fieldMappingsJson = JSON.stringify(fieldMappings);
      formData.append('fieldMappings', fieldMappingsJson);
      
      console.log('🔍 [DEBUG][importApiService] fieldMappings adicionados ao FormData:', {
        fieldMappingsJson: fieldMappingsJson,
        formDataHasFieldMappings: formData.has('fieldMappings')
      });
    } else {
      console.log('⚠️ [WARNING][importApiService] Nenhum fieldMapping fornecido ou array vazio');
    }
    
    // AIDEV-NOTE: Contar registros estimados baseado no tamanho do arquivo
    const estimatedRecords = Math.ceil(file.size / 100); // Estimativa simples
    formData.append('recordCount', estimatedRecords.toString());

    try {
      const token = await this.getAuthToken();
      
      // AIDEV-NOTE: Usar userId passado como parâmetro para garantir consistência multi-tenant
      console.log(`[AUDIT] Upload de arquivo - Tenant: ${tenantId}, User: ${userId}, File: ${file.name}`);
      
      const response = await fetch(`${this.baseUrl}/import-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'x-user-id': userId
        },
        body: formData
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText.trim()) {
        throw new Error('Resposta vazia do servidor');
      }

      const data = JSON.parse(responseText);
      
      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      return {
        jobId: data.jobId,
        estimatedTime: data.estimatedTime
      };
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  }

  // AIDEV-NOTE: Consultar status de um job de importação diretamente da tabela
  async getJobStatus(jobId: string): Promise<ImportJobStatus> {
    try {
      console.log('🔍 [ImportApiService] Buscando status do job:', jobId);

      // AIDEV-NOTE: Consultar diretamente a tabela import_jobs via Supabase
      // Removendo .single() para evitar erro PGRST116 quando não há resultados
      const { data: jobs, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId);

      if (error) {
        console.error('❌ Erro na consulta Supabase:', error);
        throw new Error(`Erro ao consultar job: ${error.message}`);
      }

      if (!jobs || jobs.length === 0) {
        console.warn('⚠️ Job não encontrado:', jobId);
        throw new Error('Job não encontrado');
      }

      const job = jobs[0]; // Pegar o primeiro (e único) resultado

      console.log('✅ [ImportApiService] Job encontrado:', job);

      // AIDEV-NOTE: Mapear dados da tabela para interface ImportJobStatus
      const jobStatus: ImportJobStatus = {
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        totalRecords: job.total_records || 0,
        processedRecords: job.processed_records || 0,
        successCount: job.success_count || 0,
        errorCount: job.error_count || 0,
        errors: job.errors || [],
        filename: job.filename || '',
        createdAt: job.created_at,
        updatedAt: job.updated_at
      };

      return jobStatus;
    } catch (error) {
      console.error('❌ Erro ao buscar status do job:', error);
      throw error;
    }
  }

  // AIDEV-NOTE: Monitorar progresso de um job com polling
  async monitorJob(
    jobId: string, 
    onProgress: (status: ImportJobStatus) => void,
    intervalMs: number = 2000
  ): Promise<ImportJobStatus> {
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const status = await this.getJobStatus(jobId);
          onProgress(status);

          if (status.status === 'completed' || status.status === 'failed') {
            resolve(status);
          } else {
            setTimeout(checkStatus, intervalMs);
          }
        } catch (error) {
          reject(error);
        }
      };

      checkStatus();
    });
  }

  // AIDEV-NOTE: Obter histórico de importações
  async getImportHistory(filters: ImportHistoryFilters = {}): Promise<ImportHistoryResponse> {
    try {
      const token = await this.getAuthToken();
      
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`${this.baseUrl}/history?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar histórico');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      throw error;
    }
  }

  // AIDEV-NOTE: Validar arquivo antes do upload
  validateFile(file: File): { valid: boolean; error?: string } {
    // AIDEV-NOTE: Verificar tamanho máximo (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Arquivo muito grande. Tamanho máximo: 10MB'
      };
    }

    // AIDEV-NOTE: Verificar tipo de arquivo
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
      return {
        valid: false,
        error: 'Tipo de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)'
      };
    }

    return { valid: true };
  }

  // AIDEV-NOTE: Formatar tempo estimado para exibição
  formatEstimatedTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // AIDEV-NOTE: Formatar tamanho de arquivo para exibição
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // AIDEV-NOTE: Obter cor do status para UI
  getStatusColor(status: ImportJobStatus['status']): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  // AIDEV-NOTE: Obter ícone do status
  getStatusIcon(status: ImportJobStatus['status']): string {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  }
}

// AIDEV-NOTE: Exportar instância singleton
export const importApiService = new ImportApiService();
export default importApiService;