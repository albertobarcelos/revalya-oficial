# Análise do Fluxo de Criação de Tenant e Convites

## Estado Atual

### 1. Criação de Tenant (`src/pages/admin/tenants/new.tsx`)
- ✅ Cria usuário no Auth
- ✅ Sincroniza com `public.users`
- ✅ Cria tenant no banco
- ✅ Trigger cria associação `tenant_users` automaticamente
- ❌ **NÃO envia email de boas-vindas ao administrador**

### 2. Convite de Usuário (`src/components/users/InviteUserDialog.tsx`)
- ✅ Cria registro em `tenant_invites`
- ✅ Gera token único
- ✅ Chama edge function `send-invite-email`
- ⚠️ Template de email básico (pode ser melhorado)

### 3. Edge Function de Email (`supabase/functions/send-invite-email/index.ts`)
- ✅ Suporta tipos: `reseller`, `tenant`, `user`
- ✅ Usa `inviteUserByEmail` do Supabase Auth
- ⚠️ Template HTML básico
- ⚠️ Não trata bem casos de usuário já existente

### 4. Página de Registro (`src/pages/auth/Register.tsx`)
- ❌ **USA TABELA ERRADA**: `invites` em vez de `tenant_invites`
- ❌ Não aceita convites de tenant corretamente
- ❌ Não associa usuário ao tenant após registro

## Problemas Identificados

1. **Página de registro desatualizada**: Usa tabela `invites` (antiga) em vez de `tenant_invites`
2. **Falta email de boas-vindas**: Quando um tenant é criado, o admin não recebe email
3. **Template de email básico**: Pode ser melhorado com design profissional
4. **Fluxo incompleto**: Após registro com token de tenant, usuário não é associado automaticamente

## Melhorias Necessárias

### Prioridade Alta
1. ✅ Corrigir página de registro para usar `tenant_invites`
2. ✅ Criar edge function para email de boas-vindas ao criar tenant
3. ✅ Melhorar template de email de convite
4. ✅ Integrar envio de email no fluxo de criação de tenant

### Prioridade Média
5. Melhorar tratamento de erros
6. Adicionar logs de auditoria
7. Validações adicionais

## Estrutura do Banco

### Tabela `tenant_invites`
- `id` (uuid)
- `tenant_id` (uuid)
- `email` (text)
- `invited_by` (uuid)
- `status` (text): PENDING, ACCEPTED, REJECTED
- `role` (text): TENANT_USER, TENANT_ADMIN
- `token` (text, unique)
- `created_at` (timestamptz)
- `expires_at` (timestamptz) - default: now() + 7 days
- `accepted_at` (timestamptz, nullable)
- `user_id` (uuid, nullable)

### Tabela `tenants`
- `id` (uuid)
- `name` (text)
- `email` (text) - email do admin
- `document` (text)
- `phone` (text, nullable)
- `active` (boolean)
- `reseller_id` (uuid, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

