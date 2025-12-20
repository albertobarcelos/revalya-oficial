# 🔧 Correção: Função `create_reseller_with_invite`

## 🐛 Problema Identificado

A função `create_reseller_with_invite` estava verificando permissões usando o campo **errado**:

```sql
-- ❌ ERRADO (campo role não é usado para permissões)
AND (role = 'service_role' OR role = 'admin')
```

O campo `role` na tabela `users` tem valor padrão `'authenticated'` e **não é usado para controle de permissões**.

---

## ✅ Correção Aplicada

A função foi corrigida para usar o campo correto `user_role`:

```sql
-- ✅ CORRETO (usa user_role que é o campo de permissões)
AND user_role IN ('ADMIN', 'PLATFORM_ADMIN')
```

---

## 📋 Campos na Tabela `users`

| Campo | Tipo | Padrão | Uso |
|-------|------|--------|-----|
| `user_role` | text | `'USER'` | **Controle de permissões** (ADMIN, PLATFORM_ADMIN, RESELLER, USER, etc.) |
| `role` | text | `'authenticated'` | Campo legado do Supabase Auth (não usado para permissões) |

---

## 🎯 Valores Válidos de `user_role`

- `'ADMIN'` - Administrador do sistema
- `'PLATFORM_ADMIN'` - Administrador da plataforma
- `'RESELLER'` - Revendedor
- `'USER'` - Usuário comum
- `'TENANT_USER'` - Usuário de tenant
- `'TENANT_ADMIN'` - Administrador de tenant

---

## ✅ Status

- ✅ Função corrigida na **development** (`sqkkktsstkcupldqtsgi`)
- ⚠️ **Atenção:** A mesma correção precisa ser aplicada na **produção** (`wyehpiutzvwplllumgdk`)

---

## 🔍 Como Verificar se Funcionou

1. Verificar o `user_role` do usuário atual:
   ```sql
   SELECT id, email, user_role, status
   FROM public.users
   WHERE id = auth.uid();
   ```

2. Se o `user_role` for `'ADMIN'` ou `'PLATFORM_ADMIN'`, a função deve funcionar.

3. Se ainda não funcionar, atualizar o `user_role` do usuário:
   ```sql
   UPDATE public.users
   SET user_role = 'ADMIN'
   WHERE id = auth.uid();
   ```

---

**Última atualização:** 2025-01-19

