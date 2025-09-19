import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { logService } from "@/services/logService";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const MODULE_NAME = 'IntegrationServices';

interface IntegrationServicesProps {
  tenantId: string;
  tenantSlug: string;
  onToggle?: (service: string, enabled: boolean) => void;
}

export function IntegrationServices({ tenantId, tenantSlug, onToggle }: IntegrationServicesProps) {
  const { toast } = useToast();
  
  // Estado para os serviços
  const [servicosAtivos, setServicosAtivos] = useState<Record<string, boolean>>({
    asaas: false,
    cora: false,
    omie: false,
    contaazul: false,
  });
  
  const [loadingServicos, setLoadingServicos] = useState<Record<string, boolean>>({
    asaas: false,
    cora: false,
    omie: false,
    contaazul: false,
  });

  // Função para carregar o estado dos serviços de integração
  const carregarEstadoServicos = async () => {
    if (!tenantId) {
      logService.warn(MODULE_NAME, 'TenantId não fornecido, não é possível carregar estado dos serviços');
      return;
    }
    
    try {
      logService.info(MODULE_NAME, `Carregando estado inicial dos serviços para tenant ${tenantId}`);
      
      // Verificar integrações ativas
      const { data: integrations, error } = await supabase
        .from('tenant_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('integration_type', ['asaas', 'cora', 'omie', 'contaazul']);
        
      if (error) {
        logService.error(MODULE_NAME, `Erro ao buscar integrações: ${error.message}`);
        return;
      }
      
      // Definir estados iniciais dos serviços a partir dos dados do banco
      const novoEstado = { ...servicosAtivos };
      
      if (integrations && integrations.length > 0) {
        integrations.forEach(integration => {
          if (integration.integration_type in novoEstado) {
            novoEstado[integration.integration_type] = integration.is_enabled;
          }
        });
      }
      
      setServicosAtivos(novoEstado);
      
    } catch (error) {
      logService.error(MODULE_NAME, 'Erro ao carregar estado dos serviços:', error);
    }
  };
  
  // Carregar estado inicial dos serviços
  useEffect(() => {
    carregarEstadoServicos();
  }, [tenantId]);

  const handleToggle = async (servico: keyof typeof servicosAtivos) => {
    // Não permitir ativar serviços "em breve"
    toast({
      title: "Funcionalidade em breve",
      description: `A integração com ${servico.toUpperCase()} estará disponível em breve.`,
      variant: "default",
    });
    return;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrações com Sistemas</h2>
        <p className="text-muted-foreground">Configure as integrações com sistemas financeiros e de gestão.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* AsaaS */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
          
          <div className="rounded-full bg-blue-100 p-3 mb-4">
            <img 
              src="https://www.asaas.com/wp-content/uploads/2023/12/logo-asaas-colorido.svg" 
              alt="AsaaS" 
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/blue/white?text=A';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">AsaaS</h3>
          
          <div className="mt-4 flex items-center gap-2">
            <Switch
              checked={servicosAtivos.asaas}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('asaas');
              }}
              disabled={loadingServicos.asaas}
            />
            {loadingServicos.asaas ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.asaas ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>

        {/* Cora */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
          
          <div className="rounded-full bg-purple-100 p-3 mb-4">
            <img 
              src="https://cora.com.br/wp-content/uploads/2021/12/LogoCora.png" 
              alt="Cora" 
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/purple/white?text=C';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">Cora</h3>
          
          <div className="mt-4 flex items-center gap-2">
            <Switch
              checked={servicosAtivos.cora}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('cora');
              }}
              disabled={loadingServicos.cora}
            />
            {loadingServicos.cora ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.cora ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>

        {/* Omie */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
          
          <div className="rounded-full bg-green-100 p-3 mb-4">
            <img 
              src="https://play-lh.googleusercontent.com/jgaOuXsZ6u_dgsWiV4FZI1TfvNl2mUUVMQx4DYtLQXW0JxFbwUvvYFbQcuE-5wXoQvk" 
              alt="Omie" 
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/green/white?text=O';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">Omie</h3>
          
          <div className="mt-4 flex items-center gap-2">
            <Switch
              checked={servicosAtivos.omie}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('omie');
              }}
              disabled={loadingServicos.omie}
            />
            {loadingServicos.omie ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.omie ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>

        {/* Conta Azul */}
        <div className="border rounded-lg p-6 flex flex-col items-center relative cursor-pointer">
          <Badge className="absolute top-3 right-3 bg-amber-500">Em breve</Badge>
          
          <div className="rounded-full bg-cyan-100 p-3 mb-4">
            <img 
              src="https://www.4linux.com.br/wp-content/uploads/2023/01/logo-conta-azul.png" 
              alt="Conta Azul" 
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/64x64/cyan/white?text=CA';
              }}
            />
          </div>
          
          <h3 className="font-semibold mb-1">Conta Azul</h3>
          
          <div className="mt-4 flex items-center gap-2">
            <Switch
              checked={servicosAtivos.contaazul}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle('contaazul');
              }}
              disabled={loadingServicos.contaazul}
            />
            {loadingServicos.contaazul ? (
              <span className="text-sm text-muted-foreground flex items-center gap-2 ml-2">
                <Spinner size="sm" /> Processando...
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {servicosAtivos.contaazul ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
