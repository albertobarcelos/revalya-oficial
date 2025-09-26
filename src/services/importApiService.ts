import { createClient } from '@supabase/supabase-js';

// AIDEV-NOTE: Cliente Supabase para autenticação
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  private baseUrl = '/api/import';

  // AIDEV-NOTE: Obter token de autenticação
  private async getAuthToken(): Promise<string> {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      throw new Error('Usuário não autenticado');
    }
    
    return session.access_token;
  }

  // AIDEV-NOTE: Fazer upload de arquivo para importação
  async uploadFile(file: File): Promise<ImportUploadResponse> {
    try {
      const token = await this.getAuthToken();
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no upload do arquivo');
      }

      const data = await response.json();
      
      console.log('✅ Upload realizado com sucesso:', {
        jobId: data.jobId,
        totalRecords: data.totalRecords,
        filename: file.name
      });

      return data;
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  }

  // AIDEV-NOTE: Consultar status de um job de importação
  async getJobStatus(jobId: string): Promise<ImportJobStatus> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao consultar status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Erro ao consultar status:', error);
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