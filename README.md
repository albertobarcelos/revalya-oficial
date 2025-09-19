# Revalya - Nova Versão

Sistema financeiro multi-tenant com segurança avançada e controle granular de acesso.

## Sobre o Projeto

Revalya é uma plataforma financeira completa, desenvolvida com arquitetura multi-tenant que permite que múltiplos clientes utilizem a mesma infraestrutura de forma segura e isolada.

## Tecnologias Utilizadas

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Segurança**: Row-Level Security (RLS) do PostgreSQL

## Arquitetura Multi-Tenant

O sistema implementa uma arquitetura multi-tenant sofisticada com:

- Isolamento completo de dados entre tenants
- Sistema de convites para acesso entre tenants
- Controle de acesso baseado em papéis (RBAC)
- Verificação em múltiplas camadas de segurança

## Atualizações Recentes

### Janeiro 2025: Refatoração e Correções das Páginas de Produtos e Serviços

Implementamos uma série de correções e melhorias nas páginas de produtos e serviços para garantir consistência e funcionalidade completa.

#### 🐛 **Problemas Identificados**

1. **Página de Produtos**:
   - **Erro**: TypeError devido a funções e imports incorretos
   - **Causa**: Referências a componentes e funções que não existiam mais
   - **Impacto**: Página não carregava corretamente

2. **Página de Serviços**:
   - **Erro**: Botão "Novo Serviço" não respondia ao clique
   - **Causa**: Incompatibilidade de props no `CreateServiceDialog`
   - **Impacto**: Impossibilidade de criar novos serviços

#### ✅ **Soluções Implementadas**

1. **Correção da Página de Produtos**:
   - Corrigido import de `EditModal` para `EditProductDialog`
   - Removidas funções obsoletas: `updateProductMutation`, `createProductMutation`, `handleSaveProduct`, `handleCancelEdit`
   - Removida função `handleCodeValidation` não utilizada
   - Removida prop `onCodeValidation` inexistente
   - Mantida estrutura CRUD funcional com React Query

2. **Atualização do `CreateServiceDialog`**:
   - Adicionadas props opcionais: `open?`, `onOpenChange?`, `onSuccess?`
   - Implementado suporte para controle de estado tanto interno quanto externo
   - Lógica condicional para renderizar `DialogTrigger` apenas quando necessário
   - Garantia de compatibilidade com diferentes contextos de uso

3. **Verificação de Compatibilidade**:
   - Estado externo tem prioridade sobre estado interno
   - Renderização condicional do trigger para evitar conflitos
   - Validação de funcionamento em diferentes cenários de uso

#### 🔧 **Detalhes Técnicos**

- **Arquivo modificado**: `src/components/services/CreateServiceDialog.tsx`
- **Props adicionadas**: `open?`, `onOpenChange?`, `onSuccess?`
- **Lógica**: Estado externo tem prioridade sobre estado interno
- **Teste realizado**: Criação de novo serviço funcionando corretamente

### Janeiro 2025: Correção de Contexto de Tenant em Operações de Criação

Corrigimos um problema crítico onde a função `createService` no hook `useServices.ts` não estava configurando corretamente o contexto do tenant antes de realizar operações de inserção no banco de dados.

#### 🐛 **Problema Identificado**

- **Erro**: `unrecognized configuration parameter "app.current_tenant_id"`
- **Causa**: A função `createService` não chamava `supabase.rpc('set_config')` para configurar o contexto do tenant
- **Impacto**: Falha na criação de novos serviços devido à falta de configuração do tenant

#### ✅ **Solução Implementada**

1. **Correção na função `createService`**:
   - Adicionada chamada `supabase.rpc('set_config', { parameter_name: 'app.current_tenant_id', parameter_value: tenantId })`
   - Configuração do contexto antes da operação de inserção
   - Alinhamento com o padrão usado nas funções `updateService` e `deleteService`

2. **Verificação de Consistência**:
   - Auditoria de outras funções de criação no sistema
   - Identificação de padrões inconsistentes entre hooks
   - Validação de que a correção resolve o problema

#### 🔧 **Detalhes Técnicos**

