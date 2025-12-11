import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { logError, logDebug } from "@/lib/logger";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProfileAvatarProps {
  url?: string;
  onUpload?: (filePath: string) => void; // Agora apenas notifica sobre o upload, não salva no banco
  onRemove?: () => void;
  pendingAvatarPath?: string | null; // Avatar pendente de salvar
}

export function ProfileAvatar({ url, onUpload, onRemove, pendingAvatarPath }: ProfileAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // AIDEV-NOTE: Ref para armazenar URL de upload recente (evita sobrescrita pelo useEffect)
  const recentUploadRef = useRef<string | null>(null);
  
  // AIDEV-NOTE: Hook de segurança para obter tenant_id correto
  const { currentTenant } = useTenantAccessGuard();

  useEffect(() => {
    // AIDEV-NOTE: Se há uma URL de upload recente no ref, usa ela e não sobrescreve
    if (recentUploadRef.current) {
      logDebug('Usando URL de upload recente do ref', { context: 'ProfileAvatar', url: recentUploadRef.current });
      setAvatarUrl(recentUploadRef.current);
      return;
    }
    
    // Prioriza avatar pendente (recém enviado mas não salvo)
    if (pendingAvatarPath) {
      downloadImage(pendingAvatarPath);
      return;
    }
    
    if (url) {
      // Se a URL já for uma URL pública completa, usa ela diretamente
      if (url.startsWith('http')) {
        setAvatarUrl(url);
      } else {
        // avatar_url agora é diretamente o caminho do arquivo no storage
        downloadImage(url);
      }
    } else {
      setAvatarUrl(null);
    }
  }, [url, pendingAvatarPath]);

  /**
   * Obtém a URL pública do avatar no Storage.
   * AIDEV-NOTE: Bucket profile-avatars é público, então usa URL pública diretamente.
   */
  function downloadImage(path: string) {
    try {
      if (!path || path.trim() === '') {
        setAvatarUrl(null);
        return;
      }

      // AIDEV-NOTE: Bucket público - usa URL pública diretamente (mais rápido e confiável)
      const { data } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(path);

      if (data?.publicUrl) {
        logDebug('URL pública obtida', { context: 'ProfileAvatar', publicUrl: data.publicUrl });
        setAvatarUrl(data.publicUrl);
        return;
      }

      logError('Erro ao obter URL pública', { 
        context: 'ProfileAvatar', 
        path,
        message: 'Não foi possível obter URL pública'
      });
      setAvatarUrl(null);
    } catch (error) {
      logError('Erro ao obter URL da imagem', { context: 'ProfileAvatar', error, path });
      setAvatarUrl(null);
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
        logError('Erro ao obter usuário', { context: 'ProfileAvatar', error: userError });
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

      // AIDEV-NOTE: Valida e define o content-type correto baseado na extensão
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif'
      };
      const contentType = mimeTypes[fileExt] || file.type;

      // AIDEV-NOTE: Valida que o content-type é realmente uma imagem
      if (!contentType.startsWith('image/')) {
        throw new Error('O arquivo selecionado não é uma imagem válida.');
      }

      logDebug('Arquivo selecionado', { 
        context: 'ProfileAvatar',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        resolvedContentType: contentType
      });

      // AIDEV-NOTE: Preview imediato usando URL.createObjectURL
      // Isso permite que a imagem apareça imediatamente no front antes do upload
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
      logDebug('Preview imediato criado', { context: 'ProfileAvatar' });

      // AIDEV-NOTE: Gera nome e caminho seguindo o padrão de contract-attachments
      // Padrão: {tenant_id}/{user_id}/{nome_unico}.{ext}
      const tenantId = currentTenant?.id || 'default';
      const timestamp = Date.now();
      const fileName = `avatar_${timestamp}.${fileExt}`;
      const filePath = `${tenantId}/${user.id}/${fileName}`;

      logDebug('Iniciando upload do arquivo', { 
        context: 'ProfileAvatar',
        fileName,
        fileSize: file.size,
        contentType,
        bucket: STORAGE_BUCKETS.AVATARS
      });

      // AIDEV-NOTE: Faz o upload com content-type explícito baseado na extensão
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType // Define explicitamente o MIME da imagem
        });

      if (uploadError) {
        // Limpa o preview em caso de erro
        URL.revokeObjectURL(previewUrl);
        setAvatarUrl(null);
        logError('Erro no upload para o storage', { 
          context: 'ProfileAvatar',
          error: uploadError,
          fileName,
          fileSize: file.size,
          bucket: STORAGE_BUCKETS.AVATARS
        });
        throw uploadError;
      }

      logDebug('Upload concluído com sucesso', { 
        context: 'ProfileAvatar',
        uploadData,
        filePath
      });

      // AIDEV-NOTE: Busca avatar anterior para remover do storage
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle();

        // Remove arquivo anterior se existir e for diferente do novo
        if (userData?.avatar_url && userData.avatar_url !== filePath && !userData.avatar_url.startsWith('http')) {
          try {
            await supabase.storage
              .from(STORAGE_BUCKETS.AVATARS)
              .remove([userData.avatar_url]);
            logDebug('Arquivo anterior removido', { context: 'ProfileAvatar', path: userData.avatar_url });
          } catch (removeError) {
            // Não falha o upload se não conseguir remover o anterior
            logError('Erro ao remover arquivo anterior', { context: 'ProfileAvatar', error: removeError });
          }
        }
      }

      // AIDEV-NOTE: Bucket público - usa URL pública diretamente
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(filePath);
      
      const publicUrl = publicUrlData?.publicUrl || '';
      logDebug('URL pública obtida após upload', { context: 'ProfileAvatar', publicUrl });

      // Limpa o preview temporário APÓS obter a URL pública
      URL.revokeObjectURL(previewUrl);

      // AIDEV-NOTE: Armazena no ref para evitar que o useEffect sobrescreva
      // O ref persiste entre re-renders e não dispara o useEffect
      recentUploadRef.current = publicUrl;
      setAvatarUrl(publicUrl);
      
      // Notifica o componente pai com o caminho do arquivo
      // O salvamento no banco acontecerá quando o usuário clicar em "Salvar"
      onUpload?.(filePath);
      
      toast({
        title: "Upload concluído",
        description: "Foto enviada com sucesso! Clique em 'Salvar Alterações' para confirmar.",
      });
    } catch (error: any) {
      logError('Erro ao fazer upload', {
        context: 'ProfileAvatar',
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
      // Garante que o preview seja limpo em caso de erro
      recentUploadRef.current = null;
      setAvatarUrl(null);
    } finally {
      setUploading(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleRemove() {
    try {
      // Limpa o ref e estado local de upload
      recentUploadRef.current = null;
      setAvatarUrl(null);
      onRemove?.();
      toast({
        title: "Foto removida",
        description: "Seu avatar foi removido.",
      });
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
