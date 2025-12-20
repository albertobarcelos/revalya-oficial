# ReplicaÃ§Ã£o Completa do Main - Revalya

Este diretÃ³rio contÃ©m todos os arquivos necessÃ¡rios para criar uma branch 100% idÃªntica ao **main** (produÃ§Ã£o) do zero.

## ðŸ“‹ ConteÃºdo

### Migrations
- migrations/ - ContÃ©m todas as 4 migrations do main:
  - 20240101000000_initial_schema.sql
  - 20250127_simplify_avatar_system.sql
  - 20251125_120000_add_bank_history_balance_adjust_triggers.sql
  - 20251126_120000_add_payables_triggers_bank_history.sql

### Edge Functions
- unctions/ - ContÃ©m todas as 30 Edge Functions do main:
  - Todas as functions estÃ£o na versÃ£o mais recente do main
  - Inclui o diretÃ³rio _shared/ com arquivos compartilhados

### Scripts
- scripts/setup_replicacao.ps1 - Script automatizado para aplicar tudo

## ðŸš€ Como Usar

### OpÃ§Ã£o 1: Script Automatizado (Recomendado)

`powershell
cd replicacao-main-completa
.\scripts\setup_replicacao.ps1
`

### OpÃ§Ã£o 2: Manual

#### 1. Fazer Login
`powershell
supabase login
`

#### 2. Linkar ao Projeto Main
`powershell
supabase link --project-ref wyehpiutzvwplllumgdk
`

#### 3. Aplicar Migrations
`powershell
# Aplicar cada migration na ordem
supabase db push --file migrations/20240101000000_initial_schema.sql
supabase db push --file migrations/20250127_simplify_avatar_system.sql
supabase db push --file migrations/20251125_120000_add_bank_history_balance_adjust_triggers.sql
supabase db push --file migrations/20251126_120000_add_payables_triggers_bank_history.sql
`

#### 4. Deploy Edge Functions
`powershell
# Deploy de todas as functions
Get-ChildItem -Path functions -Directory | Where-Object { $_.Name -ne "_shared" } | ForEach-Object {
    supabase functions deploy $($_.Name) --project-ref wyehpiutzvwplllumgdk
}
`

## ðŸ“Š InformaÃ§Ãµes do Main

- **Project ID:** wyehpiutzvwplllumgdk
- **Migrations:** 4
- **Edge Functions:** 30
- **Status:** ProduÃ§Ã£o

## âš ï¸ Importante

- Este conjunto de arquivos representa o estado **exato** do main
- Use apenas para criar novas branches ou ambientes de desenvolvimento
- NÃ£o modifique os arquivos desta pasta - eles sÃ£o o backup de referÃªncia

## ðŸ”„ AtualizaÃ§Ã£o

Para atualizar esta estrutura quando o main mudar:

1. Execute o script comparar_main_develop.ps1 na raiz do projeto
2. Se houver mudanÃ§as, execute criar_estrutura_replicacao_main.ps1 novamente
3. Isso recriarÃ¡ a estrutura com as versÃµes mais recentes

## ðŸ“ Notas

- As Edge Functions estÃ£o na versÃ£o mais recente do main
- As migrations sÃ£o apenas as que estÃ£o aplicadas no main
- O diretÃ³rio _shared/ contÃ©m arquivos compartilhados entre functions
