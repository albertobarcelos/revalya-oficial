# 🔍 Como Verificar Erros nos Logs da Branch Main

## 🎯 Objetivo

Verificar erros nos workflows do GitHub Actions na branch `main`.

---

## 📋 Passo a Passo

### 1. Acessar GitHub Actions

1. Acesse: https://github.com/[seu-usuario]/revalya-oficial/actions
2. Ou vá direto: https://github.com/[seu-usuario]/revalya-oficial/actions/workflows/supabase-production.yml

### 2. Ver Execuções Recentes

Você verá uma lista de execuções do workflow "Deploy Supabase - Production".

### 3. Identificar Execuções com Erro

- ✅ **Verde** = Sucesso
- ❌ **Vermelho** = Falhou
- 🟡 **Amarelo** = Em progresso ou cancelado

### 4. Ver Detalhes do Erro

1. **Clique** na execução que falhou (vermelho)
2. **Clique** no job "deploy" (ou o job que falhou)
3. **Expanda** os steps para ver qual falhou
4. **Veja** a mensagem de erro específica

---

## 🔍 Erros Comuns e Soluções

### Erro 1: Migration Já Aplicada

**Mensagem:**
```
ERROR: migration X already applied
```

**Solução:**
```powershell
# Sincronizar histórico
.\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main"
```

### Erro 2: Migration Não Encontrada

**Mensagem:**
```
ERROR: migration file not found
```

**Solução:**
- Verificar se migration está no repositório
- Verificar se está no caminho correto: `supabase/migrations/`

### Erro 3: Erro de SQL

**Mensagem:**
```
ERROR: syntax error at or near...
```

**Solução:**
- Verificar sintaxe SQL da migration
- Testar migration localmente primeiro

### Erro 4: Permissão Negada

**Mensagem:**
```
ERROR: permission denied for...
```

**Solução:**
- Verificar permissões no banco
- Verificar se está usando o usuário correto

### Erro 5: Histórico Desincronizado

**Mensagem:**
```
ERROR: migration history mismatch
```

**Solução:**
```powershell
# Sincronizar histórico
.\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main"
```

---

## 🔧 Verificar Workflow Atual

O workflow `supabase-production.yml` tem uma lista enorme de migrations para reverter (linha 108). Isso indica:

### Problema Identificado

1. **Muitas migrations no banco** que não estão no GitHub
2. **Histórico desincronizado**
3. **Workflow tenta "reparar"** automaticamente, mas pode falhar

### Solução

```powershell
# 1. Sincronizar histórico (uma vez)
.\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main"

# 2. Escolher opção 1: Marcar todas as migrations do GitHub como aplicadas
# (Se elas já estão aplicadas no banco)
```

---

## 📊 Verificar Status Atual

### Ver Migrations no Banco

```sql
-- Conectar ao banco main
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 20;
```

### Ver Migrations no GitHub

```powershell
# Listar migrations no repositório
Get-ChildItem supabase/migrations/*.sql | 
    Where-Object { $_.Name -match '^\d{14}_' } | 
    Select-Object Name | 
    Sort-Object Name
```

### Comparar

Se houver diferenças, precisa sincronizar.

---

## 🎯 Próximos Passos

### Se Encontrou Erros

1. **Anotar** a mensagem de erro exata
2. **Sincronizar histórico** se for erro de migration
3. **Corrigir migration** se for erro de SQL
4. **Testar localmente** antes de fazer merge

### Se Não Encontrou Erros

1. **Verificar** se workflow está rodando corretamente
2. **Configurar integração nativa** para simplificar
3. **Monitorar** próximas execuções

---

## 📝 Checklist de Verificação

- [ ] Acessei os logs do GitHub Actions
- [ ] Identifiquei qual step falhou
- [ ] Anotei a mensagem de erro exata
- [ ] Verifiquei migrations no banco vs GitHub
- [ ] Sincronizei histórico se necessário
- [ ] Corrigi o problema
- [ ] Testei localmente antes de fazer merge

---

**Última atualização**: 2025-01-XX

