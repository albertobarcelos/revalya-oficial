import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, MessageCircle, Phone, Copy, AlertCircle, FileText } from "lucide-react";
import { aplicarTemplate } from "@/services/reguaCobrancaTemplateService";
import { useTenantAccessGuard } from '@/hooks/useTenantAccessGuard';

interface TemplateItem {
  id: string;
  nome: string;
  descricao: string;
  escopo: string;
  etapas: Array<{
    id: string;
    posicao: number;
    gatilho: string;
    dias: number;
    canal: string;
    mensagem: string;
  }>;
}

interface TemplateSelectorProps {
  tenantId: string;
  onTemplateApplied: () => void;
}

export function TemplateSelector({ tenantId, onTemplateApplied }: TemplateSelectorProps) {
  const { toast } = useToast();
  
  // AIDEV-NOTE: Hook de segurança multi-tenant para validar acesso
  const { currentTenant, hasAccess } = useTenantAccessGuard(tenantId);
  
  // AIDEV-NOTE: Verificação de acesso antes de qualquer operação
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Acesso negado. Você não tem permissão para acessar os templates.
          </div>
        </CardContent>
      </Card>
    );
  }
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [tenantId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // AIDEV-NOTE: Buscar templates com validação dupla de tenant_id
      const { data: templatesData, error } = await supabase
        .from('regua_cobranca_templates')
        .select('*')
        .or(`escopo.eq.GLOBAL,and(escopo.eq.TENANT,tenant_id.eq.${currentTenant.id})`);
      
      if (error) throw error;
      
      if (!templatesData || templatesData.length === 0) {
        setTemplates([]);
        setIsLoading(false);
        return;
      }
      
      // 2. Para cada template, buscar suas etapas
      const templatesWithEtapas = await Promise.all(
        templatesData.map(async (template) => {
          // AIDEV-NOTE: Buscar etapas com validação dupla de tenant_id quando aplicável
          let etapasQuery = supabase
            .from('regua_cobranca_template_etapas')
            .select('*')
            .eq('template_id', template.id);
          
          // Se o template é específico do tenant, validar tenant_id nas etapas também
          if (template.escopo === 'TENANT') {
            etapasQuery = etapasQuery.eq('tenant_id', currentTenant.id);
          }
          
          const { data: etapas, error: etapasError } = await etapasQuery
            .order('posicao', { ascending: true });
          
          if (etapasError) {
            console.error(`Erro ao buscar etapas do template ${template.id}:`, etapasError);
            return {
              ...template,
              etapas: []
            };
          }
          
          return {
            ...template,
            etapas: etapas || []
          };
        })
      );
      
      setTemplates(templatesWithEtapas);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar templates",
        description: "Não foi possível carregar os templates disponíveis."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setApplying(templateId);
    try {
      const result = await aplicarTemplate(tenantId, templateId);
      
      if (result.sucesso) {
        toast({
          title: "Template aplicado com sucesso",
          description: result.mensagem,
          duration: 5000,
        });
        onTemplateApplied();
      } else {
        throw new Error(result.mensagem);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao aplicar template",
        description: error.message || "Ocorreu um erro ao aplicar o template."
      });
    } finally {
      setApplying(null);
    }
  };

  const getIconForChannel = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4 text-success" />;
      case 'email':
        return <Mail className="h-4 w-4 text-primary" />;
      case 'sms':
        return <Phone className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getTriggerText = (trigger: string, days: number) => {
    switch (trigger) {
      case 'antes_vencimento':
        return `${days} dias antes do vencimento`;
      case 'no_vencimento':
        return 'No dia do vencimento';
      case 'apos_vencimento':
        return `${days} dias após o vencimento`;
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Carregando templates...</p>
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">Templates Globais</TabsTrigger>
          <TabsTrigger value="custom">Templates Personalizados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="global" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates
              .filter(t => t.escopo === 'GLOBAL')
              .map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate === template.id ? 'border-2 border-primary' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{template.nome}</CardTitle>
                      <Badge variant="secondary">Global</Badge>
                    </div>
                    <CardDescription>{template.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      {template.etapas.map((etapa) => (
                        <div key={etapa.id} className="flex items-center gap-2 text-sm">
                          {getIconForChannel(etapa.canal)}
                          <span className="font-medium">{getTriggerText(etapa.gatilho, etapa.dias)}</span>
                          <span className="text-muted-foreground truncate max-w-[180px]">
                            {etapa.mensagem.substring(0, 30)}
                            {etapa.mensagem.length > 30 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full flex items-center gap-2"
                      onClick={() => handleApplyTemplate(template.id)}
                      disabled={applying === template.id}
                    >
                      {applying === template.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Usar este template
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
          
          {templates.filter(t => t.escopo === 'GLOBAL').length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="font-medium">Sem templates globais</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Não há templates globais disponíveis no momento.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="custom" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates
              .filter(t => t.escopo === 'TENANT' && t.tenant_id === tenantId)
              .map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate === template.id ? 'border-2 border-primary' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{template.nome}</CardTitle>
                      <Badge>Personalizado</Badge>
                    </div>
                    <CardDescription>{template.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      {template.etapas.map((etapa) => (
                        <div key={etapa.id} className="flex items-center gap-2 text-sm">
                          {getIconForChannel(etapa.canal)}
                          <span className="font-medium">{getTriggerText(etapa.gatilho, etapa.dias)}</span>
                          <span className="text-muted-foreground truncate max-w-[180px]">
                            {etapa.mensagem.substring(0, 30)}
                            {etapa.mensagem.length > 30 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full flex items-center gap-2"
                      onClick={() => handleApplyTemplate(template.id)}
                      disabled={applying === template.id}
                    >
                      {applying === template.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aplicando...
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Usar este template
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
          </div>
          
          {templates.filter(t => t.escopo === 'TENANT' && t.tenant_id === tenantId).length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="font-medium">Sem templates personalizados</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Você ainda não criou templates personalizados. Você pode salvar suas configurações como template para usar novamente no futuro.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {selectedTemplate && (
        <div className="mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Aplicar este template irá substituir todas as etapas existentes na sua régua de cobrança.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
