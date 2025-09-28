# 🔐 Guia Completo: Implementação Segura Multi-Tenant

## 1. Product Overview

Este documento define a arquitetura e padrões obrigatórios para implementação segura de funcionalidades multi-tenant no sistema Revalya. O guia estabelece 5 camadas de segurança que garantem isolamento completo de dados entre diferentes tenants, prevenindo vazamentos de informações e violações de segurança.

O sistema multi-tenant permite que múltiplas empresas (tenants) utilizem a mesma aplicação de forma completamente isolada, onde cada tenant só pode acessar seus próprios dados. Esta arquitetura é crítica para manter a confiança e conformidade regulatória do sistema.

## 2. Core Features

### 2.1 Arquitetura de 5 Camadas de Segurança

**CAMADA 1: Zustand Store (Estado Global)**

```typescript
interface TenantState {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  userRole: string | null;
  isLoading: boolean;
}
```

**CAMADA 2: SessionStorage (Isolamento por Aba)**

```typescript
sessionStorage.setItem('tenant_context', JSON.stringify({
  tenantId: 'uuid-tenant',
  tenantSlug: 'empresa-abc',
  userRole: 'ADMIN',
  expiresAt: timestamp
}));
```

**CAMADA 3: React Query (Cache Isolado)**

```typescript
queryKey: ['contratos', currentTenant?.id] // SEMPRE incluir tenant_id
```

**CAMADA 4: Supabase RLS (Row Level Security)**

```sql
CREATE POLICY "tenant_isolation" ON contratos
FOR ALL USING (tenant_id = get_current_tenant_id());
```

**CAMADA 5: Validação Dupla no Frontend**

```typescript
// Validar antes da query E depois do resultado
if (!currentTenant?.id) throw new Error('Tenant não definido');
const invalidData = data?.filter(item => item.tenant_id !== tenantId);
if (invalidData?.length > 0) throw new Error('Violação de segurança');
```

### 2.2 Feature Module

Nosso sistema de segurança multi-tenant consiste nas seguintes funcionalidades principais:

1. **Hook Seguro de Consultas**: useSecureTenantQuery para todas as operações de leitura
2. **Guard de Acesso**: useTenantAccessGuard para validação de permissões
3. **Mutações Seguras**: useSecureTenantMutation para operações de escrita
4. **Sistema de Auditoria**: Logs obrigatórios para rastreamento de acesso
5. **Validação de Cache**: Isolamento completo de dados no React Query

### 2.3 Page Details

| Componente              | Módulo              | Descrição da Funcionalidade                                                                                |
| ----------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| useSecureTenantQuery    | Hooks Seguros       | Hook obrigatório para todas as consultas, inclui validação automática de tenant\_id e filtros de segurança |
| useTenantAccessGuard    | Validação de Acesso | Validação crítica antes de renderizar qualquer página, verifica permissões e tenant ativo                  |
| useSecureTenantMutation | Mutações Seguras    | Hook para operações de escrita com validação dupla e inserção automática de tenant\_id                     |
| Sistema de Auditoria    | Monitoramento       | Logs obrigatórios para acesso a páginas, consultas de dados e operações críticas                           |
| Cache Isolado           | React Query         | Estrutura padronizada de query keys que sempre inclui tenant\_id para isolamento                           |

## 3. Core Process

### Fluxo Principal de Segurança Multi-Tenant

1. **Inicialização**: Usuário faz login e seleciona tenant
2. **Validação de Acesso**: useTenantAccessGuard verifica permissões
3. **Consulta Segura**: useSecureTenantQuery executa query com filtros
4. **Validação de Dados**: Verificação dupla dos dados retornados
5. **Auditoria**: Log automático de todas as operações
6. **Cache Isolado**: Armazenamento seguro com chaves específicas do tenant

```mermaid
graph TD
    A[Login do Usuário] --> B[Seleção de Tenant]
    B --> C[useTenantAccessGuard]
    C --> D{Acesso Permitido?}
    D -->|Não| E[Erro de Acesso]
    D -->|Sim| F[useSecureTenantQuery]
    F --> G[Validação de tenant_id]
    G --> H[Consulta ao Supabase]
    H --> I[Validação dos Dados]
    I --> J[Cache Isolado]
    J --> K[Auditoria]
    K --> L[Renderização Segura]
```

## 4. User Interface Design

### 4.1 Design Style

