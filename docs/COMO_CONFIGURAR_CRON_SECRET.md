# 🔐 Como Configurar o CRON_SECRET

## 📋 O que é o CRON_SECRET?

O `CRON_SECRET` é um token de segurança usado para autenticar chamadas ao cron job de cleanup. Ele protege a Edge Function `cron-cleanup-scheduler` contra chamadas não autorizadas.

---

## 🎯 Onde Configurar

### 1️⃣ **No Supabase (Edge Function Secrets)**

O `CRON_SECRET` precisa estar configurado como **secret da Edge Function** no Supabase:

#### Para Development:
1. Acesse: https://supabase.com/dashboard/project/sqkkktsstkcupldqtsgi/functions
2. Clique em **"cron-cleanup-scheduler"**
3. Vá em **"Secrets"** (ou **"Settings"** → **"Secrets"**)
4. Adicione o secret:
   - **Name:** `CRON_SECRET`
   - **Value:** (veja abaixo como gerar)

#### Para Production:
1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions
2. Clique em **"cron-cleanup-scheduler"**
3. Vá em **"Secrets"** (ou **"Settings"** → **"Secrets"**)
4. Adicione o secret:
   - **Name:** `CRON_SECRET`
   - **Value:** (pode ser o mesmo ou diferente do development)

### 2️⃣ **No GitHub (Repository Secrets)**

O mesmo valor precisa estar configurado no GitHub para o workflow:

1. Acesse: **Settings** → **Secrets and variables** → **Actions**
2. Adicione:
   - **Name:** `CRON_SECRET` (para produção)
   - **Value:** (mesmo valor configurado no Supabase Production)
3. Adicione:
   - **Name:** `CRON_SECRET_DEV` (para development)
   - **Value:** (mesmo valor configurado no Supabase Development)

---

## 🔑 Como Gerar um CRON_SECRET Seguro

### Opção 1: Usar Node.js (Recomendado)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Opção 2: Usar PowerShell

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Opção 3: Usar OpenSSL

```bash
openssl rand -base64 32
```

### Opção 4: Usar um Gerador Online

- https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" (256-bit)

---

## ✅ Valores Sugeridos

Aqui estão valores seguros gerados que você pode usar:

### Para Development:
```
CRON_SECRET_DEV = [gerar novo valor usando um dos métodos acima]
```

### Para Production:
```
CRON_SECRET = [gerar novo valor usando um dos métodos acima]
```

**⚠️ Importante:** 
- Use valores **diferentes** para development e production (mais seguro)
- Ou use o **mesmo valor** se preferir (mais simples, mas menos seguro)
- **Nunca** compartilhe esses valores publicamente

---

## 📝 Checklist de Configuração

### Supabase Development:
- [ ] Acessar Dashboard Development
- [ ] Edge Function: `cron-cleanup-scheduler`
- [ ] Adicionar secret: `CRON_SECRET` = `[valor gerado]`

### Supabase Production:
- [ ] Acessar Dashboard Production
- [ ] Edge Function: `cron-cleanup-scheduler`
- [ ] Adicionar secret: `CRON_SECRET` = `[valor gerado]`

### GitHub Secrets:
- [ ] `CRON_SECRET` = `[mesmo valor do Supabase Production]`
- [ ] `CRON_SECRET_DEV` = `[mesmo valor do Supabase Development]`
- [ ] `PRODUCTION_SUPABASE_URL` = `https://wyehpiutzvwplllumgdk.supabase.co`
- [ ] `DEVELOPMENT_SUPABASE_URL` = `https://sqkkktsstkcupldqtsgi.supabase.co`

---

## 🧪 Como Testar

### 1. Testar Manualmente via GitHub Actions:

1. Acesse: **Actions** → **Daily Token Cleanup**
2. Clique em **"Run workflow"**
3. Selecione a branch (ex: `main`)
4. Clique em **"Run workflow"**
5. Verifique os logs:
   - ✅ Deve mostrar "✅ Cleanup executado com sucesso"
   - ❌ Se mostrar "401 Unauthorized", o secret está incorreto

### 2. Testar via cURL (Local):

```bash
# Development
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: SEU_CRON_SECRET_DEV_AQUI" \
  "https://sqkkktsstkcupldqtsgi.supabase.co/functions/v1/cron-cleanup-scheduler"

# Production
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: SEU_CRON_SECRET_AQUI" \
  "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/cron-cleanup-scheduler"
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Cron cleanup executed successfully",
  "cleanupResult": { ... }
}
```

---

## 🔍 Verificar Secrets Configurados

### No Supabase:

1. Dashboard → Edge Functions → `cron-cleanup-scheduler`
2. Secrets → Você verá os **nomes** dos secrets (mas não os valores)
3. Verifique se `CRON_SECRET` está listado

### No GitHub:

1. Settings → Secrets and variables → Actions
2. Verifique se `CRON_SECRET` e `CRON_SECRET_DEV` estão listados
3. ⚠️ Você não verá os valores (por segurança)

---

## ⚠️ Troubleshooting

### Erro: "401 Unauthorized - Invalid cron secret"

**Causa:** O secret no GitHub não corresponde ao secret no Supabase

**Solução:**
1. Verifique se o valor em ambos os lugares é **exatamente igual**
2. Verifique se não há espaços extras ou caracteres especiais
3. Reconfigure o secret em ambos os lugares

### Erro: "CRON_SECRET não está configurado"

**Causa:** O secret não foi adicionado no GitHub

**Solução:**
1. Adicione o secret no GitHub: Settings → Secrets → Actions
2. Use o nome exato: `CRON_SECRET` ou `CRON_SECRET_DEV`

### Erro: "URL rejected: No host part"

**Causa:** `PRODUCTION_SUPABASE_URL` ou `DEVELOPMENT_SUPABASE_URL` não configurado

**Solução:**
1. Adicione os secrets no GitHub:
   - `PRODUCTION_SUPABASE_URL` = `https://wyehpiutzvwplllumgdk.supabase.co`
   - `DEVELOPMENT_SUPABASE_URL` = `https://sqkkktsstkcupldqtsgi.supabase.co`

---

## 🔒 Boas Práticas

1. ✅ Use valores **diferentes** para dev e prod
2. ✅ **Nunca** commite secrets no código
3. ✅ **Rotacione** os secrets periodicamente (ex: a cada 6 meses)
4. ✅ Use valores **longos e aleatórios** (mínimo 32 caracteres)
5. ✅ **Documente** onde cada secret está configurado

---

## 📚 Referências

- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Última atualização:** 2025-01-19

