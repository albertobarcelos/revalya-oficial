# 🔍 Diagnóstico: Supabase Preview Skipped

## 🐛 Problema

O Supabase está pulando (skipping) a verificação no PR sem tentar aplicar migrations.

**Mensagem no GitHub:**
```
Supabase Preview - Skipped
"Creating a new preview branch per PR is disabled. 
You can re-enable it in Project Integrations Settings."
```

---

## 🔍 Análise

### O Que Está Acontecendo

1. **Supabase Preview está desabilitado** (esperado)
   - Isso é normal se você desabilitou "Automatic Branching"
   - Preview branches são para testar PRs antes de merge

2. **Mas o "Deploy to production" pode não estar funcionando**
   - Quando você faz merge para `main`, o Supabase deveria aplicar migrations
   - Se não está tentando, pode ser problema de configuração

---

## ✅ Verificações Necessárias

### 1. Verificar Configuração da Integração

Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/settings/integrations

**Verificar:**

1. **"Deploy to production"** deve estar ✅ **HABILITADO**
2. **"Production branch"** deve estar configurado como `main`
3. **"Automatic branching"** pode estar ❌ **DESABILITADO** (isso é OK)

### 2. Verificar Se Integração Está Ativa

- A integração deve estar conectada ao repositório correto
- Deve estar apontando para a branch `main`

### 3. Verificar Logs Após Merge

Quando você fizer merge para `main`, verificar:
- Logs do Supabase: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/logs
- Se há tentativa de aplicar migrations
- Se há algum erro

---

## 🔧 Possíveis Causas

### Causa 1: "Deploy to production" Não Está Habilitado

**Sintoma:**
- Supabase não tenta aplicar migrations quando faz merge para main

**Solução:**
1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/settings/integrations
2. Clique na integração GitHub
3. ✅ Habilite "Deploy to production"
4. Configure "Production branch" como `main`
5. Salve

### Causa 2: Branch de Produção Incorreta

**Sintoma:**
- Integração está configurada para outra branch

**Solução:**
- Verificar se "Production branch" está como `main`

### Causa 3: Integração Não Está Conectada

**Sintoma:**
- Integração não detecta mudanças

**Solução:**
- Verificar se integração está autorizada e conectada

### Causa 4: Caminho do Diretório Supabase Incorreto

**Sintoma:**
- Supabase não encontra migrations

**Solução:**
- Verificar se "Supabase directory path" está como `supabase`

---

## 🎯 O Que Fazer Agora

### Passo 1: Verificar Configuração

1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/settings/integrations
2. Clique na integração GitHub
3. Verifique:
   - ✅ "Deploy to production" está habilitado?
   - ✅ "Production branch" está como `main`?
   - ✅ "Supabase directory path" está como `supabase`?

### Passo 2: Testar Após Configurar

1. Fazer merge do PR para `main`
2. Aguardar alguns minutos
3. Verificar logs: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/logs
4. Verificar se migration foi aplicada:
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations 
   WHERE version = '20251220202812';
   ```

### Passo 3: Se Não Funcionar

Se mesmo após configurar não funcionar:

1. **Aplicar manualmente** (temporário):
   ```bash
   supabase link --project-ref wyehpiutzvwplllumgdk
   supabase db push
   ```

2. **Verificar logs** para entender o erro

3. **Contatar suporte** do Supabase se necessário

---

## 📊 Status Esperado

### Se Tudo Estiver Configurado Corretamente:

✅ **No PR:**
- Supabase Preview: Skipped (normal, se Automatic Branching desabilitado)

✅ **Após Merge para Main:**
- Supabase detecta mudança em `main`
- Aplica migrations automaticamente
- Logs mostram processo de aplicação

---

## 🔍 Checklist de Diagnóstico

- [ ] "Deploy to production" está habilitado?
- [ ] "Production branch" está como `main`?
- [ ] Integração está conectada ao repositório correto?
- [ ] "Supabase directory path" está como `supabase`?
- [ ] Após merge para main, há logs de tentativa de aplicação?
- [ ] Migration foi aplicada no banco?

---

## 🎯 Próximos Passos

1. **Verificar configuração** no Dashboard
2. **Fazer merge** do PR para main
3. **Monitorar logs** do Supabase
4. **Verificar** se migration foi aplicada

---

**Status**: ⚠️ **PRECISA VERIFICAR CONFIGURAÇÃO**

O Supabase Preview está sendo pulado (normal), mas precisa verificar se "Deploy to production" está configurado corretamente.

