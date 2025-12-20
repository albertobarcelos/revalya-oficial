# 📚 Explicação: Workflow Deploy Supabase

## 🎯 O Que a Action Faz

O workflow **"Deploy Supabase - Development"** automatiza o deploy de migrations e Edge Functions para o ambiente de desenvolvimento do Supabase.

## 🔄 Fluxo Completo

### 1. **Trigger (Quando é Acionado)**

- **Automático**: Quando há push na branch `develop` com mudanças em `supabase/**`
- **Manual**: Via botão "Run workflow" no GitHub Actions

### 2. **Checkout do Código**

- Baixa o código da branch `develop`
- Prepara o ambiente para executar os comandos

### 3. **Configuração do Supabase CLI**

- Instala a versão mais recente do Supabase CLI
- Autentica usando o token de acesso
- Linka ao projeto Development (Project ID: `sqkkktsstkcupldqtsgi`)

### 4. **Detecção de Mudanças**

#### Migrations:
- **Execução Manual**: Sempre verifica migrations pendentes
- **Push Automático**: Detecta apenas migrations que mudaram entre commits
- Define `has_migrations=true` se houver migrations para aplicar

#### Edge Functions:
- **Execução Manual**: Sempre verifica Edge Functions
- **Push Automático**: Detecta apenas functions que mudaram entre commits
- Define `has_functions=true` se houver functions para deployar

### 5. **Reparar Histórico de Migrations**

**Problema resolvido**: Migrations antigas no banco que não estão no repositório.

**Solução**:
```bash
supabase migration repair --status reverted [lista de migrations antigas]
```

- Marca migrations antigas como "reverted" no histórico
- Permite aplicar novas migrations sem conflito
- Migrations reparadas: `20240101000000`, `20250127`, `20251125`, etc.

### 6. **Marcar Migrations Grandes como Aplicadas**

**Problema resolvido**: Migrations grandes tentando criar objetos que já existem.

**Solução**:
```bash
supabase migration repair --status applied 20251218191500 20251219185127
```

- Marca migrations grandes como já aplicadas no histórico
- Evita tentar criar objetos que já existem (tabelas, tipos, etc.)
- Migrations marcadas: `20251218191500_schema_from_production.sql` e `20251219185127_000_all_objects.sql`

### 7. **Aplicar Migrations Pendentes**

```bash
supabase db push --include-all --yes
```

- Aplica apenas migrations que ainda não foram aplicadas
- `--include-all`: Inclui migrations não rastreadas no histórico
- `--yes`: Aceita automaticamente (não pede confirmação)
- Exemplo: Aplica `20251220000730_remove_coluna_teste_branch_agente_ia_empresa.sql`

### 8. **Deploy de Edge Functions**

```bash
supabase functions deploy
```

- Faz deploy de Edge Functions que mudaram
- Ou faz deploy de todas as functions (se migrations foram aplicadas)

### 9. **Resumo do Deploy**

- Gera um resumo no GitHub Actions
- Mostra quais migrations foram aplicadas
- Mostra quais Edge Functions foram deployadas
- Link para o dashboard do Supabase

## 🔧 Correções Aplicadas

### Problema 1: Migrations Antigas no Banco
- **Erro**: "Remote migration versions not found in local migrations directory"
- **Solução**: Repair de migrations antigas como "reverted"

### Problema 2: Objetos Já Existem
- **Erro**: "type 'bank_operation_type' already exists"
- **Solução**: Marcar migrations grandes como já aplicadas

### Problema 3: Flag --project-ref
- **Erro**: "unknown flag: --project-ref"
- **Solução**: Remover flag após `supabase link` (projeto já está linkado)

### Problema 4: Confirmação Manual
- **Problema**: Workflow pedia confirmação manual
- **Solução**: Adicionar flag `--yes` para aceitar automaticamente

## 📊 Exemplo de Execução

### Cenário: Nova Migration

1. Você cria: `20251220000730_remove_coluna_teste_branch_agente_ia_empresa.sql`
2. Faz commit e push na `develop`
3. Workflow detecta mudança em `supabase/migrations/`
4. Workflow repara histórico (migrations antigas)
5. Workflow marca migrations grandes como aplicadas
6. Workflow aplica apenas a nova migration
7. ✅ Coluna removida do banco de desenvolvimento

### Cenário: Execução Manual

1. Você clica em "Run workflow" no GitHub Actions
2. Seleciona branch `develop`
3. Workflow sempre verifica migrations pendentes
4. Aplica todas as migrations que ainda não foram aplicadas
5. Faz deploy de todas as Edge Functions

## ⚠️ Importante

- **Development**: Ambiente de teste, pode aplicar migrations automaticamente
- **Production**: Requer aprovação manual (environment protection)
- **Migrations grandes**: Já estão marcadas como aplicadas para evitar erros
- **Histórico**: É reparado automaticamente para manter sincronização

## 🔗 Links Úteis

- Dashboard Development: `https://supabase.com/dashboard/project/sqkkktsstkcupldqtsgi`
- Supabase CLI Docs: https://supabase.com/docs/reference/cli
- GitHub Actions: https://github.com/albertobarcelos/revalya-oficial/actions

