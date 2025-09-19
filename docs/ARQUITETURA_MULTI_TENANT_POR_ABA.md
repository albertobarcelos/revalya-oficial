# Arquitetura Multi-Tenant por Aba

## Visão Geral

Este documento descreve a nova arquitetura multi-tenant com isolamento por aba, implementada para resolver problemas de conflito de contexto, melhorar a segurança e permitir acesso simultâneo a múltiplos tenants.

## Principais Conceitos

1. **Isolamento por Aba**: Cada aba do navegador tem seu próprio contexto de tenant, com sessão e token próprios.
2. **One-Time Code**: Sistema de geração de código de acesso único para cada tenant.
3. **Armazenamento por Aba**: Uso de sessionStorage em vez de localStorage para isolar o estado entre abas.
4. **Tokens Efêmeros**: Tokens JWT de curta duração com claims específicas de tenant.
5. **RLS no Postgres**: Políticas de segurança em nível de linha para garantir isolamento de dados.

## Componentes da Arquitetura

### Backend (Supabase)

1. **Tabela `tenant_access_codes`**
   - Armazena códigos de acesso temporários vinculados a um par usuário-tenant
   - Implementa expiração automática e controle de uso único

2. **Funções RPC**
   - `generate_tenant_access_code`: Gera código único para acesso ao tenant
   - `exchange_tenant_access_code`: Troca o código por um token JWT com claims de tenant
   - `get_tenant`: Função unificada para consulta de dados do tenant

3. **RLS (Row Level Security)**
   - Políticas por tenant em todas as tabelas
   - Validação automática da claim tenant_id nos tokens JWT

### Frontend

1. **Token Manager**
   - Gerencia tokens por aba usando sessionStorage
   - Fornece métodos para verificar expiração, renovação e revogação

2. **API Client**
   - Intercepta requisições para incluir o Bearer token
   - Adiciona tenant_id como parâmetro de consulta
   - Tratamento centralizado de erros 401 (sessão expirada)

3. **TanStack Query**
   - Gerencia cache e requisições com namespace por tenant
   - Invalidação automática do cache ao trocar de tenant

4. **Zustand para UI**
   - Estado da interface isolado do estado do servidor
   - Persistência por aba quando necessário

5. **Componentes de Roteamento**
   - `TenantRouter`: Gerencia rotas dentro do contexto de um tenant específico
   - `TenantCodeHandler`: Processa códigos de acesso na URL

## Fluxo de Acesso

1. **Portal Selection**
   - Usuário vê todos os tenants que tem acesso
   - Ao clicar em um tenant, gera-se um código de acesso único

2. **Abertura em Nova Aba**
   - Nova aba é aberta com código na URL: `/t/{slug}?code={one_time_code}`
   - Código é trocado por token JWT com claim de tenant_id
   - Token é armazenado apenas no sessionStorage daquela aba

3. **Navegação Interna**
   - Todas as requisições incluem automaticamente o token
   - RLS no PostgreSQL garante acesso apenas aos dados do tenant atual
   - Cache é isolado por tenant através de query keys específicas

4. **Expiração e Renovação**
   - Tokens têm duração curta (30 minutos)
   - Sistema detecta expiração e redireciona para nova autenticação

## Vantagens

1. **Isolamento Completo**: Elimina conflitos de contexto entre tenants diferentes.
2. **Segurança Aprimorada**: Tokens de curta duração e códigos de uso único.
3. **Experiência de Usuário**: Permite trabalhar com múltiplos tenants simultaneamente.
4. **Clareza Arquitetural**: Separação clara entre estado de UI e estado do servidor.
5. **Performance**: Cache otimizado por tenant e redução de requisições.

## Comparação com Sistema Anterior

| Aspecto | Sistema Anterior | Novo Sistema |
|---------|-----------------|-------------|
| **Sessão** | Compartilhada entre abas | Isolada por aba |
| **Storage** | localStorage global | sessionStorage por aba |
| **Navegação** | Redirecionamento na mesma aba | Abertura em novas abas |
| **Cache** | Global, conflitos potenciais | Namespaced por tenant |
| **Token** | JWT longo com reuso | One-time code → JWT curto |

## Implementação e Migração

A implementação segue uma abordagem gradual:

1. **Fase 1**: Infraestrutura base (concluída)
   - Tabelas e funções RPC no Supabase
   - Componentes core do frontend

2. **Fase 2**: Core e migração (em andamento)
   - Modificação da página de seleção de portal
   - Implementação de hooks e componentes
   - Migração progressiva de telas

3. **Fase 3**: Segurança e observabilidade (planejada)
   - Logs de auditoria aprimorados
   - Monitoramento de emissão de tokens
   - Sistema de revogação de acesso
