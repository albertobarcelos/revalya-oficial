# ⚠️ Problema: Secrets em Environments vs Repository

## 🐛 Erro Encontrado

```
curl: (3) URL rejected: No host part in the URL
```

**Causa:** Os secrets não estão sendo lidos porque podem estar configurados apenas no **Repository**, mas o workflow usa **Environments** (`production` e `Preview`).

---

## 🔍 Como Funciona

### Secrets no GitHub Actions:

1. **Repository Secrets** (`Settings → Secrets → Actions`)
   - Disponíveis para todos os workflows
   - Não são específicos de environment

2. **Environment Secrets** (`Settings → Environments → [nome] → Secrets`)
   - Disponíveis apenas quando o workflow usa `environment: [nome]`
   - Têm prioridade sobre repository secrets

### O Problema:

Quando você usa `environment: production` ou `environment: Preview` no workflow, o GitHub procura os secrets **primeiro no Environment**, depois no Repository.

Se os secrets estão apenas no Repository mas o workflow usa Environment, pode não funcionar corretamente.

---

## ✅ Solução

### Opção 1: Configurar Secrets no Environment (Recomendado)

#### Para Production:

1. Acesse: **Settings** → **Environments** → **production**
2. Clique em **"Add secret"**
3. Adicione:
   - `PRODUCTION_SUPABASE_URL` = `https://wyehpiutzvwplllumgdk.supabase.co`
   - `CRON_SECRET` = `OrSlPUIaxq8insTJXX14YA+WMcV94CoCvdx+Lr1HgMQ=`

#### Para Preview (Development):

1. Acesse: **Settings** → **Environments** → **Preview**
2. Clique em **"Add secret"**
3. Adicione:
   - `DEVELOPMENT_SUPABASE_URL` = `https://sqkkktsstkcupldqtsgi.supabase.co`
   - `CRON_SECRET_DEV` = `BF8s5o0NAUSzWy9rD6Q8Fq4/vIUuaGzs/BPWtdR7mH8=`

### Opção 2: Remover Environments do Workflow

Se preferir usar apenas Repository Secrets, remova a linha `environment:` do workflow:

```yaml
# Antes:
environment: production

# Depois:
# (remover a linha)
```

**⚠️ Nota:** Isso remove a proteção de aprovação manual (se configurada).

---

## 🎯 Recomendação

**Use Opção 1** (secrets nos Environments):
- ✅ Melhor organização (secrets separados por ambiente)
- ✅ Permite aprovação manual para produção
- ✅ Mais seguro
- ✅ Segue boas práticas do GitHub Actions

---

## 📋 Checklist de Configuração

### Environment "production":
- [ ] `PRODUCTION_SUPABASE_URL` = `https://wyehpiutzvwplllumgdk.supabase.co`
- [ ] `CRON_SECRET` = `OrSlPUIaxq8insTJXX14YA+WMcV94CoCvdx+Lr1HgMQ=`

### Environment "Preview":
- [ ] `DEVELOPMENT_SUPABASE_URL` = `https://sqkkktsstkcupldqtsgi.supabase.co`
- [ ] `CRON_SECRET_DEV` = `BF8s5o0NAUSzWy9rD6Q8Fq4/vIUuaGzs/BPWtdR7mH8=`

### Repository Secrets (para outros workflows):
- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `DEVELOPMENT_PROJECT_ID` = `sqkkktsstkcupldqtsgi`
- [ ] `PRODUCTION_PROJECT_ID` = `wyehpiutzvwplllumgdk`

---

## 🧪 Como Verificar

Após configurar, execute o workflow novamente:

1. **Actions** → **Daily Token Cleanup** → **Run workflow**
2. Verifique os logs do step "Validar Secrets"
3. Deve mostrar:
   ```
   PRODUCTION_SUPABASE_URL está configurado: SIM
   CRON_SECRET está configurado: SIM
   ✅ Secrets validados
   ```

---

## 📚 Referências

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Última atualização:** 2025-01-19

