# Fluxo Completo de Criação de Tenant e Convites - Documentação Final

## 🎯 Objetivo

Implementar um fluxo completo e seguro de criação de tenant onde:
1. Admin cria tenant sem precisar definir senha
2. Sistema envia convite por email
3. Usuário cria conta ou faz login
4. Convite aparece na página de seleção de portal
5. Usuário aceita convite e ganha acesso

## ✅ Implementações Realizadas

### 1. Formulário de Criação de Tenant
**Arquivo:** `src/pages/admin/tenants/new.tsx`

**Mudanças:**
- ❌ Removido campo `password`
- ✅ Fluxo alterado para criar convite em vez de usuário
- ✅ Envio de email de convite integrado

**Novo Fluxo:**
```typescript
1. Admin preenche dados do tenant (sem senha)
2. Sistema cria tenant
3. Sistema cria convite em tenant_invites com role TENANT_ADMIN
4. Sistema envia email de convite
5. Sucesso!
```

### 2. Página de Registro
**Arquivo:** `src/pages/auth/Register.tsx`

**Mudanças:**
- ✅ Usa `tenant_invites` em vez de `invites`
- ✅ Valida status `PENDING` corretamente
- ✅ Associa usuário ao tenant automaticamente
- ✅ Detecta usuário existente e redireciona para login

**Fluxo:**
```typescript
1. Usuário acessa /register?token=xxx
2. Sistema valida convite em tenant_invites
3. Se convite válido:
   - Usuário preenche nome e senha
   - Sistema cria conta
   - Sistema associa ao tenant
   - Convite marcado como ACCEPTED
   - Redireciona para login
4. Se usuário já existe:
   - Redireciona para /login?redirect=/register?token=xxx
```

### 3. Página de Seleção de Portal
**Arquivo:** `src/pages/portal-selection.tsx`

**Mudanças:**
- ✅ Carrega convites pendentes do store Zustand
- ✅ Converte formato do store para formato do componente
- ✅ Exibe convites na aba "Convites"
- ✅ Permite aceitar/rejeitar convites

**Fluxo:**
```typescript
1. Usuário faz login
2. Redirecionado para /meus-aplicativos
3. Sistema carrega convites pendentes (filtrados por email)
4. Convites aparecem na aba "Convites"
5. Usuário aceita convite
6. Sistema associa ao tenant
7. Tenant aparece na lista de portais
```

### 4. Store de Tenants
**Arquivo:** `src/store/tenantStore.ts`

**Mudanças:**
- ✅ Filtra convites por email do usuário logado
- ✅ Usa status `PENDING` (maiúsculas) corretamente

**Query:**
```sql
SELECT * FROM tenant_invites
WHERE status = 'PENDING'
  AND email = user_email
  AND expires_at > NOW()
```

### 5. Template de Email
**Arquivo:** `supabase/functions/send-invite-email/index.ts`

**Melhorias:**
- ✅ Design profissional e responsivo
- ✅ Mensagem clara para usuários existentes
- ✅ Link direto para login
- ✅ Informações sobre expiração

## 🔄 Fluxos Detalhados

### Fluxo 1: Criação de Tenant (Usuário Novo)
```
Admin → /admin/tenants/new
  ↓
Preenche dados (sem senha)
  ↓
Sistema cria tenant
  ↓
Sistema cria convite (tenant_invites)
  ↓
Sistema envia email
  ↓
Usuário recebe email → clica no link
  ↓
/register?token=xxx
  ↓
Valida convite → preenche nome e senha
  ↓
Sistema cria conta → associa ao tenant
  ↓
Convite marcado como ACCEPTED
  ↓
Redireciona para /login
  ↓
Faz login → /meus-aplicativos
  ↓
Vê tenant na lista de portais ✅
```

