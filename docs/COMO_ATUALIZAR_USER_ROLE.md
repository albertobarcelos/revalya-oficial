# 🔐 Como Atualizar `user_role` para Criar Revendedores

## 📋 Problema

Para criar revendedores, o usuário precisa ter `user_role = 'ADMIN'` ou `'PLATFORM_ADMIN'`.

---

## ✅ Solução: Atualizar `user_role`

### Opção 1: Via SQL (Recomendado)

```sql
-- Atualizar user_role para ADMIN
UPDATE public.users
SET user_role = 'ADMIN'
WHERE email = 'dev@nexsyn.com.br';
-- ou
WHERE id = 'UUID_DO_USUARIO';
```

### Opção 2: Via Dashboard Supabase

1. Acessar: **Database** → **Tables** → **users**
2. Localizar o usuário pelo email
3. Editar o campo `user_role` para `ADMIN`
4. Salvar

---

## 🔍 Verificar `user_role` Atual

```sql
-- Ver todos os usuários e seus roles
SELECT 
    id,
    email,
    user_role,
    status
FROM public.users
ORDER BY created_at DESC;
```

---

## 🎯 Valores Válidos de `user_role`

- `'ADMIN'` - ✅ Pode criar revendedores
- `'PLATFORM_ADMIN'` - ✅ Pode criar revendedores
- `'RESELLER'` - ❌ Não pode criar revendedores
- `'USER'` - ❌ Não pode criar revendedores
- `'TENANT_USER'` - ❌ Não pode criar revendedores
- `'TENANT_ADMIN'` - ❌ Não pode criar revendedores

---

## ⚠️ Importante

Após atualizar o `user_role`, o usuário precisa:
1. **Fazer logout** da aplicação
2. **Fazer login novamente** para atualizar a sessão
3. Tentar criar o revendedor novamente

---

**Última atualização:** 2025-01-19

