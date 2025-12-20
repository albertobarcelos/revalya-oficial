# ✅ Tabela `invites` Criada

## 📋 Problema

A função `create_reseller_with_invite` estava tentando inserir na tabela `public.invites`, mas essa tabela **não existia** na development.

---

## ✅ Solução Aplicada

A tabela `invites` foi criada com a seguinte estrutura:

```sql
CREATE TABLE public.invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    token text NOT NULL UNIQUE,
    created_by uuid REFERENCES auth.users(id),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

### Índices Criados:

- `idx_invites_email` - Para buscas por email
- `idx_invites_token` - Para buscas por token (já é UNIQUE, mas índice ajuda)
- `idx_invites_created_by` - Para buscas por criador

### RLS (Row Level Security):

- ✅ RLS habilitado
- Política básica criada: usuários autenticados podem gerenciar convites

---

## 📝 Campos da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | Chave primária |
| `email` | text | Email do convidado |
| `token` | text | Token único do convite |
| `created_by` | uuid | ID do usuário que criou o convite |
| `expires_at` | timestamptz | Data de expiração do convite |
| `used_at` | timestamptz | Data em que o convite foi usado (NULL = não usado) |
| `metadata` | jsonb | Metadados (type, reseller_id, role, etc.) |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Data de atualização |

---

## 🎯 Uso da Tabela

A tabela `invites` é usada para:

1. **Convites de Revendedores** (`metadata->>'type' = 'reseller'`)
   - Criado pela função `create_reseller_with_invite`
   - Usado em `reseller/register.tsx` para validar e marcar como usado

2. **Outros tipos de convites** (futuro)
   - Pode ser expandida para outros tipos conforme necessário

---

## ⚠️ Observação

A tabela `invites` **não existe na produção** (`wyehpiutzvwplllumgdk`). 

**Opções:**
1. Criar a tabela na produção também (se necessário)
2. Ou ajustar a função para não criar o invite (já que o frontend usa `signInWithOtp`)

---

**Última atualização:** 2025-01-19

