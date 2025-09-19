/**
 * Componente para inicializar sessão do tenant a partir de um código na URL
 * Este componente deve ser usado na página de entrada do tenant (/:slug)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTenantAccess } from '@/data/hooks/useTenantAccess';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Armazenamento do token por aba
const storeTenantToken = (tenantId: string, tenantSlug: string, token: any) => {
  try {
    // Salvar no sessionStorage (escopo por aba)
    sessionStorage.setItem('tenant_token', JSON.stringify({
      tenant_id: tenantId,
      tenant_slug: tenantSlug,
      token: token,
      timestamp: Date.now()
    }));
    return true;
  } catch (error) {
    console.error('Erro ao salvar token do tenant:', error);
    return false;
  }
};

// Componente para processar o code da URL e inicializar o tenant
export function TenantCodeHandler({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { exchangeAccessCode } = useTenantAccess();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    
    // Se não tiver código, verificar se já temos token na sessão
    if (!code) {
      const storedToken = sessionStorage.getItem('tenant_token');
      if (!storedToken) {
        setError('Acesso inválido. Por favor, acesse através do Portal.');
      }
      return;
    }

    // Evitar processamento duplo
    if (hasProcessed.current || isProcessing) {
      console.log('[TenantCodeHandler] Processamento já em andamento, ignorando...');
      return;
    }

    const processCode = async () => {
      if (hasProcessed.current) return;
      
      hasProcessed.current = true;
      setIsProcessing(true);
      setError(null);
      
      console.log('[TenantCodeHandler] Iniciando processamento do código:', code.substring(0, 8) + '...');
      
      try {
        // Obter slug da URL atual (nova estrutura sem /t/)
        const currentPath = window.location.pathname;
        const slugMatch = currentPath.match(/^\/([^\/\?]+)/);
        const slug = slugMatch ? slugMatch[1] : '';
        
        console.log('[TenantCodeHandler] Path atual:', currentPath, 'Slug extraído:', slug);
        
        if (!slug) {
          throw new Error('Slug do tenant não encontrado na URL');
        }
        
        // Verificar se já existe token para este tenant
        const existingToken = sessionStorage.getItem('tenant_token');
        if (existingToken) {
          const parsed = JSON.parse(existingToken);
          if (parsed.tenant_slug === slug) {
            console.log('[TenantCodeHandler] Token já existe para este tenant, redirecionando...');
            navigate(`/${slug}/dashboard`, { replace: true });
            return;
          }
        }
        
        // Trocar o código por um token
        console.log('[TenantCodeHandler] Trocando código por token...');
        const result = await exchangeAccessCode(code, slug);
        
        if (!result.success) {
          throw new Error(result.error || 'Erro ao processar código de acesso');
        }
        
        // Armazenar o token na sessão atual
        const stored = storeTenantToken(
          result.tenant_id!,
          result.tenant_slug!,
          result
        );
        
        if (!stored) {
          throw new Error('Não foi possível armazenar o token do tenant');
        }
        
        console.log('[TenantCodeHandler] Token armazenado com sucesso, redirecionando...');
        
        // Remover o código da URL para evitar reuso
        setSearchParams({}, { replace: true });
        
        // Aguardar um momento antes de redirecionar para garantir que tudo está salvo
        setTimeout(() => {
          navigate(`/${slug}/dashboard`, { replace: true });
        }, 100);
        
      } catch (err: any) {
        console.error('[TenantCodeHandler] Erro ao processar código:', err);
        setError(err.message || 'Erro ao processar código de acesso');
        hasProcessed.current = false; // Permitir retry em caso de erro
      } finally {
        setIsProcessing(false);
      }
    };

    processCode();
  }, []); // Dependências removidas para evitar re-execução

  // Exibir carregamento durante o processamento
  if (isProcessing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">Inicializando tenant...</h1>
            <p className="text-sm text-muted-foreground">
              Por favor, aguarde enquanto configuramos seu acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Exibir erro se houver
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de acesso</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <Button 
            className="w-full" 
            onClick={() => window.location.href = '/meus-aplicativos'}
          >
            Voltar para o Portal
          </Button>
        </div>
      </div>
    );
  }

  // Se não estiver processando e não houver erro, renderizar os filhos
  return <>{children}</>;
}
