import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { ContractList } from "@/components/contracts/ContractList";
import { NewContractForm } from "@/components/contracts/NewContractForm";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
// Removido import do VisuallyHidden - usando sr-only do Tailwind
// AIDEV-NOTE: Removido import de toast - não é mais necessário (toast de sucesso é exibido em ContractFormActions.tsx)
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ContractFormSkeleton, ContractFormSkeletonSimple } from "@/components/contracts/ContractFormSkeleton";
import { useContracts } from "@/hooks/useContracts";
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { supabase } from "@/lib/supabase";

// Tipos para melhor tipagem
type ViewState = "list" | "form";
type FormMode = "create" | "edit" | "view";

// AIDEV-NOTE: DialogContent customizado com sistema de scroll otimizado
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden flex flex-col",
        className
      )}
      onOpenAutoFocus={(e) => {
        // Previne o foco automático que pode causar conflito com aria-hidden
        e.preventDefault();
      }}
      {...props}
    >
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
      {/* Removido o DialogPrimitive.Close para evitar o X */}
    </DialogPrimitive.Content>
  </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

export default function Contracts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  
  // 🛡️ PROTEÇÃO CRÍTICA CONTRA VAZAMENTO DE DADOS ENTRE TENANTS
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const [initialLoad, setInitialLoad] = useState(true);
  
  // AIDEV-NOTE: Delay inicial para evitar renderização prematura
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ✅ TODOS OS HOOKS DEVEM SER DECLARADOS ANTES DOS EARLY RETURNS
  // AIDEV-NOTE: Movendo todos os hooks para antes dos guard clauses para evitar "Rendered fewer hooks than expected"
  const queryClient = useQueryClient();
  
  // Estados do componente - SEMPRE declarados antes de qualquer early return
  const [viewState, setViewState] = useState<ViewState>("list");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  
  // Ref para rastrear mudanças de tenant e otimizar limpeza de cache
  const previousTenantIdRef = React.useRef<string | null>(null);
  
  // Hook para atualizar a lista de contratos após operações - SEMPRE chamado
  // AIDEV-NOTE: Usar queryClient.invalidateQueries em vez de useContracts({}) para evitar queries desnecessárias
  // const { refetch: forceRefreshContracts } = useContracts({});
  
  // Função para forçar refresh usando invalidação de queries
  const forceRefreshContracts = React.useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['contracts'],
      exact: false 
    });
  }, [queryClient]);

  // 🧹 LIMPEZA INTELIGENTE DO CACHE APENAS QUANDO NECESSÁRIO
  // AIDEV-NOTE: Otimizado para evitar loops - apenas limpa se o tenant mudou de fato
  // AIDEV-NOTE: Adicionado invalidação granular por tipo de contrato
  React.useEffect(() => {
    if (currentTenant?.id) {
      console.log(`🧹 [CACHE] Limpando cache para tenant: ${currentTenant.name} (${currentTenant.id})`);
      
      // Invalidar cache de forma mais granular e eficiente
      const contractQueries = [
        ['contracts', 'list', currentTenant.id],
        ['contracts', 'active', currentTenant.id],
        ['contracts', 'pending', currentTenant.id],
        ['contracts', 'metrics', currentTenant.id]
      ];
      
      // Invalidar queries específicas em vez de todas as queries de contratos
      contractQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      // Remover dados em cache que possam estar contaminados (apenas se mudou de tenant)
      if (currentTenant.id !== previousTenantIdRef.current) {
        queryClient.removeQueries({ 
          queryKey: ['contracts'], 
          exact: false 
        });
        previousTenantIdRef.current = currentTenant.id;
      }
    }
  }, [currentTenant?.id, queryClient]); // Adicionado queryClient para garantir consistência

  // 🔍 AUDIT LOG: Página renderizada com sucesso - APENAS UMA VEZ por sessão
  // AIDEV-NOTE: Consolidado com debounce para evitar múltiplos logs
  React.useEffect(() => {
    if (currentTenant?.id) {
      const timer = setTimeout(() => {
        console.log(`✅ [AUDIT] Página Contratos renderizada para tenant: ${currentTenant?.name} (${currentTenant?.id})`);
      }, 150); // Debounce de 150ms
      return () => clearTimeout(timer);
    }
  }, [currentTenant?.id]); // Executa apenas quando o tenant muda

  // Título dinâmico baseado no modo do formulário - SEMPRE calculado
  const formTitle = useMemo(() => {
    switch (formMode) {
      case "create": return "Novo Contrato";
      case "edit": return "Editar Contrato";
      case "view": return "Detalhes do Contrato";
      default: return "Contrato";
    }
  }, [formMode]);

  // Manipuladores de eventos - SEMPRE declarados antes dos guard clauses
  const handleBackToList = useCallback(() => {
    setSelectedContractId(null);
    setIsFormDialogOpen(false);
    
    // Limpar parâmetros da URL ao voltar para a lista
    navigate(`/${slug}/contratos`);
  }, [navigate, slug]);

  const handleViewContract = useCallback(async (contractId: string) => {
    try {
      setIsDetailsLoading(true);
      setSelectedContractId(contractId);
      
      // TODO: Implementar busca de contrato quando tabela estiver definida nos tipos
      // Por enquanto, usar modo 'edit' como padrão
      const mode = 'edit';
      
      setFormMode(mode);
      setIsFormDialogOpen(true);
      
      // Atualizar a URL com os parâmetros corretos
      const searchParams = new URLSearchParams();
      searchParams.set('id', contractId);
      searchParams.set('mode', mode);
      navigate(`/${slug}/contratos?${searchParams.toString()}`);
      
      // Pequeno atraso para garantir que o estado seja atualizado antes de carregar os detalhes
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error("Erro ao carregar contrato:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do contrato.",
        variant: "destructive",
      });
    } finally {
      setIsDetailsLoading(false);
    }
  }, [navigate, slug]);

  const handleCreateContract = useCallback(() => {
    setFormMode("create");
    setSelectedContractId(null);
    setIsFormDialogOpen(true);
    
    // Atualizar a URL com o parâmetro mode=create
    const searchParams = new URLSearchParams();
    searchParams.set('mode', 'create');
    navigate(`/${slug}/contratos?${searchParams.toString()}`);
  }, [navigate, slug]);

  const handleEditContract = useCallback((contractId: string) => {
    setFormMode("edit");
    setSelectedContractId(contractId);
    setIsFormDialogOpen(true);
    
    // Atualizar a URL com os parâmetros corretos
    const searchParams = new URLSearchParams();
    searchParams.set('id', contractId);
    searchParams.set('mode', 'edit');
    navigate(`/${slug}/contratos?${searchParams.toString()}`);
  }, [navigate, slug]);

  const handleContractFormSuccess = useCallback(async (contractId: string) => {
    // AIDEV-NOTE: CORREÇÃO - Removido toast duplicado
    // O toast de sucesso já é exibido em ContractFormActions.tsx
    // Mantendo apenas um toast para evitar duplicação
    
    // Aguardar um momento para garantir que todas as operações do backend sejam concluídas
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Atualizar a lista de contratos com invalidação de cache
    try {
      await forceRefreshContracts();
    } catch (error) {
      console.error('Erro ao atualizar lista de contratos:', error);
    }
    
    // Fechar o formulário e navegar para a lista
    setIsFormDialogOpen(false);
    
    // Limpar parâmetros da URL ao fechar o formulário
    navigate(`/${slug}/contratos`);
  }, [formMode, navigate, slug, forceRefreshContracts]);

  const handleCloseFormDialog = useCallback(() => {
    if (hasUnsavedChanges && formMode !== "view") {
      if (!window.confirm("Há alterações não salvas. Deseja realmente sair?")) {
        return;
      }
    }
    
    // Limpar parâmetros da URL primeiro para evitar re-renderizações
    navigate(`/${slug}/contratos`);
    
    // Limpar estados após um pequeno delay para transição suave
    setTimeout(() => {
      setIsFormDialogOpen(false);
      setHasUnsavedChanges(false);
      setSelectedContractId(null);
      setFormMode("create");
    }, 100);
  }, [hasUnsavedChanges, formMode, navigate, slug]);

  // Efeito para sincronizar com a URL - SEMPRE declarado antes dos guard clauses
  React.useEffect(() => {
    const id = searchParams.get('id');
    const mode = searchParams.get('mode') || 'view';
    
    if (id) {
      const viewMode = (["create", "edit", "view"].includes(mode) 
        ? mode 
        : "view") as FormMode;
        
      setFormMode(viewMode);
      setSelectedContractId(id);
      setViewState(viewMode === "view" ? "list" : "form");
      setIsFormDialogOpen(true);
    } else if (mode === 'create') {
      // AIDEV-NOTE: Modo create sem ID - manter dialog aberto para novo contrato
      setFormMode('create');
      setSelectedContractId(null);
      setViewState("form");
      setIsFormDialogOpen(true);
    } else {
      // Se não houver ID nem modo create, garantir que estamos na lista
      setViewState("list");
      setSelectedContractId(null);
      setIsFormDialogOpen(false);
    }
  }, [searchParams]);
  
  // 🔍 AUDIT LOG: Página renderizada com sucesso - APENAS UMA VEZ por sessão
  React.useEffect(() => {
    if (currentTenant?.id) {
      console.log(`✅ [AUDIT] Página Contratos renderizada para tenant: ${currentTenant?.name} (${currentTenant?.id})`);
    }
  }, [currentTenant?.id]); // Executa apenas quando o tenant muda

  // 🚨 GUARD CLAUSES CRÍTICOS - EXECUTADOS APÓS TODOS OS HOOKS
  // AIDEV-NOTE: Movidos para depois dos hooks para evitar erro "Rendered fewer hooks than expected"
  
  // 🚨 VALIDAÇÃO CRÍTICA: Verificar se o tenant corresponde ao slug da URL
  // AIDEV-NOTE: Adicionado report de segurança para tentativas de acesso não autorizado
  if (currentTenant && currentTenant.slug !== slug) {
    console.error(`🚨 [SECURITY BREACH] Tenant slug não corresponde à URL!`, {
      currentTenantSlug: currentTenant.slug,
      urlSlug: slug,
      currentTenantName: currentTenant.name,
      currentTenantId: currentTenant.id
    });
    
    // Reportar tentativa de acesso não autorizado (não bloqueante para não afetar UX)
    if (supabase) {
      supabase.from('security_logs').insert({
        event_type: 'TENANT_MISMATCH_ATTEMPT',
        tenant_id: currentTenant.id,
        details: {
          expected_slug: currentTenant.slug,
          attempted_slug: slug,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent?.substring(0, 200)
        }
      }).catch(error => {
        console.warn('Erro ao registrar log de segurança:', error);
      });
    }
    
    // Forçar redirecionamento para o portal
    console.log(`🔄 [REDIRECT] Redirecionando para portal devido a incompatibilidade de tenant`);
    window.location.href = `/meus-aplicativos`;
    return null;
  }

  // 🚨 GUARD CLAUSE CRÍTICO - IMPEDE RENDERIZAÇÃO SEM ACESSO VÁLIDO
  if (!hasAccess || initialLoad) {
    // AIDEV-NOTE: Log condicional apenas quando há erro de acesso
    if (accessError && !initialLoad) {
      console.log(`🚨 [DEBUG] Acesso negado - hasAccess: ${hasAccess}, accessError: ${accessError}`);
    }
    
    // AIDEV-NOTE: Se o erro for "Tenant não definido" ou estiver no carregamento inicial, aguardar
    if (accessError === 'Tenant não definido' || initialLoad) {
      return (
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {initialLoad ? 'Inicializando...' : 'Carregando informações do tenant...'}
              </p>
            </div>
          </div>
        </Layout>
      );
    }
    
    return (
      <Layout>
        <ContractFormSkeletonSimple />
      </Layout>
    );
  }

  return (
    <Layout>
      {viewState === "list" && (
        <ContractList 
          onCreateContract={handleCreateContract} 
          onViewContract={handleViewContract}
          onEditContract={handleEditContract}
        />
      )}

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseFormDialog();
        else setIsFormDialogOpen(true);
      }} modal>
        <CustomDialogContent className="p-0 m-0 border-0">
          <DialogPrimitive.Title className="sr-only">{formTitle}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {formMode === "create" 
              ? "Formulário para criação de novo contrato" 
              : formMode === "edit" 
                ? "Formulário para edição de contrato existente"
                : "Visualização dos detalhes do contrato"
            }
          </DialogPrimitive.Description>
          {/* AIDEV-NOTE: Container otimizado para scroll com altura controlada */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {isDetailsLoading ? (
              <div className="flex-1 overflow-y-auto p-6">
                <ContractFormSkeleton />
              </div>
            ) : (
              <NewContractForm 
                mode={formMode}
                contractId={formMode !== "create" ? selectedContractId : undefined}
                onCancel={handleCloseFormDialog}
                onSuccess={handleContractFormSuccess}
                onFormChange={setHasUnsavedChanges}
                onEditRequest={handleEditContract}
                forceRefreshContracts={forceRefreshContracts}
                isModal={true}
              />
            )}
          </div>
        </CustomDialogContent>
      </Dialog>

      {/* Detalhes do contrato são exibidos no modal */}
    </Layout>
  );
}
