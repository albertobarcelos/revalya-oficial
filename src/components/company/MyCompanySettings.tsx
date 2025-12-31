/**
 * Componente principal de configuração de dados da empresa
 * AIDEV-NOTE: Refatorado seguindo padrões clean code
 * - Separação de responsabilidades
 * - Componentes menores e reutilizáveis
 * - Hooks customizados para lógica de negócio
 * - Constantes e schemas separados
 */

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companyDataSchema, type CompanyDataForm } from "./schemas";
import { COMPANY_TABS, type CompanyTab } from "./constants";
import { useCompanyData, useSaveCompanyData, mapCompanyDataToForm } from "./hooks/useCompanyData";
import { CompanyBasicInfo } from "./components/CompanyBasicInfo";
import { AddressTab } from "./components/tabs/AddressTab";
import { ContactTab } from "./components/tabs/ContactTab";
import { RegistrationsTab } from "./components/tabs/RegistrationsTab";
import { DigitalCertificateTab } from "./components/tabs/DigitalCertificateTab";
import { NFeProductTab } from "./components/tabs/FiscalTabs";
import { NFeServiceTab } from "./components/tabs/NFeServiceTab";
import { getFocusNFeConfig } from "@/services/focusnfeCityService";

// AIDEV-NOTE: Valores padrão do formulário
const DEFAULT_FORM_VALUES: Partial<CompanyDataForm> = {
  cnpj: "",
  razao_social: "",
  nome_fantasia: "",
  ddd: "",
  telefone: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  ddd_telefone2: "",
  telefone2: "",
  ddd_fax: "",
  fax: "",
  email: "",
  website: "",
  data_abertura: "",
  inscricao_estadual: "",
  inscricao_municipal: "",
  tipo_atividade: "",
  regime_tributario: "",
  cnae_principal: "",
  receita_bruta_12_meses: "",
};

