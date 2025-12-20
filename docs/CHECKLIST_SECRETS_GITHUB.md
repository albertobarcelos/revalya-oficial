# ✅ Checklist: Configurar Secrets no GitHub

## 🔐 Secrets Necessários

### Para os Workflows de Deploy:

| Secret | Valor | Onde Usar |
|--------|-------|-----------|
| `SUPABASE_ACCESS_TOKEN` | Token do Supabase | Todos os workflows de deploy |
| `DEVELOPMENT_PROJECT_ID` | `sqkkktsstkcupldqtsgi` | Deploy Development |
| `PRODUCTION_PROJECT_ID` | `wyehpiutzvwplllumgdk` | Deploy Production |

### Para o Workflow de Cleanup:

| Secret | Valor | Onde Usar |
|--------|-------|-----------|
| `CRON_SECRET` | Valor configurado no Supabase Production | Cleanup Production |
| `CRON_SECRET_DEV` | Valor configurado no Supabase Development | Cleanup Development |
| `PRODUCTION_SUPABASE_URL` | `https://wyehpiutzvwplllumgdk.supabase.co` | Cleanup Production |
| `DEVELOPMENT_SUPABASE_URL` | `https://sqkkktsstkcupldqtsgi.supabase.co` | Cleanup Development |

---

## 📝 Passo a Passo

### 1. Obter SUPABASE_ACCESS_TOKEN

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em **"Generate new token"**
3. Dê um nome (ex: "GitHub Actions")
4. Copie o token gerado

### 2. Configurar Secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**
4. Adicione cada secret abaixo:

#### Secrets de Deploy:

```
Name: SUPABASE_ACCESS_TOKEN
Value: [token obtido no passo 1]
```

```
Name: DEVELOPMENT_PROJECT_ID
Value: sqkkktsstkcupldqtsgi
```

```
Name: PRODUCTION_PROJECT_ID
Value: wyehpiutzvwplllumgdk
```

#### Secrets de Cleanup:

```
Name: CRON_SECRET
Value: OrSlPUIaxq8insTJXX14YA+WMcV94CoCvdx+Lr1HgMQ=
```

```
Name: CRON_SECRET_DEV
Value: BF8s5o0NAUSzWy9rD6Q8Fq4/vIUuaGzs/BPWtdR7mH8=
```

```
Name: PRODUCTION_SUPABASE_URL
Value: https://wyehpiutzvwplllumgdk.supabase.co
```

```
Name: DEVELOPMENT_SUPABASE_URL
Value: https://sqkkktsstkcupldqtsgi.supabase.co
```

---

## ✅ Checklist Completo

### GitHub Secrets:
- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `DEVELOPMENT_PROJECT_ID`
- [ ] `PRODUCTION_PROJECT_ID`
- [ ] `CRON_SECRET`
- [ ] `CRON_SECRET_DEV`
- [ ] `PRODUCTION_SUPABASE_URL`
- [ ] `DEVELOPMENT_SUPABASE_URL`

### Supabase Edge Functions Secrets:

#### Development:
- [ ] `CRON_SECRET` = `BF8s5o0NAUSzWy9rD6Q8Fq4/vIUuaGzs/BPWtdR7mH8=`
  - Dashboard: https://supabase.com/dashboard/project/sqkkktsstkcupldqtsgi/functions/cron-cleanup-scheduler

#### Production:
- [ ] `CRON_SECRET` = `OrSlPUIaxq8insTJXX14YA+WMcV94CoCvdx+Lr1HgMQ=`
  - Dashboard: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions/cron-cleanup-scheduler

---

## 🧪 Como Testar

### Testar Deploy:
1. Fazer merge para `develop` → Deve disparar deploy automático
2. Verificar em **Actions** se executou com sucesso

### Testar Cleanup:
1. **Actions** → **Daily Token Cleanup** → **Run workflow**
2. Verificar logs de ambos os jobs
3. Deve mostrar "✅ Cleanup executado com sucesso"

---

## ⚠️ Importante

- ⚠️ Os valores de `CRON_SECRET` no GitHub devem ser **exatamente iguais** aos configurados no Supabase
- ⚠️ Não inclua `/functions/v1/...` nas URLs, apenas a URL base
- ⚠️ Verifique se não há espaços extras ao copiar/colar os valores

---

**Última atualização:** 2025-01-19