- **Arquivo modificado**: `src/hooks/useServices.ts`
- **Função corrigida**: `createService` no hook `useSecureTenantMutation`
- **Padrão aplicado**: Configuração de `app.current_tenant_id` via RPC antes de operações DML
- **Teste realizado**: Criação de novo serviço funcionando corretamente

#### 📋 **Anchor Comment Adicionado**

```typescript
// AIDEV-NOTE: Configuração obrigatória do contexto do tenant antes de operações de inserção
// Garante que o RLS (Row Level Security) funcione corretamente
```

### Janeiro 2025: Sistema de Auto-Login Multi-Tenant Inspirado na Omie

Implementamos um sistema revolucionário de auto-login multi-tenant que permite URLs limpas e acesso direto sem códigos na URL, inspirado na arquitetura da Omie:

#### 🚀 **Principais Funcionalidades**

1. **URLs Limpas e Intuitivas**:
   - Acesso direto via `/{tenant-slug}/dashboard`
   - Sem códigos ou tokens visíveis na URL
   - Deep-linking funcional para qualquer página do tenant

2. **Sistema de Refresh Tokens**:
   - Refresh tokens de 30 dias armazenados no localStorage
   - Access tokens de 1 hora renovados automaticamente
   - Isolamento completo por aba do navegador

3. **Auto-Login Transparente**:
   - Detecção automática de sessões válidas
   - Renovação silenciosa de tokens expirados
   - Redirecionamento inteligente para portal se necessário

4. **Limpeza Automática de Sessões**:
   - Limpeza automática de sessões expiradas a cada hora
   - Remoção de sessões antigas (30+ dias sem acesso)
   - Inicialização automática no carregamento da aplicação

#### 🏗️ **Arquitetura Implementada**

**Componentes Principais:**
- `TenantSessionManager` - Gerenciador completo de sessões e tokens
- `useTenantAutoLogin` - Hook para auto-login de tenant
- Portal integrado - Sistema integrado no portal oficial

**Edge Functions:**
- `create-tenant-session` - Criação de sessões de tenant
- `refresh-tenant-token-v2` - Renovação de access tokens

**Banco de Dados:**
- Tabela `tenant_refresh_sessions` - Armazenamento seguro de sessões
- Tabela `tenant_sessions_audit` - Auditoria completa de sessões
- Funções SQL para validação e limpeza automática
- Row Level Security (RLS) para isolamento de dados

#### 🔒 **Segurança Avançada**

1. **Isolamento por Aba**:
   - Cada aba mantém seu próprio contexto de tenant
   - SessionStorage para isolamento completo
   - Impossibilidade de vazamento de dados entre abas

2. **Validação Multicamada**:
   - Validação de refresh token no banco
   - Verificação de expiração em tempo real
   - Limpeza automática de tokens expirados

3. **Auditoria Completa**:
   - Logs de todas as operações de sessão (`created`, `refreshed`, `revoked`, `expired`)
   - Monitoramento de tentativas suspeitas
   - Rastreamento de acessos por IP e User-Agent
   - Triggers automáticos para log de eventos

#### 🎯 **Fluxo de Uso**

```
1. Login inicial → Portal de seleção de tenants
2. Seleção de tenant → Criação automática de sessão
3. Nova aba abre → /{tenant-slug} (URL limpa)
4. Auto-login detecta sessão → Carrega aplicação
5. Navegação direta funciona → URLs limpas sempre
6. Limpeza automática → Sessões expiradas removidas
```

#### 💡 **Vantagens do Sistema**

- ✅ **UX Superior**: URLs limpas como grandes SaaS (Omie, Pipedrive)
- ✅ **Segurança Robusta**: Tokens com expiração e renovação automática
- ✅ **Performance**: Carregamento instantâneo com sessões válidas
- ✅ **Escalabilidade**: Suporte a múltiplos tenants simultâneos
- ✅ **Manutenibilidade**: Código limpo e bem documentado
- ✅ **Auditoria**: Log completo de todas as operações de sessão
- ✅ **Auto-Limpeza**: Gerenciamento automático de sessões expiradas

#### 🔧 **Implementação Técnica**

