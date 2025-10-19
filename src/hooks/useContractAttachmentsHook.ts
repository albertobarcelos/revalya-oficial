import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { ContractAttachment } from "@/types/models/contract";
import { toast } from "sonner";
import { useTenantAccessGuard } from '@/hooks/templates/useTenantAccessGuard';

// Hook especializado para gerenciar anexos de contratos com segurança multi-tenant
export const useContractAttachments = (contractId: string) => {
  // AIDEV-NOTE: Usando nova arquitetura multi-tenant segura
  const { currentTenant } = useTenantAccessGuard();
  
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initializationComplete, setInitializationComplete] = useState(false);
  
  const queryClient = useQueryClient();

  // Função simplificada para buscar anexos usando o contexto seguro do useTenantAccessGuard
  // AIDEV-NOTE: Memoizar fetchAttachments para evitar re-renders excessivos
  const fetchAttachments = useCallback(async () => {
    if (!currentTenant?.id || !contractId) {
      setAttachments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Configurar contexto do tenant
      await supabase.rpc('set_tenant_context_simple', { 
        p_tenant_id: currentTenant.id 
      });

      const { data, error } = await supabase
        .from('contract_attachments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAttachments(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar anexos:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, contractId]); // AIDEV-NOTE: Dependências memoizadas

  // Efeito simplificado para buscar anexos quando o tenant estiver disponível
  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]); // AIDEV-NOTE: Agora depende da função memoizada

  // Adicionar um anexo ao contrato
  const addAttachment = async (attachmentData: FormData) => {
    try {
      // Verificar se temos o tenant atual do hook
      if (!currentTenant?.id) {
        throw new Error('Contexto de tenant não disponível. Operação cancelada.');
      }

      // Verificar se o contrato pertence ao tenant correto
      const { data: contractCheck, error: checkError } = await supabase
        .from('contracts')
        .select('id, tenant_id')
        .eq('id', contractId)
        .eq('tenant_id', currentTenant.id)
        .single();
        
      if (checkError || !contractCheck) {
        throw new Error('Contrato não encontrado ou acesso negado.');
      }

      // Preparar dados para o upload
      const contractIdFromForm = attachmentData.get('contractId');
      const name = attachmentData.get('name');
      const description = attachmentData.get('description');
      const category = attachmentData.get('category');
      const file = attachmentData.get('file') as File;
      
      if (!file || !name) {
        throw new Error('Arquivo e nome são obrigatórios.');
      }
      
      // Gerar um caminho único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${currentTenant.id}/contracts/${contractId}/${fileName}`;
      
      // Upload do arquivo para o storage
      const { error: uploadError } = await supabase.storage
        .from('contract_attachments')
        .upload(filePath, file);
        
      if (uploadError) {
        throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
      }
      
      // Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from('contract_attachments')
        .getPublicUrl(filePath);
        
      const publicUrl = urlData.publicUrl;
      
      // Adicionar registro do anexo no banco de dados
      const { data, error } = await supabase
        .from('contract_attachments')
        .insert({
          contract_id: contractId,
          name: name,
          description: description || null,
          category: category || null,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          is_active: true,
          uploaded_at: new Date().toISOString(),
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar anexo:', error);
        throw error;
      }
      
      // Registrar operação para auditoria
      await supabase.from('audit_logs').insert({
        entity_type: 'contract_attachments',
        entity_id: data.id,
        tenant_id: currentTenant.id,
        action: 'CREATE',
        new_data: {
          action: 'add_attachment',
          contract_id: contractId,
          attachment_id: data.id,
          file_name: name,
          file_size: file.size,
          timestamp: new Date().toISOString()
        },
        performed_by: (await supabase.auth.getUser()).data.user?.id
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao adicionar anexo:', error);
      throw error;
    }
  };

  // Mutation para adicionar anexo
  const addAttachmentMutation = useMutation({
    mutationFn: addAttachment,
    onSuccess: () => {
      // Recarregar dados após adicionar anexo
      fetchAttachments();
    },
  });

  // Excluir um anexo
  const deleteAttachment = async (attachmentId: string) => {
    try {
      // Verificar se temos o tenant atual do hook
      if (!currentTenant?.id) {
        throw new Error('Contexto de tenant não disponível. Operação cancelada.');
      }

      // Buscar dados do anexo para verificar permissão e obter o caminho do arquivo
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('contract_attachments')
        .select('*, contracts(tenant_id)')
        .eq('id', attachmentId)
        .single();
        
      if (attachmentError || !attachmentData) {
        throw new Error('Anexo não encontrado.');
      }
      
      // Verificar se o anexo pertence a um contrato do tenant atual
      if (attachmentData.contracts.tenant_id !== currentTenant.id) {
        // Registrar tentativa de acesso não autorizado
        await supabase.from('security_logs').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'UNAUTHORIZED_DELETE_ATTEMPT',
          resource: 'contract_attachments',
          resource_id: attachmentId,
          tenant_id: currentTenant.id,
          details: JSON.stringify({
            method: 'deleteAttachment',
            timestamp: new Date().toISOString()
          }),
          severity: 'HIGH'
        });
        
        throw new Error('Acesso negado. Este anexo não pertence ao seu tenant.');
      }

      // Marcar anexo como inativo (soft delete)
      const { data, error } = await supabase
        .from('contract_attachments')
        .update({
          is_active: false,
        })
        .eq('id', attachmentId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao excluir anexo:', error);
        throw error;
      }
      
      // Registrar operação para auditoria
      await supabase.from('audit_logs').insert({
        entity_type: 'contract_attachments',
        entity_id: attachmentId,
        tenant_id: currentTenant.id,
        action: 'DELETE',
        old_data: {
          action: 'delete_attachment',
          contract_id: attachmentData.contract_id,
          timestamp: new Date().toISOString()
        },
        performed_by: (await supabase.auth.getUser()).data.user?.id
      });

      return data;
    } catch (error: any) {
      console.error('Erro ao excluir anexo:', error);
      throw error;
    }
  };

  // Mutation para excluir anexo
  const deleteAttachmentMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      // Recarregar dados após excluir anexo
      fetchAttachments();
    },
  });

  // Função para baixar um anexo
  const downloadAttachment = async (attachmentId: string) => {
    try {
      // Verificar se temos o tenant atual do hook
      if (!currentTenant?.id) {
        throw new Error('Contexto de tenant não disponível. Operação cancelada.');
      }

      // Buscar dados do anexo para verificar permissão e obter o caminho do arquivo
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('contract_attachments')
        .select('*, contracts(tenant_id)')
        .eq('id', attachmentId)
        .single();
        
      if (attachmentError || !attachmentData) {
        throw new Error('Anexo não encontrado.');
      }
      
      // Verificar se o anexo pertence a um contrato do tenant atual
      if (attachmentData.contracts.tenant_id !== currentTenant.id) {
        // Registrar tentativa de acesso não autorizado
        await supabase.from('security_logs').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'UNAUTHORIZED_DOWNLOAD_ATTEMPT',
          resource: 'contract_attachments',
          resource_id: attachmentId,
          tenant_id: currentTenant.id,
          details: JSON.stringify({
            method: 'downloadAttachment',
            timestamp: new Date().toISOString()
          }),
          severity: 'HIGH'
        });
        
        throw new Error('Acesso negado. Este anexo não pertence ao seu tenant.');
      }

      // Gerar URL de download
      const { data, error } = await supabase.storage
        .from('contract_attachments')
        .createSignedUrl(attachmentData.file_path, 60);  // URL válida por 60 segundos

      if (error) {
        console.error('Erro ao gerar URL de download:', error);
        throw error;
      }
      
      // Registrar operação para auditoria
      await supabase.from('access_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'DOWNLOAD',
        resource: 'contract_attachments',
        resource_id: attachmentId,
        tenant_id: currentTenant.id,
        details: JSON.stringify({
          action: 'download_attachment',
          contract_id: attachmentData.contract_id,
          timestamp: new Date().toISOString()
        })
      });

      // Abrir URL em nova aba para download
      window.open(data?.signedUrl, '_blank');
      
      return data;
    } catch (error: any) {
      console.error('Erro ao baixar anexo:', error);
      toast.error('Erro ao baixar anexo: ' + error.message);
      throw error;
    }
  };

  return {
    attachments,
    isLoading,
    error,
    refetch: fetchAttachments,
    addAttachmentMutation,
    deleteAttachmentMutation,
    downloadAttachment
  };
};