* **Cores Primárias**: Azul (#2563eb) para elementos de segurança, Vermelho (#dc2626) para alertas críticos

* **Estilo de Botões**: Rounded com bordas suaves, 3D para ações críticas de segurança

* **Fonte**: Inter, tamanhos 14px para texto normal, 16px para títulos de seção

* **Layout**: Card-based com navegação superior, indicadores visuais de tenant ativo

* **Ícones**: Lucide icons com ênfase em símbolos de segurança (🔐, 🛡️, 🔍)

### 4.2 Page Design Overview

| Página              | Módulo            | Elementos de UI                                                                            |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| Páginas Protegidas  | Header de Tenant  | Indicador visual do tenant ativo, cor azul #2563eb, fonte Inter 16px, posição fixa no topo |
| Validação de Acesso | Mensagens de Erro | Cards vermelhos #dc2626, texto branco, ícone de alerta, animação de fade-in                |
| Logs de Auditoria   | Console de Debug  | Texto monoespaçado, cor cinza #6b7280, timestamp visível, filtros por tenant               |
| Cache Status        | Indicadores       | Badges verdes para cache válido, amarelos para expirado, vermelhos para inválido           |

### 4.3 Responsiveness

O sistema é desktop-first com adaptação mobile obrigatória. Todos os indicadores de segurança devem permanecer visíveis em dispositivos móveis, com otimização para touch interaction nos controles de seleção de tenant.

## 5. Padrões Obrigatórios para Implementação

### 5.1 Hook Seguro Obrigatório

**NUNCA faça consultas diretas ao Supabase. SEMPRE use useSecureTenantQuery:**

```typescript
// ✅ CORRETO
const { data } = useSecureTenantQuery(['contratos'],
  async (supabase, tenantId) => {
    return supabase.from('contratos').select('*').eq('tenant_id', tenantId);
  }
);

// ❌ INCORRETO - RISCO DE VAZAMENTO
const { data } = useQuery(['contratos'], () =>
  supabase.from('contratos').select('*') // SEM FILTRO DE TENANT
);
```

### 5.2 Validações Obrigatórias em Toda Página

```typescript
export function ContratosPage() {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🛡 VALIDAÇÃO CRÍTICA ANTES DE RENDERIZAR
  if (!hasAccess) {
    return <div>Erro: {accessError}</div>;
  }
  
  // 🔍 AUDIT LOG OBRIGATÓRIO
  console.log(`[AUDIT] Acessando contratos - Tenant: ${currentTenant.name}`);
  
  // Resto da implementação...
}
```

### 5.3 Estrutura de Query Keys Padronizada

```typescript
// ✅ PADRÃO OBRIGATÓRIO
queryKey: [
  'resource_name',     // ex: 'contratos'
  currentTenant?.id,   // SEMPRE incluir tenant_id
  ...additionalParams  // parâmetros específicos
]

// Exemplos corretos:
['contratos', tenantId]
['clientes', tenantId, { status: 'ativo' }]
['relatorios', tenantId, { periodo: '2024-01' }]
```

### 5.4 Mutações Seguras com Validação Dupla

```typescript
// ✅ PADRÃO PARA TODAS AS MUTAÇÕES
const createItem = useSecureTenantMutation(
  async (supabase, tenantId, data) => {
    // 1. Inserir com tenant_id obrigatório
    const result = await supabase.from('table').insert({
      ...data,
      tenant_id: tenantId // NUNCA esquecer
    });
    
    // 2. Validar resultado
    if (result.data?.tenant_id !== tenantId) {
      throw new Error('Erro de segurança na criação');
    }
    
    return result;
  }
);
```

## 6. Checklist de Segurança Obrigatório

### Antes de Implementar Qualquer Página:

* [ ] **Usar useTenantAccessGuard()** para validação inicial

* [ ] **Usar useSecureTenantQuery()** para todas as consultas

* [ ] **Incluir tenant\_id** em todas as query keys

* [ ] **Validar dados retornados** pertencem ao tenant correto

* [ ] **Adicionar logs de auditoria** em operações críticas

* [ ] **Testar isolamento** com múltiplos tenants

### Validações Críticas em Toda Query:

```typescript
// 1. Validação antes da query
if (!currentTenant?.id) throw new Error('Tenant não definido');
if (!currentTenant.active) throw new Error('Tenant inativo');

// 2. Filtro obrigatório na query
.eq('tenant_id', tenantId)

// 3. Validação após receber dados
const invalidData = data?.filter(item => item.tenant_id !== tenantId);
if (invalidData?.length > 0) throw new Error('Violação de segurança');
```

## 7. Template de Implementação de Página

```typescript
export function MinhaPage() {
  // 1. VALIDAÇÃO DE ACESSO (OBRIGATÓRIO)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 2. HOOK SEGURO PARA DADOS (OBRIGATÓRIO)
  const { data, isLoading } = useSecureTenantQuery(['meus-dados'],
    async (supabase, tenantId) => {
      return supabase.from('tabela').select('*').eq('tenant_id', tenantId);
    }
  );
  
  // 3. GUARD CLAUSE (OBRIGATÓRIO)
  if (!hasAccess) return <div>Erro: {accessError}</div>;
  
  // 4. AUDIT LOG (RECOMENDADO)
  useEffect(() => {
    console.log(`[AUDIT] Página acessada - Tenant: ${currentTenant.name}`);
  }, [currentTenant]);
  
  // 5. RENDERIZAÇÃO SEGURA
  return (
    <div>
      <h1>Dados de {currentTenant.name}</h1>
      {/* Implementação da página */}
    </div>
  );
}
```

## 8. Monitoramento e Auditoria

### 8.1 Logs Obrigatórios:

* Acesso a páginas sensíveis

* Consultas de dados por tenant

* Mutações (criar/editar/deletar)

* Tentativas de acesso negado

* Trocas de tenant

### 8.2 Métricas de Segurança:

* Tentativas de acesso cross-tenant

* Queries sem filtro de tenant\_id

* Dados retornados de tenant incorreto

* Falhas de validação

## 9. Erros Críticos a Evitar

1. **Query sem tenant\_id**: Risco de vazamento total
2. **Cache compartilhado**: Dados de um tenant aparecem para outro
3. **Validação única**: Sempre validar antes E depois
4. **Mutação sem filtro**: Pode alterar dados de outro tenant
5. **Estado global contaminado**: Limpar ao trocar tenant

## 10. Resumo dos Arquivos Críticos

* **useSecureTenantQuery.ts** - Template obrigatório para consultas

* **useTenantAccessGuard.ts** - Validação de acesso

* **tenantStore.ts** - Estado global do tenant

* **Todas as páginas** devem seguir o template de segurança

### REGRA DE OURO

**Se não tem tenant\_id na query, NÃO PODE ser executada!**

Este guia deve ser seguido rigorosamente em todas as implementações multi-tenant do sistema para garantir a segurança e isolamento completo dos dados entre diferentes tenants.