**TenantSessionManager:**
- Estrutura localStorage: `revalya_tenant_profiles`
- Chave composta: `userId::userEmail::tenantSlug`
- Métodos de criação, validação, renovação e limpeza
- Isolamento por aba via sessionStorage

**Integração no Portal:**
- Substituição do botão de teste por integração direta
- Criação automática de sessão na seleção de tenant
- Abertura de nova aba com URL limpa
- Feedback visual via toast notifications

**Sistema de Limpeza:**
- Execução automática a cada 1 hora
- Limpeza inicial 5 segundos após inicialização
- Remoção de sessões expiradas e antigas (30+ dias)
- Logs detalhados de operações de limpeza

### Setembro 2025: Simplificação da Arquitetura de Roteamento e Autenticação

Implementamos uma simplificação radical na arquitetura de roteamento e autenticação da aplicação:

1. **Fluxo Linear e Previsível**:
   - Verificação de autenticação em um único lugar
   - Redirecionamentos declarativos usando `<Navigate>` do React Router
   - Eliminação de loops infinitos e comportamentos imprevisíveis

2. **Separação Clara de Responsabilidades**:
   - `AppRouter` gerencia rotas e redirecionamentos básicos
   - `TenantAutoLoginRouter` gerencia auto-login e rotas de tenant
   - `AdminRoutes` gerencia rotas administrativas
   - Sem redundância nas verificações de autenticação

3. **Estrutura Mais Enxuta**:
   - Menos componentes aninhados
   - Menos provedores de contexto desnecessários
   - Menor sobrecarga cognitiva para entender o fluxo

4. **Manutenibilidade Aprimorada**:
   - Código mais fácil de entender e depurar
   - Comportamento mais previsível em diferentes cenários
   - Menos dependências entre componentes

### Setembro 2025: Melhorias no Sistema Multi-Tenant

Implementamos diversas melhorias no sistema de gerenciamento de tenants para aumentar a robustez e segurança:

1. **Verificação Aprimorada de Tenants Ativos**:
   - Sistema de verificação em cascata (cache → localStorage → banco de dados)
   - Prevenção de acesso a tenants inativos
   - Validação dupla em pontos críticos do fluxo

2. **Funções RPC Personalizadas**:
   - `get_tenant_by_slug_v2` - Validação de acesso e existência do tenant
   - `check_user_tenant_access_count` - Verificação eficiente de acesso
   - `get_user_tenants` - Listagem otimizada de tenants do usuário

3. **Sistema de Eventos**:
   - Gerenciamento avançado de eventos com suporte a múltiplos listeners
   - Monitoramento de performance de callbacks
   - Novos eventos para melhor rastreamento do ciclo de vida do tenant

4. **Logs e Diagnósticos**:
   - Sistema abrangente de logs para facilitar debugging
   - Métricas de performance em operações críticas

5. **Correção de Duplicação de Tenants na Interface**:
   - Centralização da lógica de obtenção de tenants em uma única fonte de verdade
   - Eliminação de duplicações na página de seleção de portal
   - Resolução de erros de chaves duplicadas nos componentes React
   - Filtragem rigorosa de tenants inativos antes da exibição

Para documentação detalhada dessas melhorias, consulte os arquivos:
- [Simplificação da Arquitetura de Roteamento](docs/SIMPLIFICACAO_ROTEAMENTO.md)
- [Melhorias no Sistema Multi-Tenant](docs/MELHORIAS_SISTEMA_MULTITENANT.md)
- [Tipagem de Funções RPC do Supabase](docs/TIPAGEM_SUPABASE_RPC.md)
- [Sistema de Segurança Multi-Tenant](docs/SEGURANCA_MULTITENANT.md)
- [Solução para Duplicação de Tenants](docs/SOLUCAO_DUPLICACAO_TENANTS.md)

### Setembro 2025: Estabilização pós-login e UX Anti-Flicker

Contexto: após o login, houve relatos de “piscar”/recarregamento leve na página `meus-aplicativos` e, em alguns cenários, a interface alternava rapidamente para “Nenhum aplicativo disponível” antes de exibir os aplicativos. Implementamos um conjunto de melhorias para estabilizar a autenticação, o roteamento e a renderização inicial.

