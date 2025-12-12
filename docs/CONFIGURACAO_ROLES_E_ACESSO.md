# Configuração de Roles e Acesso ao Portal Administrativo

## 📋 Resumo

Para que um usuário tenha **acesso completo dentro do tenant** mas **NÃO veja o Painel Administrativo**, ele precisa ter:

1. **Na tabela `users`**: `user_role` = `TENANT_ADMIN` (ou qualquer role que **NÃO** seja `ADMIN` ou `SUPER_ADMIN`)
2. **Na tabela `tenant_users`**: `role` = `TENANT_ADMIN` (para ter acesso completo dentro do tenant)

## 🔍 Como Funciona

### Portal Administrativo

O Portal Administrativo é exibido na página de seleção de portais (`/meus-aplicativos`) quando:

```typescript
// Código em: src/pages/portal-selection.tsx (linha 201)
if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
  // Exibe o Portal Administrativo
}
```

**Conclusão**: Apenas usuários com `user_role = 'ADMIN'` ou `user_role = 'SUPER_ADMIN'` na tabela `users` veem o Portal Administrativo.

### Acesso ao Tenant

O acesso completo dentro do tenant é controlado pela coluna `role` na tabela `tenant_users`:

- `TENANT_ADMIN`: Acesso completo ao tenant (pode gerenciar usuários, configurações, etc.)
- `TENANT_USER`: Acesso limitado ao tenant

## 📊 Estrutura das Roles

### Roles na Tabela `users` (user_role)

Esta role controla o acesso **global** ao sistema:

| Role | Descrição | Vê Portal Admin? |
|------|-----------|------------------|
| `ADMIN` | Administrador global do sistema | ✅ Sim |
| `SUPER_ADMIN` | Super administrador do sistema | ✅ Sim |
| `TENANT_ADMIN` | Administrador de tenant (não global) | ❌ Não |
| `TENANT_USER` | Usuário regular de tenant | ❌ Não |
| `PLATFORM_ADMIN` | Administrador da plataforma | ❌ Não |
| `MANAGER` | Gerente | ❌ Não |
| `VIEWER` | Visualizador | ❌ Não |

### Roles na Tabela `tenant_users` (role)

Esta role controla o acesso **dentro de um tenant específico**:

| Role | Descrição | Permissões no Tenant |
|------|-----------|----------------------|
| `TENANT_ADMIN` | Administrador do tenant | ✅ Acesso completo (gerenciar usuários, configurações, etc.) |
| `TENANT_USER` | Usuário regular | ⚠️ Acesso limitado |

## 🎯 Configuração Recomendada

### Para um usuário com acesso completo ao tenant mas SEM ver o Portal Admin:

```sql
-- 1. Na tabela users: definir user_role como TENANT_ADMIN (ou qualquer role que não seja ADMIN/SUPER_ADMIN)
UPDATE users
SET user_role = 'TENANT_ADMIN'
WHERE id = 'user-id-aqui';

-- 2. Na tabela tenant_users: garantir que role = TENANT_ADMIN
UPDATE tenant_users
SET role = 'TENANT_ADMIN'
WHERE user_id = 'user-id-aqui'
  AND tenant_id = 'tenant-id-aqui';
```

### Para um usuário ADMIN global (vê Portal Admin):

```sql
-- 1. Na tabela users: definir user_role como ADMIN
UPDATE users
SET user_role = 'ADMIN'
WHERE id = 'user-id-aqui';

-- 2. Na tabela tenant_users: pode ser qualquer role (ADMIN global tem acesso a tudo)
-- Opcional: definir como TENANT_ADMIN para clareza
UPDATE tenant_users
SET role = 'TENANT_ADMIN'
WHERE user_id = 'user-id-aqui'
  AND tenant_id = 'tenant-id-aqui';
```

## 🔧 Verificação Atual

Para verificar a configuração atual de um usuário:

```sql
-- Verificar role global (users)
SELECT 
  id,
  email,
  user_role as global_role
FROM users
WHERE id = 'user-id-aqui';

-- Verificar roles em tenants (tenant_users)
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role as tenant_role,
  t.name as tenant_name
FROM tenant_users tu
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.user_id = 'user-id-aqui';
```

## 📝 Exemplo Prático

### Cenário: Usuário que é admin do tenant "Revalya" mas não deve ver Portal Admin

```sql
-- 1. Definir role global como TENANT_ADMIN
UPDATE users
SET user_role = 'TENANT_ADMIN'
WHERE email = 'admin@revalya.com.br';

-- 2. Garantir que é TENANT_ADMIN no tenant
UPDATE tenant_users
SET role = 'TENANT_ADMIN'
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@revalya.com.br')
  AND tenant_id = (SELECT id FROM tenants WHERE name = 'Revalya Financeiro inteligente');
```

**Resultado**:
- ✅ Vê e acessa o tenant "Revalya" com permissões completas
- ❌ **NÃO** vê o "Portal Administrativo" na página de seleção

## ⚠️ Importante

- A role na tabela `users` (`user_role`) controla o acesso **global** ao sistema
- A role na tabela `tenant_users` (`role`) controla o acesso **dentro de cada tenant**
- Para ter acesso completo ao tenant mas não ver o Portal Admin, use `TENANT_ADMIN` em `users.user_role`
- Para ver o Portal Admin, use `ADMIN` ou `SUPER_ADMIN` em `users.user_role`

## 🔗 Arquivos Relacionados

- `src/pages/portal-selection.tsx` (linha 201): Lógica de exibição do Portal Admin
- `src/store/tenantStore.ts` (linha 258-270): Busca do `user_role` da tabela `users`
- `src/types/auth.ts`: Definição de todas as roles disponíveis