export function MyCompanySettings() {
  const { toast } = useToast();
  const { hasAccess, currentTenant } = useTenantAccessGuard();
  const [activeTab, setActiveTab] = useState<CompanyTab>(COMPANY_TABS.ENDERECO);
  const [isSaving, setIsSaving] = useState(false);
  const [isFocusNFeActive, setIsFocusNFeActive] = useState(false);

  // AIDEV-NOTE: Hook customizado para buscar dados da empresa
  const {
    data: companyData,
    isLoading,
    refetch
  } = useCompanyData(currentTenant?.id);

  // AIDEV-NOTE: Hook customizado para salvar dados
  const { saveCompanyData } = useSaveCompanyData();

  // AIDEV-NOTE: Formulário com validação
  const form = useForm<CompanyDataForm>({
    resolver: zodResolver(companyDataSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  // AIDEV-NOTE: Carregar dados quando disponíveis
  useEffect(() => {
    if (!companyData) return;
    
    const data = companyData as { company_data?: any };
    
    if (data.company_data) {
      const formData = mapCompanyDataToForm(data.company_data);
      form.reset(formData);
    }
  }, [companyData, form]);

  // AIDEV-NOTE: Verificar se integração Focus NFe está ativa
  useEffect(() => {
    const checkFocusNFeStatus = async () => {
      if (!currentTenant?.id) return;
      
      try {
        const config = await getFocusNFeConfig(currentTenant.id);
        setIsFocusNFeActive(config?.is_active || false);
      } catch (error) {
        console.error('[MyCompanySettings] Erro ao verificar Focus NFe:', error);
        setIsFocusNFeActive(false);
      }
    };
    
    checkFocusNFeStatus();
    
    // AIDEV-NOTE: Ouvir evento de mudança na integração (atualização imediata)
    const handleIntegrationChange = (event: CustomEvent) => {
      setIsFocusNFeActive(event.detail.isActive);
    };
    
    window.addEventListener('focusnfe-integration-changed', handleIntegrationChange as EventListener);
    
    // AIDEV-NOTE: Verificar novamente a cada 5 segundos (fallback)
    const interval = setInterval(checkFocusNFeStatus, 5000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focusnfe-integration-changed', handleIntegrationChange as EventListener);
    };
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Handler para salvar dados
  const handleSave = async (data: CompanyDataForm) => {
    if (!currentTenant?.id) {
      toast({
        title: "Erro",
        description: "Tenant não identificado",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveCompanyData(currentTenant.id, data);

      // AIDEV-NOTE: Verificar se sincronização com Focus NFe foi realizada
      const focusNFeConfig = await getFocusNFeConfig(currentTenant.id);
      const syncMessage = focusNFeConfig?.is_active
        ? " As informações foram sincronizadas com o Focus NFe."
        : "";
      
      toast({
        title: "Dados salvos",
        description: `As informações da empresa foram salvas com sucesso.${syncMessage}`,
      });

      refetch();
    } catch (error: any) {
      console.error("Erro ao salvar dados da empresa:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // AIDEV-NOTE: Handler para pesquisa por CNPJ
  const handleSearchCNPJ = async () => {
    const cnpj = form.getValues("cnpj");
    if (!cnpj) {
      toast({
        title: "CNPJ não informado",
        description: "Por favor, informe o CNPJ antes de pesquisar.",
        variant: "destructive",
      });
      return;
    }

    // Remove formatação do CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    
    if (cnpjLimpo.length !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "O CNPJ deve ter 14 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      // AIDEV-NOTE: Importar dinamicamente para evitar problemas de dependência circular
      const { consultarCNPJ } = await import("@/services/cnpjService");
      
      const cnpjData = await consultarCNPJ(cnpjLimpo);
      
      if (cnpjData) {
        // AIDEV-NOTE: Mapear dados do CNPJ para o formulário
        form.setValue("razao_social", cnpjData.razao_social || "");
        form.setValue("nome_fantasia", cnpjData.nome_fantasia || "");
        form.setValue("logradouro", cnpjData.logradouro || "");
        form.setValue("numero", cnpjData.numero || "");
        form.setValue("complemento", cnpjData.complemento || "");
        form.setValue("bairro", cnpjData.bairro || "");
        form.setValue("cidade", cnpjData.municipio || "");
        form.setValue("uf", cnpjData.uf || "");
        form.setValue("cep", cnpjData.cep || "");
        
        // AIDEV-NOTE: Processar telefone (pode vir com DDD ou sem)
        if (cnpjData.ddd_telefone_1) {
          const telefoneCompleto = cnpjData.ddd_telefone_1.replace(/\D/g, "");
          if (telefoneCompleto.length >= 10) {
            form.setValue("ddd", telefoneCompleto.substring(0, 2));
            form.setValue("telefone", telefoneCompleto.substring(2));
          }
        } else if (cnpjData.telefone) {
          // Fallback para formato antigo
          const telefoneCompleto = cnpjData.telefone.replace(/\D/g, "");
          if (telefoneCompleto.length >= 10) {
            form.setValue("ddd", telefoneCompleto.substring(0, 2));
            form.setValue("telefone", telefoneCompleto.substring(2));
          }
        }
        
        // AIDEV-NOTE: Processar telefone secundário
        if (cnpjData.ddd_telefone_2) {
          const telefone2Completo = cnpjData.ddd_telefone_2.replace(/\D/g, "");
          if (telefone2Completo.length >= 10) {
            form.setValue("ddd_telefone2", telefone2Completo.substring(0, 2));
            form.setValue("telefone2", telefone2Completo.substring(2));
          }
        }
        
        // AIDEV-NOTE: Processar fax
        if (cnpjData.ddd_fax) {
          const faxCompleto = cnpjData.ddd_fax.replace(/\D/g, "");
          if (faxCompleto.length >= 10) {
            form.setValue("ddd_fax", faxCompleto.substring(0, 2));
            form.setValue("fax", faxCompleto.substring(2));
          }
        }
        
        // AIDEV-NOTE: Processar email
        if (cnpjData.email) {
          form.setValue("email", cnpjData.email);
        }
        
        // AIDEV-NOTE: Processar CNAE principal (se disponível na API)
        if (cnpjData.atividade_principal && cnpjData.atividade_principal.length > 0) {
          const cnaePrincipal = cnpjData.atividade_principal[0]?.code;
          if (cnaePrincipal) {
            form.setValue("cnae_principal", cnaePrincipal);
          }
        }
        
        toast({
          title: "Dados encontrados!",
          description: `Empresa: ${cnpjData.razao_social}`,
        });
      }
    } catch (error: any) {
      console.error("Erro ao consultar CNPJ:", error);
      toast({
        title: "Erro na consulta",
        description: error.message || "Não foi possível consultar o CNPJ.",
        variant: "destructive",
      });
    }
  };

  const handleSearchAddress = () => {
    toast({
      title: "Pesquisar Endereço",
      description: "Funcionalidade será implementada.",
    });
  };

  const handleSearchCEP = () => {
    toast({
      title: "Pesquisar CEP",
      description: "Funcionalidade será implementada.",
    });
  };

  // AIDEV-NOTE: Early returns para estados de loading e erro
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-red-600">Acesso negado</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Carregando dados da empresa...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da Minha Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* Seção de Identificação da Empresa */}
            <CompanyBasicInfo
              form={form}
              onSearchCNPJ={handleSearchCNPJ}
            />

            {/* Abas de Configuração */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CompanyTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
                <TabsTrigger value={COMPANY_TABS.ENDERECO}>Endereço</TabsTrigger>
                <TabsTrigger value={COMPANY_TABS.TELEFONES_EMAIL}>Telefones e E-mail</TabsTrigger>
                <TabsTrigger value={COMPANY_TABS.INSCRICOES}>Inscrições, CNAE e Outros</TabsTrigger>
                {/* AIDEV-NOTE: Aba de Certificado Digital só aparece se integração Focus NFe estiver ativa */}
                {isFocusNFeActive && (
                  <TabsTrigger value={COMPANY_TABS.CERTIFICADO_DIGITAL}>Certificado Digital</TabsTrigger>
                )}
                <TabsTrigger value={COMPANY_TABS.NFE_PRODUTO}>Nota Fiscal de Produto</TabsTrigger>
                <TabsTrigger value={COMPANY_TABS.NFE_SERVICO}>Nota Fiscal de Serviço</TabsTrigger>
              </TabsList>

              <TabsContent value={COMPANY_TABS.ENDERECO} className="space-y-4 mt-4">
                <AddressTab
                  form={form}
                  onSearchAddress={handleSearchAddress}
                  onSearchCEP={handleSearchCEP}
                />
              </TabsContent>

              <TabsContent value={COMPANY_TABS.TELEFONES_EMAIL} className="space-y-4 mt-4">
                <ContactTab form={form} />
              </TabsContent>

              <TabsContent value={COMPANY_TABS.INSCRICOES} className="space-y-4 mt-4">
                <RegistrationsTab form={form} />
              </TabsContent>

              {/* AIDEV-NOTE: Aba de Certificado Digital só aparece se integração Focus NFe estiver ativa */}
              {isFocusNFeActive && (
                <TabsContent value={COMPANY_TABS.CERTIFICADO_DIGITAL} className="space-y-4 mt-4">
                  <DigitalCertificateTab
                    form={form}
                    razaoSocial={form.watch("razao_social")}
                    cnpj={form.watch("cnpj")}
                  />
                </TabsContent>
              )}

              <TabsContent value={COMPANY_TABS.NFE_PRODUTO} className="space-y-4 mt-4">
                <NFeProductTab />
              </TabsContent>

              <TabsContent value={COMPANY_TABS.NFE_SERVICO} className="space-y-4 mt-4">
                <NFeServiceTab form={form} />
              </TabsContent>
            </Tabs>

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
