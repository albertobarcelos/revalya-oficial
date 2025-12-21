# 📋 Análise: Fluxo Auth → Users

## 🔍 Situação Atual

**Usuário:** `dev@nexsyn.com.br`

### Verificação na MAIN (Produção):
- ❌ **NÃO existe** em `auth.users`
- ❌ **NÃO existe** em `public.users`

### Fluxo na MAIN:
1. **Trigger:** `on_auth_user_created` em `auth.users`
2. **Função:** `sync_user_role()` - cria automaticamente registro em `public.users` quando usuário é criado no auth
3. **Função alternativa:** `admin_force_create_user(user_id, email)` - força criação na tabela users

## 🔧 Funções Disponíveis

### 1. `sync_user_role()` (Trigger Automático)
- **Quando:** Disparado automaticamente ao criar usuário em `auth.users`
- **O que faz:** Cria registro em `public.users` com:
  - `id` = ID do auth.users
  - `email` = email do auth.users
  - `user_role` = 'USER' (ou 'ADMIN' se metadata indicar)
  - `name` = parte antes do @ do email
  - `status` = 'ACTIVE'

### 2. `admin_force_create_user(user_id, email)`
- **Quando:** Usar quando usuário já existe no auth mas não na tabela users
- **O que faz:** Cria registro forçado em `public.users` ignorando RLS

### 3. `admin_create_user_bypass_rls(user_id, email, role, name, status)`
- **Quando:** Criar usuário completo com mais controle
- **O que faz:** Cria/atualiza registro em `public.users` com parâmetros customizados

## 📝 Plano de Ação

### Opção 1: Se usuário JÁ existe no auth (em outro projeto/ambiente)
1. Buscar ID do usuário no auth.users
2. Executar: `SELECT admin_force_create_user(user_id, 'dev@nexsyn.com.br')`

### Opção 2: Se usuário NÃO existe no auth
1. Criar usuário no auth.users primeiro (via Supabase Dashboard ou API)
2. O trigger `on_auth_user_created` criará automaticamente na tabela users
3. OU executar `admin_force_create_user` após criar no auth

### Opção 3: Criar manualmente (se auth já existe mas trigger falhou)
1. Buscar ID do usuário no auth.users
2. Executar INSERT direto na tabela users

## ⚠️ Confirmação Necessária

**Pergunta:** O usuário `dev@nexsyn.com.br` foi cadastrado:
- [ ] No projeto MAIN (wyehpiutzvwplllumgdk)?
- [ ] Em outro projeto Supabase?
- [ ] Ainda não foi cadastrado no auth?

**Ação Recomendada:**
1. Verificar se existe em algum projeto Supabase
2. Se existir no auth mas não na tabela users → usar `admin_force_create_user`
3. Se não existir no auth → criar primeiro no auth, depois na tabela users

## 🎯 Próximo Passo

Aguardando confirmação para:
1. Verificar em qual projeto o usuário foi cadastrado
2. Executar criação na tabela users conforme situação

