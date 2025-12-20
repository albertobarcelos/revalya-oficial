# 🚀 Workflow Completo: Develop → Main (Produção)

## 📋 Visão Geral

Este guia descreve o processo completo para desenvolver, testar e migrar mudanças do ambiente **develop** para **main** (produção), incluindo:
- ✅ Edge Functions
- ✅ Migrations (mudanças em tabelas, funções, triggers, policies)
- ✅ Configurações e variáveis de ambiente
- ✅ Outras mudanças de infraestrutura

## 🎯 Princípios Fundamentais

1. **SEMPRE desenvolver e testar na develop primeiro**
2. **NUNCA fazer deploy direto para main sem testar**
3. **Validar completamente antes de migrar**
4. **Documentar todas as mudanças**
5. **Ter plano de rollback sempre disponível**

---

## 📊 Identificação dos Ambientes

### Project IDs

- **Main (Produção)**: `wyehpiutzvwplllumgdk`
- **Develop (Desenvolvimento)**: `ivaeoagtrvjsksebnqwr`

### URLs dos Dashboards

- **Main**: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk
- **Develop**: https://supabase.com/dashboard/project/ivaeoagtrvjsksebnqwr

---

## 🔄 FASE 1: Desenvolvimento na Develop

### 1.1 Edge Functions

#### Criar/Modificar Edge Function

```bash
# Criar nova function
mkdir supabase/functions/nova-function
# Editar: supabase/functions/nova-function/index.ts
```

#### Deploy para Develop (Teste)

```powershell
# Opção 1: Deploy de uma function específica
supabase functions deploy nova-function --project-ref ivaeoagtrvjsksebnqwr

# Opção 2: Deploy de todas as functions (script automatizado)
.\deploy_functions_to_develop.ps1
```

#### Testar na Develop

1. **Testar endpoints** manualmente ou via Postman/Insomnia
2. **Verificar logs** no Dashboard:
   - Develop Dashboard > Functions > [function] > Logs
3. **Validar comportamento** esperado
4. **Testar casos de erro** e edge cases

### 1.2 Migrations (Mudanças em Tabelas)

#### Criar Nova Migration

```bash
# Criar migration com timestamp automático
supabase migration new nome_da_migration

# OU criar manualmente
# Arquivo: supabase/migrations/YYYYMMDDHHMMSS_nome_da_migration.sql
```

#### Aplicar Migration na Develop

```bash
# Opção 1: Via CLI (recomendado)
supabase link --project-ref ivaeoagtrvjsksebnqwr
supabase db push

# Opção 2: Via Dashboard (SQL Editor)
# 1. Acesse: https://supabase.com/dashboard/project/ivaeoagtrvjsksebnqwr
# 2. SQL Editor > New query
# 3. Cole o conteúdo da migration
# 4. Execute (Run)
```

#### Validar Migration na Develop

```sql
-- Verificar se tabela/função foi criada
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- Verificar triggers
SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public';

-- Verificar policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Verificar functions RPC
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

### 1.3 Configurações e Variáveis de Ambiente

#### Configurar Variáveis na Develop

1. **Acesse Dashboard Develop**: https://supabase.com/dashboard/project/ivaeoagtrvjsksebnqwr
2. **Settings > Edge Functions > Secrets**
3. **Adicione/Modifique variáveis** necessárias
4. **Teste** se as variáveis estão sendo lidas corretamente

---

## ✅ FASE 2: Validação e Preparação

### 2.1 Comparar Status entre Develop e Main

```powershell
# Executar script de comparação
.\comparar_main_develop.ps1
```

Este script mostra:
- ✅ Functions com versões diferentes
- ✅ Functions com `verify_jwt` diferente
- ✅ Functions que existem apenas em um ambiente
- ✅ Migrations que estão no develop mas não no main

### 2.2 Checklist de Validação

Antes de migrar para main, verifique:

#### Edge Functions
- [ ] Function testada e funcionando na develop
- [ ] Código revisado e documentado
- [ ] Configurações verificadas (`verify_jwt`, env vars)
- [ ] Versão local sincronizada com develop
- [ ] Logs analisados (sem erros críticos)
- [ ] Performance validada

#### Migrations
- [ ] Migration testada na develop
- [ ] Sem erros de constraint ou dependências
- [ ] Rollback plan documentado
- [ ] Backup do banco antes de aplicar (se necessário)
- [ ] Tempo estimado de aplicação conhecido

#### Configurações
- [ ] Variáveis de ambiente documentadas
- [ ] Valores de produção diferentes de desenvolvimento (se aplicável)
- [ ] Configurações de segurança validadas

---

## 🚀 FASE 3: Migração para Main (Produção)

### 3.1 Migrar Edge Functions

#### Opção 1: Deploy Seletivo (RECOMENDADO)

```powershell
# Deploy de functions específicas
.\deploy_functions_to_main.ps1 -Functions "nova-function,outra-function"
```

#### Opção 2: Deploy de Todas (CUIDADO!)

```powershell
# Deploy de todas as functions (solicita confirmação)
.\deploy_functions_to_main.ps1
```

#### Opção 3: Deploy Manual

```bash
# Deploy de uma function específica
supabase functions deploy nova-function --project-ref wyehpiutzvwplllumgdk
```

### 3.2 Migrar Migrations

#### Opção 1: Via CLI (Recomendado)

```bash
# 1. Conectar ao projeto main
supabase link --project-ref wyehpiutzvwplllumgdk

