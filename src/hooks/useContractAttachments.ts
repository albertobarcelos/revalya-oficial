/**
 * 🔐 HOOK SEGURO PARA GERENCIAMENTO DE ANEXOS DE CONTRATOS
 * 
 * Este hook implementa todas as operações de anexos com:
 * - Validação multi-tenant obrigatória
 * - Upload seguro para Supabase Storage
 * - Download com URLs temporárias
 * - Controle de acesso baseado em roles
 * - Validação de tipos e tamanhos de arquivo
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSecureTenantQuery, useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { toast } from 'sonner';

// AIDEV-NOTE: Tipos permitidos para anexos de contratos
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'image/jpeg',
  'image/png'
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const STORAGE_BUCKET = 'contract-attachments';

export interface ContractAttachment {
  id: string;
  contract_id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description?: string;
  category?: string;
  is_active: boolean;
  uploaded_at: string;
  uploaded_by: string;
  tenant_id: string;
}

interface UploadAttachmentData {
  contractId: string;
  file: File;
  description?: string;
  category?: string;
}

interface DeleteAttachmentData {
  attachmentId: string;
  filePath: string;
}

export function useContractAttachments(contractId?: string) {
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const queryClient = useQueryClient();

  // AIDEV-NOTE: Query segura para buscar anexos do contrato
  const attachmentsQuery = useSecureTenantQuery(
    ['contract-attachments', contractId],
    async (supabase, tenantId) => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('contract_attachments')
        .select('*')
        .eq('contract_id', contractId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar anexos:', error);
        throw new Error('Falha ao carregar anexos do contrato');
      }

      return data as ContractAttachment[];
    },
    {
      enabled: hasAccess && !!contractId && !!currentTenant?.id
    }
  );

  // AIDEV-NOTE: Validação de arquivo antes do upload
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
      return 'Tipo de arquivo não permitido. Use: PDF, DOCX, XLSX, JPEG ou PNG';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande. Tamanho máximo: 10MB';
    }

    return null;
  }, []);

  // AIDEV-NOTE: Mutation para upload de anexo
  const uploadMutation = useMutation({
    mutationFn: async ({ contractId, file, description, category }: UploadAttachmentData) => {
      if (!hasAccess || !currentTenant?.id) {
        throw new Error('Acesso negado: tenant não definido');
      }

      // Validar arquivo
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Gerar nome único para o arquivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${contractId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      const filePath = `${currentTenant.id}/${fileName}`;

      try {
        // 1. Upload do arquivo para o Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type // AIDEV-NOTE: Definir explicitamente o MIME type para evitar erro 400
          });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          throw new Error('Falha no upload do arquivo');
        }

        // 2. Configurar contexto de tenant
        await supabase.rpc('set_tenant_context_simple', {
          p_tenant_id: currentTenant.id
        });

        // 3. Criar registro na tabela
        const { data: attachmentData, error: dbError } = await supabase
          .from('contract_attachments')
          .insert({
            contract_id: contractId,
            name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            description: description || null,
            category: category || null,
            tenant_id: currentTenant.id,
            is_active: true
          })
          .select()
          .single();

        if (dbError) {
          // Se falhou ao criar registro, remover arquivo do storage
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);
          
          console.error('Erro ao salvar no banco:', dbError);
          throw new Error('Falha ao salvar informações do anexo');
        }

        return attachmentData as ContractAttachment;
      } catch (error) {
        // Cleanup em caso de erro
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidar cache para atualizar lista
      queryClient.invalidateQueries({
        queryKey: ['contract-attachments', contractId, currentTenant?.id]
      });
      
      toast.success('Anexo enviado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Erro ao enviar anexo');
    }
  });

  // AIDEV-NOTE: Mutation para deletar anexo
  const deleteMutation = useMutation({
    mutationFn: async ({ attachmentId, filePath }: DeleteAttachmentData) => {
      if (!hasAccess || !currentTenant?.id) {
        throw new Error('Acesso negado: tenant não definido');
      }

      // 1. Configurar contexto de tenant
      await supabase.rpc('set_tenant_context_simple', {
        p_tenant_id: currentTenant.id
      });

      // 2. Marcar como inativo no banco (soft delete)
      const { error: dbError } = await supabase
        .from('contract_attachments')
        .update({ is_active: false })
        .eq('id', attachmentId)
        .eq('tenant_id', currentTenant.id);

      if (dbError) {
        console.error('Erro ao deletar registro:', dbError);
        throw new Error('Falha ao remover anexo');
      }

      // 3. Remover arquivo do storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (storageError) {
        console.warn('Arquivo não removido do storage:', storageError);
        // Não falhar a operação se só o storage falhou
      }

      return { attachmentId };
    },
    onSuccess: () => {
      // Invalidar cache para atualizar lista
      queryClient.invalidateQueries({
        queryKey: ['contract-attachments', contractId, currentTenant?.id]
      });
      
      toast.success('Anexo removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar:', error);
      toast.error(error.message || 'Erro ao remover anexo');
    }
  });

  // AIDEV-NOTE: Função para gerar URL de download segura
  const getDownloadUrl = useCallback(async (filePath: string): Promise<string> => {
    if (!hasAccess || !currentTenant?.id) {
      throw new Error('Acesso negado: tenant não definido');
    }

    try {
      // Primeiro, verificar se o arquivo existe no storage
      const { data: fileExists, error: existsError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(filePath.substring(0, filePath.lastIndexOf('/')), {
          search: filePath.substring(filePath.lastIndexOf('/') + 1)
        });

      if (existsError) {
        console.error('Erro ao verificar existência do arquivo:', existsError);
        throw new Error('Erro ao verificar arquivo no storage');
      }

      if (!fileExists || fileExists.length === 0) {
        console.error('Arquivo não encontrado no storage:', filePath);
        throw new Error('Arquivo não encontrado no storage. O arquivo pode ter sido removido.');
      }

      // Se o arquivo existe, gerar URL assinada
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 60); // URL válida por 60 segundos

      if (error) {
        console.error('Erro ao gerar URL:', error);
        throw new Error('Falha ao gerar link de download');
      }

      if (!data?.signedUrl) {
        throw new Error('URL de download não foi gerada');
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Erro no getDownloadUrl:', error);
      throw error;
    }
  }, [hasAccess, currentTenant?.id]);

  // AIDEV-NOTE: Função para download direto
  const downloadAttachment = useCallback(async (attachment: ContractAttachment) => {
    try {
      console.log('Iniciando download do anexo:', {
        id: attachment.id,
        fileName: attachment.file_name,
        filePath: attachment.file_path,
        tenantId: currentTenant?.id
      });

      if (!attachment.file_path) {
        throw new Error('Caminho do arquivo não encontrado no anexo');
      }

      const url = await getDownloadUrl(attachment.file_path);
      
      console.log('URL de download gerada com sucesso:', url);
      
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download iniciado com sucesso');
    } catch (error: any) {
      console.error('Erro no download:', error);
      
      // Mensagem de erro mais específica baseada no tipo de erro
      let errorMessage = 'Erro ao fazer download do arquivo';
      if (error.message?.includes('não encontrado no storage')) {
        errorMessage = 'Arquivo não encontrado. O arquivo pode ter sido removido do storage.';
      } else if (error.message?.includes('Falha ao gerar link')) {
        errorMessage = 'Erro ao gerar link de download. Tente novamente.';
      }
      
      toast.error(errorMessage);
    }
  }, [getDownloadUrl, currentTenant?.id]);

  // AIDEV-NOTE: Estatísticas dos anexos
  const attachmentStats = useMemo(() => {
    const attachments = attachmentsQuery.data || [];
    
    return {
      total: attachments.length,
      totalSize: attachments.reduce((sum, att) => sum + att.file_size, 0),
      byType: attachments.reduce((acc, att) => {
        const type = att.file_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [attachmentsQuery.data]);

  return {
    // Dados
    attachments: attachmentsQuery.data || [],
    attachmentStats,
    
    // Estados
    isLoading: attachmentsQuery.isLoading,
    isError: attachmentsQuery.isError,
    error: attachmentsQuery.error,
    hasAccess,
    
    // Operações
    uploadAttachment: uploadMutation.mutate,
    deleteAttachment: deleteMutation.mutate,
    downloadAttachment,
    getDownloadUrl,
    validateFile,
    
    // Estados das operações
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Constantes
    allowedTypes: ALLOWED_FILE_TYPES,
    maxFileSize: MAX_FILE_SIZE
  };
}