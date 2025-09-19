/**
 * Hook para gerenciar a seleção e acesso aos portais
 * Integra o sistema de one-time code com o fluxo existente
 */

import { useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { useTenantAccess } from '@/data/hooks/useTenantAccess';

export function usePortalManager() {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const { generateAccessCode, openTenantInNewTab } = useTenantAccess();
  
  /**
   * Abre um tenant em uma nova aba usando o fluxo de one-time code
   */
  const accessTenant = useCallback(async (tenantId: string) => {
    try {
      // Usar o novo sistema de one-time code
      return await openTenantInNewTab(tenantId);
    } catch (error: any) {
      console.error('Erro ao acessar tenant:', error);
      
      toast({
        title: 'Erro ao acessar portal',
        description: error.message || 'Não foi possível acessar o portal selecionado',
        variant: 'destructive',
      });
      
      return { success: false, error: error.message };
    }
  }, [openTenantInNewTab, toast]);
  
  /**
   * Abre o portal administrativo
   */
  const accessAdminPortal = useCallback(() => {
    try {
      // Admin portal não usa sistema de tenant, pode usar redirecionamento direto
      window.open('/admin/dashboard', '_blank', 'noopener');
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao acessar portal admin:', error);
      
      toast({
        title: 'Erro ao acessar portal admin',
        description: error.message || 'Não foi possível acessar o portal administrativo',
        variant: 'destructive',
      });
      
      return { success: false, error: error.message };
    }
  }, [toast]);
  
  /**
   * Abre o portal de revendedor
   */
  const accessResellerPortal = useCallback((resellerId: string) => {
    try {
      // Reseller portal não usa sistema de tenant, pode usar redirecionamento direto
      window.open(`/reseller/dashboard?id=${resellerId}`, '_blank', 'noopener');
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao acessar portal reseller:', error);
      
      toast({
        title: 'Erro ao acessar portal de revendedor',
        description: error.message || 'Não foi possível acessar o portal de revendedor',
        variant: 'destructive',
      });
      
      return { success: false, error: error.message };
    }
  }, [toast]);
  
  /**
   * Função para aceitar um convite
   */
  const acceptInvite = useCallback(async (inviteId: string, tenantId: string) => {
    try {
      // Aceitar o convite usando o sistema existente
      const { data, error } = await supabase
        .from('tenant_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', inviteId)
        .select();
        
      if (error) throw error;
      
      toast({
        title: 'Convite aceito',
        description: 'Você agora tem acesso a este portal',
      });
      
      // Após aceitar, recarregar a página para atualizar os portais
      window.location.reload();
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao aceitar convite:', error);
      
      toast({
        title: 'Erro ao aceitar convite',
        description: error.message || 'Não foi possível aceitar o convite',
        variant: 'destructive',
      });
      
      return { success: false, error: error.message };
    }
  }, [supabase, toast]);
  
  /**
   * Função para rejeitar um convite
   */
  const rejectInvite = useCallback(async (inviteId: string) => {
    try {
      // Rejeitar o convite usando o sistema existente
      const { error } = await supabase
        .from('tenant_invites')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', inviteId);
        
      if (error) throw error;
      
      toast({
        title: 'Convite rejeitado',
        description: 'O convite foi rejeitado com sucesso',
      });
      
      // Após rejeitar, recarregar a página para atualizar os portais
      window.location.reload();
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao rejeitar convite:', error);
      
      toast({
        title: 'Erro ao rejeitar convite',
        description: error.message || 'Não foi possível rejeitar o convite',
        variant: 'destructive',
      });
      
      return { success: false, error: error.message };
    }
  }, [supabase, toast]);
  
  return {
    accessTenant,
    accessAdminPortal,
    accessResellerPortal,
    acceptInvite,
    rejectInvite
  };
}