1. Ajustes no Roteador e Autenticação
   - `src/components/router/AppRouter.tsx`
     - Sincronização de usuário apenas quando `loading === false` e o `user.id` realmente muda.
     - Ignora transições temporárias de `user` para `undefined/null` durante a estabilização da sessão (evita resets prematuros do tenant).
     - Limpa `currentTenant` somente em troca real de usuário (login/logout), não durante a janela de inicialização.

   - `src/contexts/PortalContext.tsx`
     - Passou a consumir o usuário via `useAuthStore` (Zustand), tornando a detecção de mudança de usuário mais estável (sem necessidade de debounce).

2. UX Anti-Flicker em `meus-aplicativos`
   - `src/pages/portal-selection.tsx`
     - Gate de prontidão com `isReady = !supabaseLoading && isInitialized && hasLoaded && !isLoading`.
     - Debounce visual `stableReady` (≈250ms) para transições suaves.
     - `showEmptyState` com atraso (≈400ms) antes de exibir “Nenhum aplicativo”, evitando falso negativo.
     - Fallback `lastNonEmptyPortals`: se já exibimos aplicativos, evitamos alternar para estado vazio enquanto os dados reestabilizam.

3. Store de Tenants com Sinalização de Carregamento e Persistência por Aba
   - `src/store/tenantStore.ts`
     - Nova flag `hasLoaded` para indicar dados do portal carregados com sucesso.
     - Guardas em `fetchPortalData` para evitar chamadas duplicadas quando `isLoading/hasLoaded`.
     - Não zera listas em respostas transitórias (`!data`): apenas finaliza `isLoading` para evitar alternância visual.
     - Persistência em `sessionStorage` (por aba) de `availableTenants`, `userRole`, `pendingInvites` e `currentTenant` (anti-flicker em reloads/novas abas).
     - `onRehydrateStorage` marca `hasLoaded=true` quando dados úteis existem na reidratação.

   - `src/hooks/useZustandTenant.ts`
     - Lock local e respeito a `isLoading/hasLoaded` para impedir `fetchPortalData` duplicado.

4. Outras melhorias
   - `src/main.tsx`: desativado `React.StrictMode` no ambiente de desenvolvimento para evitar dupla execução de efeitos (causa comum de “piscar”). Mantido em produção.
   - `tsconfig.app.json`: adicionados aliases (`@/store/*`, `@/contexts/*`, `@/core/*`) para resolver imports corretamente (requer reinício do Vite/TS Server após alteração).
   - `vite.config.ts`: aliases já contemplavam `@` e pastas principais.

Impacto
- Elimina o “flash”/recarregamento após login em `meus-aplicativos` na maioria dos casos.
- Reduz chamadas duplicadas e resets prematuros do estado.
- Garante experiência visual estável com skeletons e fallback enquanto dados estabilizam.

Como testar
1. Faça login e observe que não há alternância para “Nenhum aplicativo disponível” antes de aparecerem os apps.
2. Recarregue a página: dados do portal devem aparecer sem “piscar”, graças à reidratação do `sessionStorage`.
3. Deslogar e logar novamente: o fluxo deve continuar estável, sem resets prematuros.

Notas Multi-Tenant
- A persistência em `sessionStorage` mantém o isolamento por aba, conforme o Manual Multi-Tenant Revalya.
- O App continua aplicando RLS e filtros explícitos por `tenant_id` em todas as consultas.

## Estrutura do Projeto

```
src/
├── components/        # Componentes React reutilizáveis
├── contexts/          # Contextos React (Supabase, Portal, etc)
├── hooks/             # React hooks personalizados
├── lib/               # Bibliotecas e utilitários
│   ├── tenant-simple/ # Sistema de gerenciamento de tenants
│   └── database.types.ts # Tipos do Supabase gerados
├── modules/           # Módulos funcionais da aplicação
└── pages/             # Páginas e rotas da aplicação

supabase/
├── migrations/        # Migrações SQL para o banco de dados
└── functions/         # Funções do Supabase Edge Functions
```

## Desenvolvedores

Equipe de Engenharia Revalya © 2025
