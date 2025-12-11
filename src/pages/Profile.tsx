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
      let avatarDisplayPath: string | null = null;
      const rawAvatar = (data as Profile)?.avatar_url as string | null;
      if (rawAvatar) {
        const isUuid = /^[0-9a-fA-F-]{36}$/.test(rawAvatar);
        if (isUuid) {
          const { data: ua } = await client
            .from('user_avatars')
            .select('file_path')
            .eq('id', rawAvatar)
            .eq('user_id', user.id)
            .eq('tenant_id', tenantId)
            .maybeSingle();
          avatarDisplayPath = ua?.file_path || null;
        } else {
          avatarDisplayPath = rawAvatar;
        }
      }
      const profileData = {
        ...data,
        email: user.email || data?.email,
        company_name: (data as any)?.metadata?.company_name ?? null,
      } as Partial<Profile>;
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
        metadata: { company_name: null } as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      createUserIfMissing.mutate(newUser, {
        onSuccess: () => {
          setProfile(newUser);
          profileQuery.refetch();
        },
        onError: (err: Error) => {
          logError("Erro ao criar usuário", "Profile", err);
          toast({ title: "Erro", description: err.message || "Erro ao criar perfil", variant: "destructive" });
        }
      });
    }
  }, [profileQuery.isLoading, profileQuery.data, currentTenant?.id]);

  const reconcileAvatarMapping = useSecureTenantMutation(
    async (client, tenantId, vars: { userId: string; filePath: string }) => {
      const { data: existingActive } = await client
        .from('user_avatars')
        .select('id, file_path')
        .eq('user_id', vars.userId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingActive?.id) {
        const { error } = await client
          .from('user_avatars')
          .update({
            file_path: vars.filePath,
            file_type: 'image/*',
            file_size: 0,
            uploaded_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('id', existingActive.id);
        if (error) throw error;
      } else {
        const { error } = await client
          .from('user_avatars')
          .insert({
            user_id: vars.userId,
            tenant_id: tenantId,
            file_path: vars.filePath,
            file_type: 'image/*',
            file_size: 0,
            uploaded_at: new Date().toISOString(),
            is_active: true,
          });
        if (error) throw error;
      }
      return true;
    }
  );

  useEffect(() => {
    const fp = profileQuery.data?.avatarDisplayPath;
    const userId = profileQuery.data?.user?.id;
    if (fp && !fp.startsWith('http') && currentTenant?.id && userId) {
      reconcileAvatarMapping.mutate({ userId, filePath: fp });
    }
  }, [profileQuery.data, currentTenant?.id]);

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
    async (client, tenantId, avatarId: string) => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");
      const { error } = await client
        .from('users')
        .update({ 
          avatar_url: avatarId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      if (error) throw error;
      return avatarId;
    },
    {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Foto de perfil atualizada com sucesso!" });
        profileQuery.refetch();
      },
      onError: (err: Error) => {
        logError("Erro ao atualizar avatar", "Profile", err);
        toast({ title: "Erro", description: err.message || "Erro ao atualizar foto de perfil", variant: "destructive" });
      }
    }
  );

  const handleAvatarUpload = async (avatarId: string) => {
    try {
      await updateAvatar.mutateAsync(avatarId);
      setProfile(prev => ({ 
        ...prev, 
        avatar_url: avatarId,
        updated_at: new Date().toISOString()
      }));
    } catch (error: any) {
      logError("Erro ao atualizar avatar", "Profile", error);
      toast({ title: "Erro", description: error.message || "Erro ao atualizar foto de perfil", variant: "destructive" });
    }
  };

  const removeAvatar = useSecureTenantMutation(
    async (client, tenantId) => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");
      const currentAvatarId = profile.avatar_url || null;
      if (currentAvatarId && /^[0-9a-fA-F-]{36}$/.test(currentAvatarId)) {
        const { data: ua } = await client
          .from('user_avatars')
          .select('id, file_path')
          .eq('id', currentAvatarId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (ua?.file_path) {
          await client.storage
            .from(STORAGE_BUCKETS.AVATARS)
            .remove([ua.file_path]);
        }
        if (ua?.id) {
          await client
            .from('user_avatars')
            .delete()
            .eq('id', ua.id);
        }
      }
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
        logError("Erro ao remover avatar", "Profile", err);
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
    } catch (error: never) {
      logError("Erro ao remover avatar", "Profile", error);
      toast({ title: "Erro", description: error.message || "Erro ao remover foto de perfil", variant: "destructive" });
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
                />
              </div>
              <ProfileForm 
                profile={profile}
                onSave={async (updatedProfile) => {
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
