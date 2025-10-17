import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { ContractList } from "@/components/contracts/ContractList";
import { NewContractForm } from "@/components/contracts/NewContractForm";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
// Removido import do VisuallyHidden - usando sr-only do Tailwind
import { toast } from "@/components/ui/use-toast";
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
  const queryClient = useQueryClient();
  
  // Estados do componente - SEMPRE declarados antes de qualquer return condicional
  const [viewState, setViewState] = useState<ViewState>("list");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  
  // Hook para atualizar a lista de contratos após operações - SEMPRE chamado
  const { refetch: forceRefreshContracts } = useContracts({});
  
  // 🚨 FORÇA LIMPEZA COMPLETA DO CACHE AO TROCAR TENANT
  React.useEffect(() => {
    if (currentTenant?.id) {
      console.log(`🧹 [CACHE] Limpando cache para tenant: ${currentTenant.name} (${currentTenant.id})`);
      // Invalidar TODAS as queries de contratos
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      // Remover dados em cache que possam estar contaminados
      queryClient.removeQueries({ queryKey: ['contracts'] });
    }
  }, [currentTenant?.id, queryClient]);

  // Título dinâmico baseado no modo do formulário - SEMPRE calculado
  const formTitle = useMemo(() => {
    switch (formMode) {
      case "create": return "Novo Contrato";
      case "edit": return "Editar Contrato";
      case "view": return "Detalhes do Contrato";
      default: return "Contrato";
    }
  }, [formMode]);

  // Manipuladores de eventos - SEMPRE declarados antes do guard clause
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
    const isCreate = formMode === "create";
    
    toast({
      title: "Sucesso!",
      description: isCreate 
        ? "Contrato criado com sucesso!" 
        : "Contrato atualizado com sucesso!",
    });
    
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
    setIsFormDialogOpen(false);
    setHasUnsavedChanges(false);
    
    // Limpar parâmetros da URL ao fechar o formulário
    navigate(`/${slug}/contratos`);
  }, [hasUnsavedChanges, formMode, navigate, slug]);

  // Efeito para sincronizar com a URL - SEMPRE declarado antes do guard clause
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
  
  // 🔍 DEBUG: Log do estado do tenant na página
  console.log(`🔍 [DEBUG] Contracts Page - Tenant:`, {
    hasAccess,
    accessError,
    currentTenant,
    tenantId: currentTenant?.id,
    tenantName: currentTenant?.name,
    tenantSlug: currentTenant?.slug,
    urlSlug: slug,
    slugMatch: currentTenant?.slug === slug
  });
  
  // 🚨 VALIDAÇÃO CRÍTICA: Verificar se o tenant corresponde ao slug da URL
  if (currentTenant && currentTenant.slug !== slug) {
    console.error(`🚨 [SECURITY BREACH] Tenant slug não corresponde à URL!`, {
      currentTenantSlug: currentTenant.slug,
      urlSlug: slug,
      currentTenantName: currentTenant.name,
      currentTenantId: currentTenant.id
    });
    
    // Forçar redirecionamento para o portal
    console.log(`🔄 [REDIRECT] Redirecionando para portal devido a incompatibilidade de tenant`);
    window.location.href = `/meus-aplicativos`;
    return null;
  }

  // 🚨 GUARD CLAUSE CRÍTICO - IMPEDE RENDERIZAÇÃO SEM ACESSO VÁLIDO
  if (!hasAccess) {
    console.log(`🚨 [DEBUG] Acesso negado - hasAccess: ${hasAccess}, accessError: ${accessError}`);
    return (
      <Layout>
        <ContractFormSkeletonSimple />
      </Layout>
    );
  }
  
  // 🔍 AUDIT LOG: Página renderizada com sucesso
  console.log(`✅ [AUDIT] Página Contratos renderizada para tenant: ${currentTenant?.name} (${currentTenant?.id})`);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="h-9 w-24 bg-slate-700 rounded animate-pulse"></div>
          </div>
          <ContractFormSkeleton />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={viewState !== "list" ? "hidden" : ""}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Contratos - {currentTenant?.name}</h1>
          <div className="flex gap-2">
          </div>
        </div>
        <ContractList 
          onCreateContract={handleCreateContract} 
          onViewContract={handleViewContract}
          onEditContract={handleEditContract}
        />
      </div>

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
