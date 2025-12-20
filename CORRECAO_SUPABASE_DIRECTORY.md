# 🔧 Correção: Supabase Directory Incorreto

## 🐛 Problema Identificado

**Configuração Atual:**
- ❌ **Supabase directory**: `.` (ponto/raiz)
- ✅ **Deploy to production**: Habilitado
- ✅ **Production branch**: `main`
- ✅ **Automatic branching**: Desabilitado

**Problema:**
O Supabase está procurando migrations na **raiz do repositório** (`./migrations/`), mas suas migrations estão em `supabase/migrations/`.

**Resultado:**
- Supabase não encontra migrations
- Não tenta aplicar nada
- Erro silencioso (não aparece erro, só não faz nada)

---

## ✅ Solução

### Passo 1: Corrigir Configuração

1. Na tela de configuração que você está vendo:
2. **Altere "Supabase directory"** de `.` para `supabase`
3. Clique em **"Save changes"**

### Passo 2: Verificar

Após salvar, verificar:
- ✅ "Supabase directory" mostra `supabase`
- ✅ Configuração salva com sucesso

### Passo 3: Testar

1. Fazer merge do PR para `main`
2. Aguardar alguns minutos (2-5 min)
3. Verificar logs: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/logs
4. Verificar se migration foi aplicada:
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations 
   WHERE version = '20251220202812';
   ```

---

## 📊 Configuração Correta

**Deve estar assim:**

- ✅ **GitHub Repository**: `albertobarcelos/revalya-oficial`
- ✅ **Supabase directory**: `supabase` ← **CORRIGIR AQUI**
- ✅ **Deploy to production**: Habilitado
- ✅ **Production branch name**: `main`
- ❌ **Automatic branching**: Desabilitado (OK)
- ❌ **Supabase changes only**: Desabilitado (OK, porque Automatic branching está off)

---

## 🎯 Por Que Isso Aconteceu?

O valor padrão ou inicial pode ter sido `.` (raiz), mas seu projeto usa a estrutura padrão do Supabase CLI que coloca tudo em `supabase/`.

**Estrutura Correta:**
```
revalya-oficial/
├── supabase/
│   ├── migrations/
│   │   ├── 20251220202812_test_fluxo_develop_main.sql
│   │   └── ...
│   ├── functions/
│   └── config.toml
└── ...
```

**O que o Supabase procura com `.`:**
```
revalya-oficial/
├── migrations/  ← Procura aqui (não existe!)
└── ...
```

**O que o Supabase procura com `supabase`:**
```
revalya-oficial/
├── supabase/
│   └── migrations/  ← Procura aqui (existe!) ✅
└── ...
```

---

## ✅ Após Corrigir

Quando você fizer merge para `main`:

1. ✅ Supabase detecta mudança em `main`
2. ✅ Procura migrations em `supabase/migrations/`
3. ✅ Encontra `20251220202812_test_fluxo_develop_main.sql`
4. ✅ Aplica migration automaticamente
5. ✅ Atualiza histórico

---

## 🔍 Verificação Final

Após corrigir e fazer merge:

**Verificar Logs:**
- Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/logs
- Procure por: "Applying migration" ou "Cloning git repo"

**Verificar Banco:**
```sql
-- Verificar se migration foi aplicada
SELECT version, name FROM supabase_migrations.schema_migrations 
WHERE version = '20251220202812';

-- Verificar se tabela foi criada
SELECT * FROM migration_audit_log;
```

---

**Status**: ⚠️ **PRECISA CORRIGIR "Supabase directory"**

Altere de `.` para `supabase` e salve. Depois teste fazendo merge para main.

