# 🚀 Guia Rápido: Integração Nativa Supabase

## ✅ Sim! É Só Desenvolver e Migrar

Com a integração nativa configurada, você só precisa:
1. Desenvolver na `develop`
2. Fazer merge para `main`
3. **Pronto!** Supabase aplica automaticamente

---

## 🎯 Configuração Inicial (Uma Vez)

### Passo 1: Configurar no Dashboard

1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/settings/integrations
2. Clique em **"Authorize GitHub"**
3. Autorize o Supabase no GitHub
4. Escolha o repositório: `revalya-oficial`
5. Configure:
   - **Supabase directory path**: `supabase`
   - **Deploy to production**: ✅ Habilitado
     - **Production branch**: `main`
   - **Automatic branching**: ✅ Habilitado (opcional, mas recomendado)
   - **Supabase changes only**: ✅ Habilitado

### Passo 2: Fazer o Mesmo para Develop (Opcional)

Se quiser deploy automático também na develop:
1. Acesse: https://supabase.com/dashboard/project/ivaeoagtrvjsksebnqwr/settings/integrations
2. Configure da mesma forma, mas com branch `develop`

---

## 🔄 Fluxo de Trabalho (Todo Dia)

### 1️⃣ Desenvolver Nova Migration

```bash
# Criar migration
supabase migration new adicionar_campo_novo

# Editar migration
# Arquivo: supabase/migrations/YYYYMMDDHHMMSS_adicionar_campo_novo.sql
# Exemplo:
# ALTER TABLE usuarios ADD COLUMN telefone TEXT;
```

### 2️⃣ Testar Localmente (Opcional)

```bash
# Aplicar migration localmente
supabase db reset

# Ou apenas aplicar a nova
supabase migration up
```

### 3️⃣ Commit e Push para Develop

```bash
git add supabase/migrations/
git commit -m "feat: adicionar campo telefone"
git push origin develop
```

**O que acontece:**
- ✅ Se configurou deploy automático na develop → Supabase aplica automaticamente
- ✅ Se não configurou → Nada acontece (você pode aplicar manualmente depois)

### 4️⃣ Fazer Merge para Main

```bash
git checkout main
git merge develop
git push origin main
```

**O que acontece automaticamente:**
- ✅ Supabase detecta novas migrations
- ✅ Aplica **APENAS as novas migrations** (não refaz tudo)
- ✅ Deploy de Edge Functions (se houver mudanças)
- ✅ Status check aparece no GitHub

---

## 🎯 Exemplo Completo

### Cenário: Adicionar Nova Tabela

```bash
# 1. Criar migration
supabase migration new criar_tabela_produtos

# 2. Editar: supabase/migrations/20250127120000_criar_tabela_produtos.sql
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  preco DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

# 3. Commit
git add supabase/migrations/
git commit -m "feat: criar tabela produtos"
git push origin develop

# 4. Testar na develop (se configurou deploy automático)
# ✅ Supabase já aplicou automaticamente!

# 5. Quando estiver pronto, merge para main
git checkout main
git merge develop
git push origin main

# ✅ Supabase aplica automaticamente na produção!
```

---

## ✅ O Que Acontece Automaticamente

### Quando Faz Push para `main`:

1. ✅ **Detecta novas migrations** - Compara com o que já está aplicado
2. ✅ **Aplica apenas novas** - Não refaz migrations antigas
3. ✅ **Deploy Edge Functions** - Se houver mudanças em `supabase/functions/`
4. ✅ **Status check no GitHub** - Mostra se deu certo ou não
5. ✅ **Email notification** - Se configurou, recebe email sobre o resultado

### Quando Cria PR:

1. ✅ **Cria preview branch** - Se habilitou "Automatic branching"
2. ✅ **Aplica migrations na preview** - Para testar antes de merge
3. ✅ **Comentário no PR** - Mostra status do deploy

---

## ⚠️ Importante

### ✅ SEMPRE Fazer

1. **Commits no GitHub** - Todas as migrations devem estar no repositório
2. **Testar na develop primeiro** - Sempre validar antes de main
3. **Uma migration por feature** - Não misturar múltiplas mudanças

### ❌ NUNCA Fazer

1. **Aplicar migrations manualmente** sem commit no GitHub
2. **Modificar migrations já aplicadas** - Criar nova migration para corrigir
3. **Fazer merge direto para main** sem testar na develop

---

## 🔍 Verificar se Está Funcionando

### 1. Verificar Status no GitHub

Quando você faz push para `main`, aparece um status check:
- ✅ **Verde** = Deploy funcionou
- ❌ **Vermelho** = Deploy falhou (ver logs)

### 2. Verificar no Dashboard Supabase

1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk
2. Vá em **Database > Migrations**
3. Veja se a migration foi aplicada

### 3. Verificar no Banco

```sql
-- Ver migrations aplicadas
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Problema: Migration não foi aplicada

**Solução:**
1. Verificar se está no branch `main`
2. Verificar se migration está em `supabase/migrations/`
3. Verificar logs no Dashboard > Integrations
4. Verificar status check no GitHub

### Problema: Status check falhou

**Solução:**
1. Clicar no status check no GitHub para ver logs
2. Verificar se há erros na migration
3. Corrigir migration e fazer novo commit

### Problema: Quer aplicar manualmente

**Solução:**
```bash
# Conectar ao projeto
supabase link --project-ref wyehpiutzvwplllumgdk

# Aplicar migrations pendentes
supabase db push
```

---

## 📋 Checklist Rápido

### Antes de Começar
- [ ] Integração nativa configurada no Dashboard
- [ ] Repositório conectado
- [ ] Deploy to production habilitado

### Durante Desenvolvimento
- [ ] Migration criada
- [ ] Migration testada localmente (opcional)
- [ ] Commit e push para develop
- [ ] Testado na develop (se configurou deploy automático)

### Ao Migrar para Main
- [ ] Merge de develop para main
- [ ] Push para main
- [ ] Verificar status check no GitHub
- [ ] Verificar que migration foi aplicada

---

## 🎯 Resumo Ultra-Rápido

```bash
# 1. Desenvolver
supabase migration new nome
# Editar migration
git add supabase/migrations/
git commit -m "feat: nova migration"
git push origin develop

# 2. Migrar
git checkout main
git merge develop
git push origin main

# ✅ Pronto! Supabase aplica automaticamente!
```

---

**É só isso!** 🎉

A integração nativa cuida de tudo automaticamente. Você só precisa desenvolver e fazer merge.

---

**Última atualização**: 2025-01-XX

