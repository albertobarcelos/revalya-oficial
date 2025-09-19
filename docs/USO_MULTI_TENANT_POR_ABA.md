# Guia de Uso do Sistema Multi-Tenant por Aba

## Visão Geral

Este documento apresenta um guia prático sobre como utilizar o novo sistema multi-tenant com isolamento por aba, que resolve problemas de conflito de contexto e melhora a segurança da aplicação.

## Como Funciona

O fluxo de acesso segue estas etapas:

1. **Seleção do Tenant**: Na página de seleção de portal, o usuário clica no botão "Acessar" de um tenant
2. **Geração de Código**: O sistema gera um código de acesso único (one-time code)
3. **Nova Aba**: Uma nova aba é aberta com URL `/t/{slug}?code={code}`
4. **Troca por Token**: O código é trocado por um token JWT com claim de tenant_id
5. **Armazenamento Isolado**: O token é armazenado apenas no sessionStorage da aba específica

## Como Usar em Componentes

### Acessando um Tenant

Para permitir que um usuário acesse um tenant em uma nova aba:

```tsx
import { useTenantAccess } from '@/data/hooks/useTenantAccess';

function SeuComponente() {
  const { openTenantInNewTab } = useTenantAccess();
  
  const handleAcessoTenant = async (tenantId: string) => {
    const result = await openTenantInNewTab(tenantId);
    if (!result.success) {
      // Tratar erro
      console.error("Erro ao abrir tenant:", result.error);
    }
  };
  
  return (
    <button onClick={() => handleAcessoTenant("id-do-tenant")}>
      Acessar Tenant
    </button>
  );
}
```

### Processando o Código de Acesso

O componente `TenantCodeHandler` cuida do processamento do código na URL:

```tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenantAccess } from '@/data/hooks/useTenantAccess';

function TenantPageComHandler() {
  const [searchParams] = useSearchParams();
  const { exchangeAccessCode } = useTenantAccess();
  const code = searchParams.get('code');
  const slug = /* obter da URL */;
  
  useEffect(() => {
    if (code && slug) {
      const processCode = async () => {
        const result = await exchangeAccessCode(code, slug);
        if (result.success) {
          // Token armazenado, continuar com a aplicação
        } else {
          // Redirecionar para login ou mostrar erro
        }
      };
      
      processCode();
    }
  }, [code, slug, exchangeAccessCode]);
  
  // Resto do componente
}
```

### Usando o apiClient

O `apiClient` adiciona automaticamente o token em todas as requisições:

```tsx
import { apiClient } from '@/lib/apiClient';

async function fetchData() {
  try {
    // O token será injetado automaticamente pelo interceptor
    const response = await apiClient.get('/api/resource');
    return response.data;
  } catch (error) {
    // Tratamento de erro
  }
}
```

## TanStack Query com Namespace por Tenant

Os hooks de consulta usam namespace por tenant para evitar conflitos:

```tsx
// Exemplo de hook com namespace por tenant
function useResourceQuery(params) {
  const tenant = apiClient.getCurrentTenant();
  const tenantSlug = tenant?.slug;
  
  // Incluir o slug do tenant na query key para isolamento
  return useQuery({
    queryKey: ['resource', tenantSlug, params],
    queryFn: () => apiClient.get('/api/resource', { params }),
    enabled: !!tenantSlug // Só executa se houver um tenant ativo
  });
}
```

## Segurança e Considerações

- Os tokens JWT têm duração curta (15-30 minutos) e são específicos por tenant
- O sistema implementa revogação de tokens via incremento de `token_version`
- Todas as operações são auditadas nos logs de segurança
- Políticas RLS no banco de dados garantem isolamento mesmo em caso de falha

## Depuração

Para depuração:

1. Verificar tokens no sessionStorage (DevTools → Application → Storage → Session Storage)
2. Checar logs de console com prefixo `[useTenantAccess]` ou `[tokenManager]`
3. Analisar logs de segurança no painel administrativo
4. Utilizar as ferramentas de dev do TanStack Query para verificar o estado das consultas

## Suporte a Navegadores Antigos

O sistema depende de:
- `sessionStorage` API (IE 8+)
- `fetch` API (pode precisar de polyfill em IE11)
- ES6+ features (async/await, arrow functions)

Garantimos compatibilidade com:
- Chrome/Edge 80+
- Firefox 72+
- Safari 13.1+
