/**
 * Componente de Integração Focus NFe
 * AIDEV-NOTE: Integração para emissão fiscal (NFe e NFSe)
 * Movido de MyCompanySettings para página de Integrações
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Loader2, Receipt, Pencil } from "lucide-react";
import { getFocusNFeConfig, saveFocusNFeConfig } from "@/services/focusnfeCityService";
import { supabase } from "@/lib/supabase";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";

interface FocusNFeIntegrationProps {
  tenantId: string;
  tenantSlug: string;
  onToggle?: (enabled: boolean) => void;
  showHeader?: boolean; // AIDEV-NOTE: Controla se mostra header (útil quando usado em modal)
  onSave?: () => Promise<void>; // AIDEV-NOTE: Callback para salvar quando usado em modal externo
}


export function FocusNFeIntegration({ tenantId, tenantSlug, onToggle, showHeader = true, onSave }: FocusNFeIntegrationProps) {
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();
  
  // AIDEV-NOTE: Estado unificado: 'desativado' | 'homologacao' | 'producao'
  const [focusNFeStatus, setFocusNFeStatus] = useState<'desativado' | 'homologacao' | 'producao'>('desativado');
  
  // AIDEV-NOTE: Estado anterior para detectar mudanças
  const [previousStatus, setPreviousStatus] = useState<'desativado' | 'homologacao' | 'producao' | null>(null);
  
  // AIDEV-NOTE: Config derivada do status
  const focusNFeConfig = {
    environment: (focusNFeStatus === 'homologacao' ? 'homologacao' : 'producao') as 'homologacao' | 'producao',
    is_active: focusNFeStatus !== 'desativado',
  };
  
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  
  // AIDEV-NOTE: Quando usado dentro de outro modal (showHeader=false), não usar Dialog próprio
  const useExternalModal = !showHeader;
  
  // AIDEV-NOTE: Carregar configuração do Focus NFe
  useEffect(() => {
    const loadConfig = async () => {
      if (!tenantId) return;
      
      setIsLoadingConfig(true);
      try {
        const config = await getFocusNFeConfig(tenantId);
        if (config) {
          // AIDEV-NOTE: Determinar status baseado em is_active e environment
          if (config.is_active) {
            const status = config.environment === 'producao' ? 'producao' : 'homologacao';
            setFocusNFeStatus(status);
            // AIDEV-NOTE: Só atualizar previousStatus se ainda não foi definido
            if (previousStatus === null) {
              setPreviousStatus(status);
            }
          } else {
            setFocusNFeStatus('desativado');
            // AIDEV-NOTE: Só atualizar previousStatus se ainda não foi definido
            if (previousStatus === null) {
              setPreviousStatus('desativado');
            }
          }
        } else {
          setFocusNFeStatus('desativado');
          // AIDEV-NOTE: Só atualizar previousStatus se ainda não foi definido
          if (previousStatus === null) {
            setPreviousStatus('desativado');
          }
        }
      } catch (error) {
        console.error('[FocusNFeIntegration] Erro ao carregar configuração:', error);
        setFocusNFeStatus('desativado');
      } finally {
        setIsLoadingConfig(false);
      }
    };
    
    loadConfig();
  }, [tenantId]);
  
  // AIDEV-NOTE: Validar dados obrigatórios da empresa
  // IMPORTANTE: Campos devem corresponder exatamente aos validados na edge function
  const validateCompanyData = (empresaData: any): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    // AIDEV-NOTE: Campos obrigatórios conforme edge function handleCreateCompany
    // Campos validados: ['cnpj', 'nome', 'logradouro', 'numero', 'bairro', 'municipio', 'uf', 'cep']
    
    // CNPJ (obrigatório)
    if (!empresaData?.cnpj) {
      missingFields.push('CNPJ');
    }
    
    // Razão Social / Nome (obrigatório - edge function usa razao_social como 'nome')
    if (!empresaData?.razao_social && !empresaData?.nome) {
      missingFields.push('Razão Social');
    }
    
    // AIDEV-NOTE: Dados de endereço obrigatórios (edge function valida: logradouro, numero, bairro, municipio, uf, cep)
    if (!empresaData?.endereco?.logradouro) {
      missingFields.push('Logradouro');
    }
    if (!empresaData?.endereco?.numero) {
      missingFields.push('Número');
    }
    if (!empresaData?.endereco?.bairro) {
      missingFields.push('Bairro');
    }
    // AIDEV-NOTE: Edge function usa 'cidade' do endereco como 'municipio'
    if (!empresaData?.endereco?.cidade && !empresaData?.endereco?.municipio) {
      missingFields.push('Cidade/Município');
    }
    if (!empresaData?.endereco?.uf) {
      missingFields.push('UF');
    }
    if (!empresaData?.endereco?.cep) {
      missingFields.push('CEP');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  // AIDEV-NOTE: Verificar se empresa já existe no Focus NFe
  const checkCompanyExists = async (cnpj: string, environment: 'homologacao' | 'producao'): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return false;
      }

      const cnpjClean = cnpj.replace(/\D/g, '');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe/empresas?cnpj=${cnpjClean}&environment=${environment}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            'x-tenant-id': tenantId,
            'x-environment': environment, // AIDEV-NOTE: Informar ambiente na requisição (backup)
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // AIDEV-NOTE: Verificar se empresa foi encontrada
        if (data.found === true) {
          return true;
        }
        if (Array.isArray(data) && data.length > 0) {
          return true;
        }
        if (data.success === true && data.found === false) {
          return false;
        }
        // AIDEV-NOTE: Se retornou dados, empresa existe
        return !!data;
      }
      
      // AIDEV-NOTE: 404 significa que não encontrou
      if (response.status === 404) {
        return false;
      }
      
      return false;
    } catch (error) {
      console.warn('[FocusNFeIntegration] Erro ao verificar empresa:', error);
      // AIDEV-NOTE: Em caso de erro, assumir que não existe para tentar cadastrar
      return false;
    }
  };
  
  // AIDEV-NOTE: Salvar configuração do Focus NFe
  const handleSaveIntegration = async () => {
    if (!tenantId || !currentTenant?.id) {
      toast({
        title: "Erro",
        description: "Tenant não identificado",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingConfig(true);
    try {
      // AIDEV-NOTE: Salvar configuração
      await saveFocusNFeConfig(tenantId, {
        environment: focusNFeConfig.environment,
        is_active: focusNFeConfig.is_active,
      });
      
      // AIDEV-NOTE: Tentar cadastrar empresa apenas se:
      // 1. Está ativando pela primeira vez (anterior era 'desativado' e agora não é)
      // 2. Ou mudou de ambiente (homologação -> produção ou vice-versa)
      const isActivating = previousStatus === 'desativado' && focusNFeStatus !== 'desativado';
      const isChangingEnvironment = previousStatus !== null && 
                                    previousStatus !== 'desativado' && 
                                    focusNFeStatus !== 'desativado' && 
                                    previousStatus !== focusNFeStatus;
      
      if (focusNFeConfig.is_active && (isActivating || isChangingEnvironment)) {
        try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Sessão não encontrada');
        }
        
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('company_data')
          .eq('id', tenantId)
          .single();
        
        if (!tenantData?.company_data) {
            toast({
              title: "Dados obrigatórios faltando",
              description: "Configure os dados da empresa em Configurações > Empresa antes de ativar a integração.",
              variant: "destructive",
            });
            // AIDEV-NOTE: Reverter o salvamento se dados não estiverem completos
            await saveFocusNFeConfig(tenantId, {
              environment: focusNFeConfig.environment,
              is_active: false,
            });
            setFocusNFeStatus('desativado');
            setPreviousStatus('desativado');
            return;
        }
        
        const empresaData = tenantData.company_data as any;
        
          // AIDEV-NOTE: Validar dados obrigatórios ANTES de tentar cadastrar
          const validation = validateCompanyData(empresaData);
          if (!validation.isValid) {
            toast({
              title: "Dados obrigatórios faltando",
              description: `Preencha os seguintes campos antes de ativar: ${validation.missingFields.join(', ')}. Acesse Configurações > Empresa para preencher.`,
              variant: "destructive",
            });
            // AIDEV-NOTE: Reverter o salvamento se dados não estiverem completos
            await saveFocusNFeConfig(tenantId, {
              environment: focusNFeConfig.environment,
              is_active: false,
            });
            setFocusNFeStatus('desativado');
            setPreviousStatus('desativado');
            return;
          }

          // AIDEV-NOTE: Verificar se empresa já existe ANTES de tentar cadastrar
          const cnpj = empresaData.cnpj;
          if (!cnpj) {
            toast({
              title: "CNPJ não encontrado",
              description: "O CNPJ da empresa é obrigatório. Configure em Configurações > Empresa.",
              variant: "destructive",
            });
            await saveFocusNFeConfig(tenantId, {
              environment: focusNFeConfig.environment,
              is_active: false,
            });
            setFocusNFeStatus('desativado');
            setPreviousStatus('desativado');
            return;
          }

          // AIDEV-NOTE: Verificar se empresa já existe no Focus NFe
          const empresaExiste = await checkCompanyExists(cnpj, focusNFeConfig.environment);
          if (empresaExiste) {
            toast({
              title: "Empresa já cadastrada",
              description: `A empresa já está cadastrada no Focus NFe (${focusNFeConfig.environment === 'producao' ? 'Produção' : 'Homologação'}). A integração foi ativada com sucesso.`,
              variant: "default",
            });
            // AIDEV-NOTE: Atualizar status anterior
            setPreviousStatus(focusNFeStatus);
            return;
          }
          
          // AIDEV-NOTE: Tentar cadastrar empresa apenas se não existir
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/focusnfe/empresas/create`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
              'x-tenant-id': tenantId,
            },
            body: JSON.stringify({
              company_data: empresaData,
              environment: focusNFeConfig.environment,
            }),
          }
        );
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.message || 'Erro ao cadastrar empresa no Focus NFe';
            
            // AIDEV-NOTE: Se for 404, pode ser que o endpoint não exista ou a API não suporte
            if (response.status === 404) {
              console.warn('[FocusNFeIntegration] Endpoint de cadastro de empresa não disponível:', errorMessage);
              toast({
                title: "Aviso",
                description: "Não foi possível cadastrar a empresa automaticamente. Você pode cadastrar manualmente no painel do Focus NFe.",
                variant: "default",
              });
            } else {
              throw new Error(errorMessage);
            }
          } else {
        toast({
          title: "Integração ativada",
          description: "Empresa cadastrada no Focus NFe com sucesso",
        });
      }
        } catch (error) {
          // AIDEV-NOTE: Não falhar a operação principal se houver erro ao cadastrar empresa
          console.warn('[FocusNFeIntegration] Erro ao cadastrar empresa (não crítico):', error);
          toast({
            title: "Aviso",
            description: error instanceof Error ? error.message : "Integração salva, mas não foi possível cadastrar a empresa automaticamente.",
            variant: "default",
          });
        }
      }
      
      // AIDEV-NOTE: Atualizar status anterior
      setPreviousStatus(focusNFeStatus);
      
      if (!useExternalModal) {
        setIsIntegrationModalOpen(false);
      }
      
      // AIDEV-NOTE: Chamar onToggle com o status correto
      onToggle?.(focusNFeConfig.is_active);
      
      // AIDEV-NOTE: Chamar onSave se fornecido (para modal externo)
      if (onSave) {
        await onSave();
      }
      
      toast({
        title: "Configuração salva",
        description: `Integração Focus NFe ${focusNFeStatus === 'desativado' ? 'desativada' : `ativada em ${focusNFeStatus === 'producao' ? 'produção' : 'homologação'}`}`,
      });
    } catch (error) {
      console.error('[FocusNFeIntegration] Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };
  
  
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Focus NFe - Emissão Fiscal
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure a integração para emissão de notas fiscais eletrônicas
            </p>
          </div>
          <Badge variant={focusNFeConfig.is_active ? "default" : "secondary"}>
            {focusNFeConfig.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      )}
      
      
      {/* AIDEV-NOTE: Modal de configuração - apenas se não estiver em modal externo */}
      {!useExternalModal ? (
        <Dialog open={isIntegrationModalOpen} onOpenChange={setIsIntegrationModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Configurar Integração FocusNFe</DialogTitle>
              <DialogDescription>
                Selecione o status da integração Focus NFe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
            {/* AIDEV-NOTE: Seleção de status (Desativado, Homologação, Produção) */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Status da Integração</Label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setFocusNFeStatus('desativado')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    focusNFeStatus === 'desativado'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Desativado</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Integração desativada
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFocusNFeStatus('homologacao')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    focusNFeStatus === 'homologacao'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Homologação</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Ambiente de testes - Integração ativa
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFocusNFeStatus('producao')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    focusNFeStatus === 'producao'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Produção</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Ambiente real - Integração ativa
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsIntegrationModalOpen(false)} variant="outline">
              Fechar
            </Button>
            <Button onClick={handleSaveIntegration} disabled={isSavingConfig}>
              {isSavingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      ) : (
        // AIDEV-NOTE: Conteúdo do modal quando usado dentro de outro Dialog
        <div className="space-y-6 py-4">
          {/* AIDEV-NOTE: Seleção de status (Desativado, Homologação, Produção) */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Status da Integração</Label>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setFocusNFeStatus('desativado')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  focusNFeStatus === 'desativado'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">Desativado</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Integração desativada
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFocusNFeStatus('homologacao')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  focusNFeStatus === 'homologacao'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">Homologação</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Ambiente de testes - Integração ativa
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFocusNFeStatus('producao')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  focusNFeStatus === 'producao'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium">Produção</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Ambiente real - Integração ativa
                </div>
              </button>
            </div>
          </div>
          
          {/* AIDEV-NOTE: Botão Salvar quando usado em modal externo */}
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={handleSaveIntegration} disabled={isSavingConfig} className="w-full">
              {isSavingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