### Fluxo 2: Criação de Tenant (Usuário Existente)
```
Admin → /admin/tenants/new
  ↓
Preenche dados (sem senha)
  ↓
Sistema cria tenant
  ↓
Sistema cria convite (tenant_invites)
  ↓
Sistema envia email
  ↓
Usuário recebe email → clica no link
  ↓
/register?token=xxx
  ↓
Valida convite → tenta criar conta
  ↓
Sistema detecta usuário existente
  ↓
Redireciona para /login?redirect=/register?token=xxx
  ↓
Faz login → /meus-aplicativos
  ↓
Vê convite pendente na aba "Convites"
  ↓
Aceita convite → associa ao tenant
  ↓
Tenant aparece na lista de portais ✅
```

### Fluxo 3: Login Direto (Usuário Existente)
```
Usuário faz login normalmente
  ↓
Redirecionado para /meus-aplicativos
  ↓
Sistema carrega convites pendentes (filtrados por email)
  ↓
Vê convite pendente na aba "Convites"
  ↓
Aceita convite → associa ao tenant
  ↓
Tenant aparece na lista de portais ✅
```

## 📋 Estrutura de Dados

### Tabela `tenant_invites`
```sql
CREATE TABLE tenant_invites (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
  role TEXT NOT NULL DEFAULT 'TENANT_USER', -- TENANT_USER, TENANT_ADMIN
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  user_id UUID
);
```

### Trigger `auto_create_tenant_admin`
- Executa quando tenant é criado
- Verifica se usuário existe em `public.users`
- Se existir: associa automaticamente como TENANT_ADMIN
- Se não existir: apenas loga aviso (não falha)
- **Comportamento:** Útil para casos onde usuário já existe, mas não bloqueia o fluxo de convites

## ⚠️ Observações Importantes

1. **Status do Convite**: Sempre usar `PENDING`, `ACCEPTED`, `REJECTED` em maiúsculas
2. **Filtro por Email**: Convites são filtrados pelo email do usuário logado
3. **Associação Automática**: Após registro com token, usuário é associado automaticamente
4. **Trigger Automático**: Se usuário já existe, trigger pode associar automaticamente (comportamento opcional)
5. **Redirecionamento**: Usuários existentes são redirecionados para login quando tentam registrar

## 🧪 Testes Recomendados

### Teste 1: Criação de Tenant (Usuário Novo)
1. Criar tenant com email novo
2. Verificar se convite foi criado
3. Verificar se email foi enviado
4. Acessar link de registro
5. Criar conta
6. Verificar se foi associado ao tenant
7. Fazer login e verificar se tenant aparece

### Teste 2: Criação de Tenant (Usuário Existente)
1. Criar tenant com email de usuário existente
2. Verificar se convite foi criado
3. Verificar se email foi enviado
4. Acessar link de registro
5. Verificar se redireciona para login
6. Fazer login
7. Verificar se convite aparece na aba "Convites"
8. Aceitar convite
9. Verificar se tenant aparece na lista

### Teste 3: Login Direto
1. Criar tenant (usuário já existe)
2. Fazer login normalmente
3. Verificar se convite aparece na aba "Convites"
4. Aceitar convite
5. Verificar se tenant aparece na lista

## 📝 Arquivos Modificados

1. ✅ `src/pages/admin/tenants/new.tsx` - Fluxo de criação alterado
2. ✅ `src/pages/auth/Register.tsx` - Correções e redirecionamento
3. ✅ `src/pages/portal-selection.tsx` - Carregamento de convites
4. ✅ `src/store/tenantStore.ts` - Filtro por email
5. ✅ `supabase/functions/send-invite-email/index.ts` - Template melhorado

## 🎉 Resultado Final

O fluxo está completo e funcional:
- ✅ Admin cria tenant sem senha
- ✅ Sistema envia convite por email
- ✅ Usuário novo cria conta
- ✅ Usuário existente faz login
- ✅ Convites aparecem na página de seleção de portal
- ✅ Usuário aceita convite e ganha acesso

