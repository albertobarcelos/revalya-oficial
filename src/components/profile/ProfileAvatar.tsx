import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase, STORAGE_BUCKETS, getImageUrl } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { logError, logDebug } from "@/lib/logger";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";

interface ProfileAvatarProps {
  url?: string;
  onUpload?: (url: string) => void;
}

export function ProfileAvatar({ url, onUpload }: ProfileAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  
  // AIDEV-NOTE: Hook de segurança para obter tenant_id correto
  const { currentTenant } = useTenantAccessGuard();

  useEffect(() => {
    if (url) {
      // Se a URL já for uma URL pública completa, usa ela diretamente
      if (url.startsWith('http')) {
        setAvatarUrl(url);
      } else {
        downloadImage(url);
      }
    }
  }, [url]);

  /**
   * Baixa/resolve a URL de exibição do avatar pela chave do arquivo no Storage.
   * Comentário de nível de função: usa URL assinada para funcionar com buckets privados
   * e faz fallback para URL pública automaticamente.
   */
  async function downloadImage(path: string) {
    try {
      const url = await getImageUrl(STORAGE_BUCKETS.AVATARS, path, 3600);
      setAvatarUrl(url);
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

      // Obtém uma URL assinada para exibição imediata
      const signedUrl = await getImageUrl(STORAGE_BUCKETS.AVATARS, filePath, 3600);
      logDebug('URL de exibição obtida (assinada/pública)', 'ProfileAvatar', { signedUrl });

      // Atualiza a URL no estado e notifica o componente pai com a chave
      setAvatarUrl(signedUrl);
      onUpload?.(filePath);
      
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

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-32 w-32">
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
        <label
          className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          htmlFor="avatar"
        >
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
        </label>
        <input
          type="file"
          id="avatar"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
          className="hidden"
        />
      </div>
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
