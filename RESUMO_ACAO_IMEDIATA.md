# 🚨 Ação Imediata: Corrigir Merge Develop → Main

## ⚠️ Problema Crítico

Ao fazer merge de `develop` para `main`, as migrations **NÃO estão sendo aplicadas** no Supabase.

---

## ✅ Solução (3 Passos Simples)

### Passo 1: Corrigir "Supabase directory" (CRÍTICO)

**Na tela que você está vendo:**

1. **Altere "Supabase directory"** de `./supabase` para `supabase` (remova o `./`)
2. Clique em **"Save changes"**

**Por quê?**
- A documentação do Supabase espera apenas `supabase` (sem `./`)
- O `./` pode estar causando problemas na resolução do caminho
- Isso faz o Supabase procurar migrations em `./migrations/` ao invés de `supabase/migrations/`

### Passo 2: Verificar Após Salvar

Após salvar, verifique:
- ✅ "Supabase directory" mostra `supabase` (sem `./`)
- ✅ Mensagem de sucesso aparece

### Passo 3: Testar

1. Faça um pequeno commit na `main` (ou push vazio):
   ```bash
   git checkout main
   git commit --allow-empty -m "test: trigger supabase integration"
   git push
   ```

2. Aguarde 2-5 minutos

3. Verifique se funcionou:
   - Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/logs
   - Procure por logs de migrations sendo aplicadas

---

## 📊 O Que Deve Acontecer Após Corrigir

### Quando Fizer Merge para `main`:

1. ✅ Supabase detecta o push/merge (2-5 min)
2. ✅ Lê migrations de `supabase/migrations/`
3. ✅ Aplica apenas migrations novas
4. ✅ Deploya Edge Functions (se declaradas em `config.toml`)
5. ✅ Logs mostram o processo

### Logs Esperados:

```
✅ Applying migration: 20251220202812_test_fluxo_develop_main.sql
✅ Migration applied successfully
✅ Deploying Edge Functions...
```

---

## 🔍 Verificação Rápida

### Verificar se Migration Está no GitHub:

```bash
git checkout main
ls supabase/migrations/ | grep 20251220202812
```

### Verificar se Migration Foi Aplicada:

Execute no Supabase SQL Editor:

```sql
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';
```

Se retornar resultado = ✅ Migration aplicada
Se não retornar = ❌ Migration não aplicada

---

## 📚 Referência

Baseado na documentação oficial:
- [Supabase GitHub Integration](https://supabase.com/docs/guides/deployment/branching/github-integration)

**Trecho relevante:**
> "Fill in the relative path to the Supabase directory from your repository root."

O caminho relativo deve ser `supabase`, não `./supabase`.

---

## ⚡ Ação Agora

**1. Altere "Supabase directory" de `./supabase` para `supabase`**
**2. Clique em "Save changes"**
**3. Me avise quando salvar para verificarmos juntos!**

---

**Status:** ⚠️ **AGUARDANDO CORREÇÃO**

