# 🚀 Guia Completo: Workflow de Edge Functions (Develop → Main)

## 📋 Visão Geral

Este guia descreve o processo completo para desenvolver, testar e migrar Edge Functions do ambiente **develop** para **main** (produção).

## 🎯 Objetivo

Garantir que novas Edge Functions desenvolvidas e testadas na **develop** sejam corretamente migradas para **main** sem perder configurações ou versões.

## 🔄 Fluxo de Trabalho Recomendado

### Fase 1: Desenvolvimento na Develop

1. **Criar/Modificar Edge Function Localmente**
   ```bash
   # Criar nova function
   mkdir supabase/functions/nova-function
   # Editar: supabase/functions/nova-function/index.ts
   ```

2. **Deploy para Develop (Teste)**
   ```powershell
   # Deploy de uma function específica
   supabase functions deploy nova-function --project-ref ivaeoagtrvjsksebnqwr
   
   # OU usar script automatizado
   .\deploy_functions_to_develop.ps1
   ```

3. **Testar na Develop**
   - Testar endpoints
   - Verificar logs
   - Validar comportamento

### Fase 2: Validação e Preparação

4. **Comparar Status das Functions**
   ```powershell
   # Verificar diferenças entre develop e main
   .\comparar_main_develop.ps1
   ```

5. **Verificar Configurações**
   - `verify_jwt` está correto?
   - Variáveis de ambiente configuradas?
   - Dependências corretas?

### Fase 3: Migração para Main

6. **Deploy Seletivo para Main**
   ```powershell
   # Deploy de functions específicas para main
   .\deploy_functions_to_main.ps1 -Functions "nova-function,outra-function"
   ```

7. **Verificar Deploy**
   - Confirmar versão no Dashboard
   - Testar em produção
   - Monitorar logs

## 📊 Comparação de Ambientes

### Project IDs

- **Main (Produção)**: `wyehpiutzvwplllumgdk`
- **Develop (Desenvolvimento)**: `ivaeoagtrvjsksebnqwr`

### Status Atual

Execute `.\comparar_main_develop.ps1` para ver:
- Functions com versões diferentes
- Functions com `verify_jwt` diferente
- Functions que existem apenas em um ambiente

## 🛠️ Scripts Disponíveis

### 1. `deploy_functions_to_develop.ps1`
Deploy de todas as functions locais para develop.

### 2. `deploy_functions_to_main.ps1` (NOVO)
Deploy seletivo de functions para main (produção).

### 3. `comparar_main_develop.ps1`
Compara functions entre main e develop.

### 4. `verificar_function_status.ps1` (NOVO)
Verifica status detalhado de uma function específica.

## ⚠️ Regras Importantes

### ✅ SEMPRE Fazer

1. **Testar completamente na develop antes de migrar**
2. **Verificar configurações** (`verify_jwt`, variáveis de ambiente)
3. **Documentar mudanças** em comentários ou changelog
4. **Fazer deploy seletivo** (não todas as functions de uma vez)
5. **Verificar logs após deploy** em produção

### ❌ NUNCA Fazer

1. **Deploy direto para main sem testar na develop**
2. **Deploy de todas as functions sem verificar diferenças**
3. **Ignorar diferenças de versão** entre ambientes
4. **Modificar functions em produção** sem versionar

## 📝 Checklist de Migração

Antes de migrar uma function para main:

- [ ] Function testada e funcionando na develop
- [ ] Código revisado e documentado
- [ ] Configurações verificadas (`verify_jwt`, env vars)
- [ ] Versão local sincronizada com develop
- [ ] Comparação com main executada
- [ ] Deploy testado em ambiente de staging (se houver)
- [ ] Logs monitorados após deploy
- [ ] Rollback plan preparado (se necessário)

## 🔍 Verificação Pós-Deploy

Após fazer deploy para main:

1. **Verificar Dashboard**
   ```
   https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions
   ```

2. **Testar Endpoint**
   ```bash
   curl -X POST https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/nova-function \
     -H "Authorization: Bearer <token>"
   ```

3. **Verificar Logs**
   - Dashboard > Functions > [function] > Logs
   - Verificar erros ou warnings

4. **Comparar Versões**
   ```powershell
   .\comparar_main_develop.ps1
   ```

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

## 📚 Referências

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- `GUIA_SINCRONIZACAO_EDGE_FUNCTIONS.md` - Sincronização do main para local
- `PASSO_A_PASSO_MIGRACAO.md` - Migração de migrations

## 🔗 Guia Completo de Workflow

Para um guia completo que cobre **Edge Functions, Migrations e Configurações**, consulte:
- **`WORKFLOW_COMPLETO_DEVELOP_TO_MAIN.md`** - Guia completo e detalhado
- **`RESUMO_WORKFLOW_DEVELOP_TO_MAIN.md`** - Resumo executivo rápido
- **`CHECKLIST_MIGRACAO_DEVELOP_TO_MAIN.md`** - Checklist detalhado
- **`migrar_develop_to_main.ps1`** - Script interativo para migração

## 🎯 Próximos Passos

1. Execute `.\comparar_main_develop.ps1` para ver status atual
2. Identifique functions que precisam ser migradas
3. Use `.\deploy_functions_to_main.ps1` para migração seletiva
4. **OU use `.\migrar_develop_to_main.ps1` para migração interativa completa**
5. Monitore e valide após cada deploy

