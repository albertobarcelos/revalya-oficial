# 🔧 Correção: Caminho "Supabase directory" Duplicado

## 🐛 Problema Identificado

**Erro nos logs:**
```
INFO Config file not found... path=supabase/supabase/config.toml
Remote migration versions not found in local migrations directory.
```

**Análise:**
- O Supabase está procurando em `supabase/supabase/config.toml` (duplicado!)
- Deveria procurar em `supabase/config.toml`
- Isso indica que o valor do "Supabase directory" está sendo concatenado incorretamente

---

## ✅ Solução

### Opção 1: Usar `.` (Raiz) - RECOMENDADO

Segundo a documentação do Supabase, o "Supabase directory" deve ser o **caminho relativo** ao diretório `supabase` a partir da **raiz do repositório**.

**Se o diretório `supabase/` está na raiz:**
- Use `.` (ponto/raiz) como valor
- O Supabase procurará em `./supabase/config.toml` e `./supabase/migrations/`

**Passos:**
1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/settings/integrations
2. Altere "Supabase directory" de `supabase` para `.` (ponto)
3. Clique em **"Save changes"**

### Opção 2: Verificar Estrutura do Repositório

Se o diretório `supabase/` não está na raiz, você precisa ajustar:

**Estrutura esperada:**
```
revalya-oficial/          ← Raiz do repositório
├── supabase/            ← Diretório Supabase
│   ├── config.toml
│   ├── migrations/
│   └── functions/
└── ...
```

**Se sua estrutura for diferente:**
- Ajuste o "Supabase directory" para o caminho relativo correto
- Exemplo: Se estiver em `src/supabase/`, use `src/supabase`

---

## 🔍 Diagnóstico

### Verificar Estrutura Atual:

```bash
# Verificar se supabase está na raiz
ls supabase/config.toml
ls supabase/migrations/

# Verificar estrutura completa
tree supabase/ -L 2
```

### O Que o Supabase Espera:

1. **Se "Supabase directory" = `.` (raiz):**
   - Procura em: `./supabase/config.toml`
   - Procura em: `./supabase/migrations/`

2. **Se "Supabase directory" = `supabase`:**
   - Pode procurar em: `supabase/supabase/config.toml` (ERRADO!)
   - Ou pode procurar em: `supabase/config.toml` (CORRETO!)

O comportamento depende de como o Supabase interpreta o caminho.

---

## 🎯 Teste Recomendado

### Passo 1: Alterar para `.` (Raiz)

1. Altere "Supabase directory" para `.`
2. Salve

### Passo 2: Fazer Teste

1. Faça um commit vazio na `main`:
   ```bash
   git commit --allow-empty -m "test: verify supabase directory path"
   git push
   ```

2. Aguarde 2-5 minutos

3. Verifique os logs:
   - Deve procurar em `supabase/config.toml` (não `supabase/supabase/config.toml`)
   - Deve encontrar as migrations

### Passo 3: Se Ainda Não Funcionar

Tente alternativas:
- `./supabase` (com barra)
- Deixar vazio (se permitido)
- Verificar documentação específica do seu projeto

---

## 📚 Referência

Baseado na documentação:
- [Supabase GitHub Integration](https://supabase.com/docs/guides/deployment/branching/github-integration)

**Trecho relevante:**
> "Fill in the relative path to the Supabase directory from your repository root."

**Interpretação:**
- Se `supabase/` está na raiz → use `.` ou deixe vazio
- Se `supabase/` está em subdiretório → use o caminho relativo

---

## ⚡ Ação Imediata

**1. Altere "Supabase directory" de `supabase` para `.` (ponto)**
**2. Clique em "Save changes"**
**3. Aguarde e teste novamente**

---

**Status:** ⚠️ **TESTANDO COM `.` (RAIZ)**

