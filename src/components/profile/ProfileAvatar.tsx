import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase, STORAGE_BUCKETS, getImageUrl } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { logError, logDebug } from "@/lib/logger";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";
import { useSecureTenantMutation } from "@/hooks/templates/useSecureTenantQuery";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProfileAvatarProps {
  url?: string;
  onUpload?: (avatarId: string) => void;
  onRemove?: () => void;
}

export function ProfileAvatar({ url, onUpload, onRemove }: ProfileAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // AIDEV-NOTE: Hook de segurança para obter tenant_id correto
  const { currentTenant } = useTenantAccessGuard();

  const upsertMapping = useSecureTenantMutation(
    async (client, _tenantId, vars: { userId: string; tenantId: string; filePath: string; fileType: string; fileSize: number }) => {
      const { data: existingActive } = await client
        .from('user_avatars')
        .select('id, file_path')
        .eq('user_id', vars.userId)
        .eq('tenant_id', vars.tenantId)
        .eq('is_active', true)
        .maybeSingle();

      let previousPath = existingActive?.file_path || null;

      if (existingActive?.id) {
        const { error: updateError } = await client
          .from('user_avatars')
          .update({
            file_path: vars.filePath,
            file_type: vars.fileType,
            file_size: vars.fileSize,
            uploaded_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('id', existingActive.id);
        if (updateError) throw updateError;
        return { id: existingActive.id };
      } else {
        const { data: inserted, error: insertError } = await client
          .from('user_avatars')
          .insert({
            user_id: vars.userId,
            tenant_id: vars.tenantId,
            file_path: vars.filePath,
            file_type: vars.fileType,
            file_size: vars.fileSize,
            uploaded_at: new Date().toISOString(),
            is_active: true,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        return { id: inserted.id };
      }

      if (previousPath && previousPath !== vars.filePath) {
        await client.storage
          .from(STORAGE_BUCKETS.AVATARS)
          .remove([previousPath]);
      }
      return { id: existingActive?.id || null };
    }
  );

  useEffect(() => {
    if (url) {
      // Se a URL já for uma URL pública completa, usa ela diretamente
      if (url.startsWith('http')) {
        setAvatarUrl(url);
      } else {
        const isUuid = /^[0-9a-fA-F-]{36}$/.test(url);
        if (isUuid && !currentTenant?.id) {
          // Aguarda tenant carregar para resolver file_path
          return;
        }
        if (isUuid && currentTenant?.id) {
          (async () => {
            try {
              const { data: ua } = await supabase
                .from('user_avatars')
                .select('file_path')
                .eq('id', url)
                .eq('tenant_id', currentTenant.id)
                .maybeSingle();
              if (ua?.file_path) {
                await downloadImage(ua.file_path);
              } else {
                setAvatarUrl('');
              }
            } catch (e) {
              setAvatarUrl('');
            }
          })();
        } else {
          downloadImage(url);
        }
      }
    }
  }, [url, currentTenant?.id]);

  /**
   * Baixa/resolve a URL de exibição do avatar pela chave do arquivo no Storage.
   * Comentário de nível de função: usa URL assinada para funcionar com buckets privados
   * e faz fallback para URL pública automaticamente.
   */
  async function downloadImage(path: string) {
    try {
      const primary = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .createSignedUrl(path, 3600);
      if (primary.data?.signedUrl) {
        setAvatarUrl(primary.data.signedUrl);
        return;
      }
    } catch (error) {
      logError('Erro ao obter URL da imagem', 'ProfileAvatar', error);
    }
  }

  /**
   * Faz upload do avatar para o bucket de AVATARS e atualiza o estado/parent com a chave do arquivo.
   * Comentário de nível de função: valida extensão/tamanho, gera nome único com tenant, realiza upload
   * e retorna a chave do arquivo (não a URL), permitindo que o front resolva a URL assinada na visualização.
   */
  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você precisa selecionar uma imagem para fazer upload.');
      }

      if (!currentTenant?.id) {
        throw new Error('Tenant não identificado. Aguarde o carregamento do contexto e tente novamente.');
      }

      // Primeiro obtém o usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        logError('Erro ao obter usuário', 'ProfileAvatar', userError);
        throw userError;
      }
      if (!user) throw new Error('Usuário não encontrado');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        throw new Error('Formato de arquivo não suportado. Use JPG, PNG ou GIF.');
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 2MB.');
      }

      // AIDEV-NOTE: Gera nome e caminho seguindo o padrão de contract-attachments
      // Padrão: {tenant_id}/{user_id}/{nome_unico}.{ext}
      const tenantId = currentTenant?.id || 'default';
      const timestamp = Date.now();
      const fileName = `avatar_${timestamp}.${fileExt}`;
      const filePath = `${tenantId}/${user.id}/${fileName}`;

      logDebug('Iniciando upload do arquivo', 'ProfileAvatar', { 
        fileName,
        fileSize: file.size,
        fileType: file.type,
        bucket: STORAGE_BUCKETS.AVATARS
      });

      // Faz o upload do arquivo seguindo o mesmo padrão de opções do contract-attachments
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // AIDEV-NOTE: manter consistência com contract-attachments
          contentType: file.type // Define explicitamente o MIME da imagem
        });

      if (uploadError) {
        logError('Erro no upload para o storage', 'ProfileAvatar', { 
          error: uploadError,
          fileName,
          fileSize: file.size,
          bucket: STORAGE_BUCKETS.AVATARS
        });
        throw uploadError;
      }

      logDebug('Upload concluído com sucesso', 'ProfileAvatar', { 
        uploadData,
        filePath
      });

      const res = await upsertMapping.mutateAsync({ userId: user.id, tenantId, filePath, fileType: file.type, fileSize: file.size });

      // Obtém uma URL assinada para exibição imediata
      const signedUrl = await getImageUrl(STORAGE_BUCKETS.AVATARS, filePath, 3600);
      logDebug('URL de exibição obtida (assinada/pública)', 'ProfileAvatar', { signedUrl });

      // Atualiza a URL no estado e notifica o componente pai com a chave
      setAvatarUrl(signedUrl);
      if (res?.id) {
        onUpload?.(res.id);
      }
      
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada com sucesso!",
      });
    } catch (error: any) {
      logError('Erro ao fazer upload', 'ProfileAvatar', {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        bucket: STORAGE_BUCKETS.AVATARS
      });
      toast({
        title: "Erro ao fazer upload",
        description: error.message || "Ocorreu um erro ao fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleRemove() {
    try {
      if (!url) {
        setAvatarUrl(null);
        onRemove?.();
        return;
      }
      onRemove?.();
      toast({
        title: "Foto removida",
        description: "Seu avatar foi removido.",
      });
      setAvatarUrl(null);
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message || "Ocorreu um erro ao remover a foto.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative h-32 w-32 cursor-pointer">
            <Avatar className="h-32 w-32">
              <AvatarImage 
                src={avatarUrl || undefined} 
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '';
                }}
              />
              <AvatarFallback className="text-2xl">
                {uploading ? '...' : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={openFilePicker}>Trocar foto</DropdownMenuItem>
          <DropdownMenuItem onClick={handleRemove}>Remover foto</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        id="avatar"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
        className="hidden"
      />
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {uploading ? 'Enviando...' : 'Clique no ícone para alterar sua foto'}
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, GIF ou PNG. Máximo 2MB.
        </p>
      </div>
    </div>
  );
}
