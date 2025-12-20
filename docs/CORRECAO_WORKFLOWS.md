# ✅ Correção dos Workflows do GitHub Actions

## 🐛 Problemas Identificados e Corrigidos

### 1️⃣ **Workflow Duplicado**

**Problema:**
- `supabase-validate.yml` e `supabase-staging.yml` eram **idênticos**
- Ambos faziam a mesma validação de migrations

**Solução:**
- ✅ Removido `supabase-staging.yml` (duplicado)
- ✅ Mantido apenas `supabase-validate.yml`

---

### 2️⃣ **Erro no "Daily Token Cleanup"**

**Problemas encontrados:**
- ❌ Não tinha tratamento de erro adequado
- ❌ Não verificava se a resposta foi bem-sucedida
- ❌ Não mostrava erros de forma clara
- ❌ Executava apenas em um ambiente (não tinha separação dev/prod)

**Solução aplicada:**
- ✅ Adicionado tratamento de erro adequado
- ✅ Verificação de HTTP status code
- ✅ Logs detalhados de sucesso/erro
- ✅ Separação em dois jobs: `cleanup-production` e `cleanup-development`
- ✅ Suporte para secrets diferentes por ambiente

---

## 🔐 Secrets Necessários

### Para o Workflow de Cleanup:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `CRON_SECRET` | Secret para produção | Valor configurado no Supabase Production |
| `CRON_SECRET_DEV` | Secret para development | Valor configurado no Supabase Development |
| `PRODUCTION_SUPABASE_URL` | URL do Supabase Production | `https://wyehpiutzvwplllumgdk.supabase.co` |
| `DEVELOPMENT_SUPABASE_URL` | URL do Supabase Development | `https://sqkkktsstkcupldqtsgi.supabase.co` |

### Como Configurar:

1. Acesse: **Settings** → **Secrets and variables** → **Actions**
2. Clique em **"New repository secret"**
3. Adicione cada secret acima com os valores corretos

**Valores dos URLs:**
- `PRODUCTION_SUPABASE_URL` = `https://wyehpiutzvwplllumgdk.supabase.co`
- `DEVELOPMENT_SUPABASE_URL` = `https://sqkkktsstkcupldqtsgi.supabase.co`

**Nota:** Os secrets `CRON_SECRET` e `CRON_SECRET_DEV` devem ser os mesmos valores configurados nas Edge Functions do Supabase (secrets das Edge Functions).

**⚠️ Importante:** 
- Não inclua `/functions/v1/...` no URL, apenas a URL base do Supabase
- O workflow agora valida os secrets antes de executar e mostra mensagens de erro claras se estiverem faltando

---

## 📋 Estrutura Final dos Workflows

### Workflows Ativos:

1. **`supabase-development.yml`**
   - Deploy automático quando há merge para `develop`
   - Environment: `Preview`

2. **`supabase-production.yml`**
   - Deploy automático quando há merge de `develop` para `main`
   - Environment: `production`

3. **`supabase-validate.yml`**
   - Valida migrations antes do merge
   - Executa em PRs e pushes para `develop`

4. **`cleanup-cron.yml`**
   - Executa cleanup diário (02:00 UTC)
   - Separação: `cleanup-production` e `cleanup-development`
   - Pode ser executado manualmente via `workflow_dispatch`

5. **`deploy.yml`**
   - Deploy manual para VPS (frontend)
   - Não relacionado ao Supabase

---

## ✅ Melhorias Aplicadas no Cleanup

### Antes:
```yaml
- name: Execute Cleanup
  run: |
    curl -X POST \
      -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
      "${{ secrets.SUPABASE_URL }}/functions/v1/cron-cleanup-scheduler"
```

**Problemas:**
- Sem verificação de erro
- Sem logs detalhados
- Apenas um ambiente

### Depois:
```yaml
- name: Execute Cleanup - Production
  id: cleanup
  run: |
    set -e
    RESPONSE=$(curl -s -w "\n%{http_code}" ...)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
      echo "✅ Cleanup executado com sucesso"
    else
      echo "❌ Erro no cleanup: HTTP $HTTP_CODE"
      exit 1
    fi
```

**Melhorias:**
- ✅ Verificação de HTTP status code
- ✅ Logs detalhados
- ✅ Separação dev/prod
- ✅ Tratamento de erro adequado
- ✅ Resumo no GitHub Step Summary

---

## 🧪 Como Testar

### Testar Cleanup Manualmente:

1. Acesse: **Actions** → **Daily Token Cleanup**
2. Clique em **"Run workflow"**
3. Selecione a branch (ex: `main`)
4. Clique em **"Run workflow"**
5. Verifique os logs de ambos os jobs:
   - `cleanup-production`
   - `cleanup-development`

### Verificar se Funcionou:

- ✅ Ambos os jobs devem ter status `success`
- ✅ Logs devem mostrar "✅ Cleanup executado com sucesso"
- ✅ HTTP Status deve ser 200

---

## 🔍 Troubleshooting

### Erro: "HTTP 401 - Unauthorized"

**Causa:** Secret incorreto ou não configurado

**Solução:**
1. Verifique se `CRON_SECRET` e `CRON_SECRET_DEV` estão configurados
2. Verifique se os valores correspondem aos secrets das Edge Functions no Supabase

### Erro: "HTTP 404 - Not Found"

**Causa:** URL incorreta ou Edge Function não deployada

**Solução:**
1. Verifique se `PRODUCTION_SUPABASE_URL` e `DEVELOPMENT_SUPABASE_URL` estão corretos
2. Verifique se a Edge Function `cron-cleanup-scheduler` está deployada em ambos os ambientes

### Erro: "HTTP 500 - Internal Server Error"

**Causa:** Erro na Edge Function

**Solução:**
1. Verifique os logs da Edge Function no Supabase Dashboard
2. Verifique se os secrets da Edge Function estão configurados corretamente

---

## 📝 Resumo das Mudanças

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `supabase-staging.yml` | ❌ Removido | Duplicado de `supabase-validate.yml` |
| `cleanup-cron.yml` | ✅ Corrigido | Melhor tratamento de erro e separação dev/prod |

---

**Última atualização:** 2025-01-19

