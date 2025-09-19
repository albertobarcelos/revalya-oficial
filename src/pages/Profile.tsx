import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from '@/lib/supabase';
import { Layout } from "@/components/layout/Layout";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Profile } from "@/types/models/profile";
import { logDebug, logError } from "@/lib/logger";

export default function Profile() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Partial<Profile>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      logDebug("Carregando perfil", "Profile");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        logDebug("Perfil carregado com sucesso", "Profile", data);
        const profileData = {
          ...data,
          email: user.email || data.email,
        };
        console.log("Dados do perfil carregados:", profileData);
        setProfile(profileData);
      } else {
        // Se o usuário não existe na tabela users, vamos criar um novo com dados básicos
        logDebug("Usuário não encontrado na tabela users, criando novo registro", "Profile");
        
        const newUser = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || "",
          email: user.email,
          user_role: 'USER', // Papel padrão
          active: true,
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        const { error: insertError } = await supabase
          .from('users')
          .insert([newUser]);
          
        if (insertError) {
          throw insertError;
        }
        
        setProfile(newUser);
        logDebug("Novo usuário criado com sucesso", "Profile", newUser);
      }
    } catch (error: any) {
      logError("Erro ao carregar perfil", "Profile", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar perfil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (filePath: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from('users')
        .update({ 
          avatar_url: filePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => ({ 
        ...prev, 
        avatar_url: filePath,
        updated_at: new Date().toISOString()
      }));
      
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada com sucesso!",
      });

      await loadProfile();
    } catch (error: any) {
      logError("Erro ao atualizar avatar", "Profile", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar foto de perfil",
        variant: "destructive",
      });
    }
  };

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
                  url={profile.avatar_url || undefined}
                  onUpload={handleAvatarUpload}
                />
              </div>
              <ProfileForm 
                profile={profile}
                onSave={async (updatedProfile) => {
                  setProfile(prev => ({ ...prev, ...updatedProfile }));
                  await loadProfile();
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
