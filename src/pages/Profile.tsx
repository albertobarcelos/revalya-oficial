import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { Layout } from "@/components/layout/Layout";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Profile } from "@/types/models/profile";
import { logDebug, logError } from "@/lib/logger";
import { useTenantAccessGuard } from "@/hooks/useTenantAccessGuard";
import { useSecureTenantQuery, useSecureTenantMutation } from "@/hooks/templates/useSecureTenantQuery";

export default function Profile() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [pendingAvatarPath, setPendingAvatarPath] = useState<string | null>(null); // Avatar pendente de salvar
  const { currentTenant, hasAccess, accessError } = useTenantAccessGuard();

  const profileQuery = useSecureTenantQuery(
    ["profile"],
    async (client, tenantId) => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      
      // AIDEV-NOTE: avatar_url agora é diretamente o caminho do arquivo (TEXT)
      const avatarDisplayPath = (data as Profile)?.avatar_url as string | null;
      
      const profileData = {
        ...data,
        email: user.email || data?.email,
        company_name: (data as any)?.metadata?.company_name ?? null,
        metadata: (data as any)?.metadata,
      } as Partial<Profile & { metadata?: any }>;
      return { user, profileData, avatarDisplayPath };
    },
    { enabled: hasAccess && !!currentTenant?.id, staleTime: 5 * 60 * 1000 }
  );

  useEffect(() => {
    setIsLoading(profileQuery.isLoading);
    if (profileQuery.data?.profileData) {
      setProfile(profileQuery.data.profileData);
    }
  }, [profileQuery.isLoading, profileQuery.data]);

  useEffect(() => {
    const shouldCreate = !profileQuery.isLoading && !profileQuery.data?.profileData && !!profileQuery.data?.user && !!currentTenant?.id;
    if (shouldCreate) {
      const u = profileQuery.data!.user;
      const newUser: Partial<Profile> = {
        id: u.id,
        name: u.user_metadata?.name || u.email?.split('@')[0] || "",
        email: u.email,
        user_role: 'USER' as any,
        active: true,
        preferences: {},
        // metadata será inserido diretamente no banco, não faz parte do tipo Profile
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      createUserIfMissing.mutate(newUser, {
        onSuccess: () => {
          setProfile(newUser);
          profileQuery.refetch();
        },
        onError: (err: Error) => {
          logError("Erro ao criar usuário", { context: "Profile", error: err });
          toast({ title: "Erro", description: err.message || "Erro ao criar perfil", variant: "destructive" });
        }
      });
    }
  }, [profileQuery.isLoading, profileQuery.data, currentTenant?.id]);

  // AIDEV-NOTE: Removida lógica de reconciliação - não é mais necessária

  const createUserIfMissing = useSecureTenantMutation(
    async (client, tenantId, newUser: Partial<Profile>) => {
      const { error } = await client
        .from('users')
        .insert([newUser]);
      if (error) throw error;
      return newUser;
    }
  );

  const updateAvatar = useSecureTenantMutation(
    async (client, tenantId, filePath: string) => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      // AIDEV-NOTE: Antes de atualizar, remover o avatar antigo do storage, se existir
      const { data: currentProfile } = await client
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (currentProfile?.avatar_url && currentProfile.avatar_url !== filePath && !currentProfile.avatar_url.startsWith('http')) {
        try {
          await client.storage
            .from(STORAGE_BUCKETS.AVATARS)
            .remove([currentProfile.avatar_url]);
          logDebug('Avatar anterior removido do storage', { context: 'Profile', path: currentProfile.avatar_url });
        } catch (removeError) {
          // Não falha a atualização se não conseguir remover o anterior
          logError('Erro ao remover avatar anterior do storage', { context: 'Profile', error: removeError });
        }
      }

      const { error } = await client
        .from('users')
        .update({ 
          avatar_url: filePath,  // AIDEV-NOTE: Agora armazena diretamente o caminho do arquivo
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      if (error) throw error;
      return filePath;
    },
    {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Foto de perfil atualizada com sucesso!" });
        profileQuery.refetch();
      },
      onError: (err: Error) => {
        logError("Erro ao atualizar avatar", { context: "Profile", error: err });
        toast({ title: "Erro", description: err.message || "Erro ao atualizar foto de perfil", variant: "destructive" });
      }
    }
  );

  // AIDEV-NOTE: Agora apenas armazena o caminho pendente, não salva no banco imediatamente
  const handleAvatarUpload = (filePath: string) => {
    setPendingAvatarPath(filePath);
    setProfile(prev => ({ 
      ...prev, 
      avatar_url: filePath, // Atualiza apenas no estado local
    }));
  };

  const removeAvatar = useSecureTenantMutation(
    async (client, tenantId) => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");
      
      // AIDEV-NOTE: Remove arquivo do storage se existir
      const currentAvatarPath = profile.avatar_url || null;
      if (currentAvatarPath && !currentAvatarPath.startsWith('http')) {
        try {
          await client.storage
            .from(STORAGE_BUCKETS.AVATARS)
            .remove([currentAvatarPath]);
          logDebug('Arquivo de avatar removido do storage', { context: 'Profile', path: currentAvatarPath });
        } catch (removeError) {
          // Não falha a remoção se não conseguir remover do storage
            logError('Erro ao remover arquivo do storage', { context: 'Profile', error: removeError });
        }
      }
      
      // Remove referência na tabela users
      const { error } = await client
        .from('users')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      if (error) throw error;
      return true;
    },
    {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Foto de perfil removida com sucesso!" });
        profileQuery.refetch();
      },
      onError: (err: Error) => {
        logError("Erro ao remover avatar", { context: "Profile", error: err });
        toast({ title: "Erro", description: err.message || "Erro ao remover foto de perfil", variant: "destructive" });
      }
    }
  );

  const handleAvatarRemove = async () => {
    try {
      await removeAvatar.mutateAsync(undefined as unknown as void);
      setProfile(prev => ({ 
        ...prev, 
        avatar_url: null,
        updated_at: new Date().toISOString()
      }));
      setPendingAvatarPath(null); // Limpa o pendente ao remover
      
      // AIDEV-NOTE: Dispara evento customizado para atualizar Sidebar
      window.dispatchEvent(new CustomEvent('profile-avatar-updated', {
        detail: { avatarPath: null }
      }));
      logDebug('Evento de remoção de avatar disparado', { context: 'Profile' });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError("Erro ao remover avatar", { context: "Profile", error: err });
      toast({ title: "Erro", description: err.message || "Erro ao remover foto de perfil", variant: "destructive" });
    }
  };

  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>{accessError || 'Acesso negado'}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>
              Gerencie suas informações pessoais e preferências
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex justify-center">
              <ProfileAvatar 
                  url={profileQuery.data?.avatarDisplayPath || undefined}
                  onUpload={handleAvatarUpload}
                  onRemove={handleAvatarRemove}
                  pendingAvatarPath={pendingAvatarPath}
                />
              </div>
              <ProfileForm 
                profile={profile}
                onSave={async (updatedProfile) => {
                  // AIDEV-NOTE: Se há avatar pendente, salva no banco junto com os outros dados
                  if (pendingAvatarPath) {
                    try {
                      await updateAvatar.mutateAsync(pendingAvatarPath);
                      setPendingAvatarPath(null); // Limpa o pendente após salvar
                      
                      // AIDEV-NOTE: Dispara evento customizado para atualizar Sidebar
                      window.dispatchEvent(new CustomEvent('profile-avatar-updated', {
                        detail: { avatarPath: pendingAvatarPath }
                      }));
                      logDebug('Evento de atualização de avatar disparado', { context: 'Profile' });
                    } catch (error: unknown) {
                      const err = error instanceof Error ? error : new Error(String(error));
                      logError("Erro ao salvar avatar", { context: "Profile", error: err });
                      toast({ title: "Erro", description: "Erro ao salvar foto de perfil", variant: "destructive" });
                      throw err; // Propaga o erro para não salvar os outros dados
                    }
                  }
                  setProfile(prev => ({ ...prev, ...updatedProfile }));
                  await profileQuery.refetch();
                }}
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