# 2. Verificar diferenças primeiro (dry-run)
supabase db diff

# 3. Aplicar migrations
supabase db push
```

#### Opção 2: Via Dashboard (Mais Seguro para Produção)

1. **Acesse Dashboard Main**: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk
2. **SQL Editor > New query**
3. **Abra o arquivo de migration** em `supabase/migrations/`
4. **Cole o conteúdo** no editor
5. **Revise cuidadosamente** antes de executar
6. **Execute** (Run ou Ctrl+Enter)

#### Opção 3: Migrations Seletivas

Se você tem múltiplas migrations no develop mas quer aplicar apenas algumas:

```bash
# 1. Identificar migrations pendentes
.\comparar_main_develop.ps1

# 2. Aplicar migration específica via Dashboard (Opção 2)
# OU criar migration consolidada com apenas as mudanças necessárias
```

### 3.3 Migrar Configurações

#### Variáveis de Ambiente

1. **Acesse Dashboard Main**: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk
2. **Settings > Edge Functions > Secrets**
3. **Adicione/Modifique variáveis** (valores de produção!)
4. **Verifique** se os valores estão corretos

⚠️ **ATENÇÃO**: Valores de produção podem ser diferentes de desenvolvimento!

---

## 🔍 FASE 4: Verificação Pós-Deploy

### 4.1 Verificar Edge Functions

#### Dashboard
1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions
2. Verifique se a versão está correta
3. Verifique se `verify_jwt` está configurado corretamente

#### Testar Endpoint

```bash
# Testar endpoint em produção
curl -X POST https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/nova-function \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

#### Verificar Logs

1. Dashboard > Functions > [function] > Logs
2. Verificar erros ou warnings
3. Monitorar por alguns minutos após deploy

### 4.2 Verificar Migrations

```sql
-- Verificar migrations aplicadas
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;

-- Verificar se tabela/função foi criada
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'nova_tabela';

-- Verificar se trigger foi criado
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'nome_do_trigger';
```

### 4.3 Comparar Ambientes

```powershell
# Executar comparação final
.\comparar_main_develop.ps1
```

Verificar se:
- ✅ Versões das functions estão sincronizadas
- ✅ Migrations foram aplicadas
- ✅ Não há inconsistências

---

## 📝 Scripts Disponíveis

### 1. `deploy_functions_to_develop.ps1`
Deploy de todas as functions locais para develop.

```powershell
.\deploy_functions_to_develop.ps1
```

### 2. `deploy_functions_to_main.ps1`
Deploy seletivo ou completo de functions para main.

```powershell
# Deploy seletivo
.\deploy_functions_to_main.ps1 -Functions "function1,function2"

# Deploy de todas (com confirmação)
.\deploy_functions_to_main.ps1

# Dry-run (simulação)
.\deploy_functions_to_main.ps1 -DryRun
```

### 3. `comparar_main_develop.ps1`
Compara functions e migrations entre main e develop.

```powershell
.\comparar_main_develop.ps1
```

---

## ⚠️ Regras Críticas

### ✅ SEMPRE Fazer

1. **Testar completamente na develop antes de migrar**
2. **Verificar configurações** (`verify_jwt`, variáveis de ambiente)
3. **Documentar mudanças** em comentários ou changelog
4. **Fazer deploy seletivo** (não todas as functions de uma vez)
5. **Verificar logs após deploy** em produção
6. **Comparar ambientes** antes e depois
7. **Ter plano de rollback** documentado

### ❌ NUNCA Fazer

1. **Deploy direto para main sem testar na develop**
2. **Deploy de todas as functions sem verificar diferenças**
3. **Ignorar diferenças de versão** entre ambientes
4. **Modificar functions em produção** sem versionar
5. **Aplicar migrations sem backup** (se dados críticos)
6. **Usar valores de desenvolvimento em produção**

---

## 🚨 Troubleshooting

### Problema: Versão diferente entre develop e main

**Solução:**
1. Verificar qual versão está correta
2. Fazer deploy da versão correta para o ambiente desatualizado
3. Verificar se há mudanças não commitadas localmente

### Problema: `verify_jwt` diferente

**Solução:**
1. Verificar qual configuração está correta
2. Fazer deploy com a flag correta:
   ```bash
   supabase functions deploy function-name --verify-jwt true
   # ou
   supabase functions deploy function-name --no-verify-jwt
   ```

### Problema: Function não funciona após deploy

**Solução:**
1. Verificar logs no Dashboard
2. Verificar variáveis de ambiente
3. Verificar se dependências estão corretas
4. Fazer rollback se necessário (deploy da versão anterior)

### Problema: Migration falha em produção

**Solução:**
1. Verificar logs de erro no Dashboard
2. Verificar se constraints não conflitam
3. Verificar se dependências existem
4. Se necessário, criar migration de rollback
5. Aplicar rollback via Dashboard SQL Editor

### Problema: Dados inconsistentes após migration

**Solução:**
1. Verificar se migration foi aplicada corretamente
2. Verificar se triggers estão funcionando
3. Executar scripts de correção de dados (se necessário)
4. Considerar rollback se dados críticos foram afetados

---

## 📋 Checklist Completo de Migração

### Antes de Iniciar
- [ ] Mudanças testadas e funcionando na develop
- [ ] Código revisado e documentado
- [ ] Comparação entre develop e main executada
- [ ] Plano de rollback preparado

### Edge Functions
- [ ] Functions testadas na develop
- [ ] Configurações verificadas (`verify_jwt`, env vars)
- [ ] Versão local sincronizada com develop
- [ ] Deploy realizado para main
- [ ] Versão verificada no Dashboard
- [ ] Endpoint testado em produção
- [ ] Logs monitorados (sem erros)

### Migrations
- [ ] Migration testada na develop
- [ ] Backup do banco (se dados críticos)
- [ ] Migration aplicada em main
- [ ] Tabelas/funções/triggers verificados
- [ ] Dados validados (se aplicável)
- [ ] Performance verificada

### Configurações
- [ ] Variáveis de ambiente configuradas em main
- [ ] Valores de produção diferentes de desenvolvimento
- [ ] Configurações de segurança validadas

### Pós-Deploy
- [ ] Comparação final executada
- [ ] Nenhuma inconsistência encontrada
- [ ] Sistema funcionando normalmente
- [ ] Logs monitorados por período adequado
- [ ] Documentação atualizada

---

## 🎯 Workflow Resumido (Quick Reference)

### Desenvolvimento
```bash
# 1. Criar/modificar function ou migration
# 2. Deploy para develop
.\deploy_functions_to_develop.ps1
# OU
supabase db push --project-ref ivaeoagtrvjsksebnqwr

# 3. Testar
# 4. Validar
```

### Migração para Produção
```bash
# 1. Comparar ambientes
.\comparar_main_develop.ps1

# 2. Deploy seletivo de functions
.\deploy_functions_to_main.ps1 -Functions "function1,function2"

# 3. Aplicar migrations (via Dashboard ou CLI)
supabase db push --project-ref wyehpiutzvwplllumgdk

# 4. Verificar
.\comparar_main_develop.ps1
```

---

## 📚 Referências

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- `GUIA_WORKFLOW_EDGE_FUNCTIONS.md` - Detalhes sobre Edge Functions
- `GUIA_SINCRONIZACAO_EDGE_FUNCTIONS.md` - Sincronização do main para local
- `PASSO_A_PASSO_MIGRACAO.md` - Detalhes sobre migrations

---

## 🎓 Próximos Passos

1. **Execute** `.\comparar_main_develop.ps1` para ver status atual
2. **Identifique** mudanças que precisam ser migradas
3. **Siga o workflow** fase por fase
4. **Monitore** após cada deploy
5. **Documente** mudanças importantes

---

**Última atualização**: 2025-01-XX  
**Mantido por**: Equipe Revalya

