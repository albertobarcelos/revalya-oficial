# Script para criar estrutura de replicação do Main

$replicationFolder = "replicacao-main-completa"
$mainProjectId = "wyehpiutzvwplllumgdk"

Write-Host "==========================================="
Write-Host "CRIANDO ESTRUTURA DE REPLICACAO DO MAIN"
Write-Host "==========================================="
Write-Host ""

# Criar estrutura de pastas
$folders = @(
    "$replicationFolder",
    "$replicationFolder\migrations",
    "$replicationFolder\functions",
    "$replicationFolder\scripts"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "[OK] Criada pasta: $folder" -ForegroundColor Green
    }
}

Write-Host ""

# Copiar migrations do main (apenas as 4 que estão no main)
$mainMigrations = @(
    "20240101000000_initial_schema.sql",
    "20250127_simplify_avatar_system.sql",
    "20251125_120000_add_bank_history_balance_adjust_triggers.sql",
    "20251126_120000_add_payables_triggers_bank_history.sql"
)

Write-Host "Copiando migrations do main..." -ForegroundColor Cyan
foreach ($migration in $mainMigrations) {
    $source = "supabase\migrations\$migration"
    $dest = "$replicationFolder\migrations\$migration"
    
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Force
        Write-Host "  [OK] $migration" -ForegroundColor Green
    } else {
        Write-Host "  [AVISO] Migration nao encontrada: $migration" -ForegroundColor Yellow
    }
}

Write-Host ""

# Copiar Edge Functions
Write-Host "Copiando Edge Functions..." -ForegroundColor Cyan
$functions = Get-ChildItem -Path "supabase\functions" -Directory | 
    Where-Object { $_.Name -ne "_shared" } | 
    Select-Object -ExpandProperty Name

foreach ($func in $functions) {
    $source = "supabase\functions\$func"
    $dest = "$replicationFolder\functions\$func"
    
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Recurse -Force
        Write-Host "  [OK] $func" -ForegroundColor Green
    }
}

# Copiar _shared também
if (Test-Path "supabase\functions\_shared") {
    Copy-Item -Path "supabase\functions\_shared" -Destination "$replicationFolder\functions\_shared" -Recurse -Force
    Write-Host "  [OK] _shared" -ForegroundColor Green
}

Write-Host ""

# Criar script de setup
$setupScript = @"
# Script de Setup para Replicar Main do Zero
# Projeto: Revalya
# Main Project ID: $mainProjectId

Write-Host "==========================================="
Write-Host "SETUP: REPLICACAO DO MAIN"
Write-Host "==========================================="
Write-Host ""

# 1. Fazer login no Supabase CLI
Write-Host "1. Fazendo login no Supabase CLI..." -ForegroundColor Cyan
supabase login

# 2. Linkar ao projeto main
Write-Host ""
Write-Host "2. Linkando ao projeto main..." -ForegroundColor Cyan
supabase link --project-ref $mainProjectId

# 3. Aplicar migrations
Write-Host ""
Write-Host "3. Aplicando migrations..." -ForegroundColor Cyan
Get-ChildItem -Path "migrations" -Filter "*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "  Aplicando: `$(`$_.Name)" -ForegroundColor Yellow
    supabase db push --file "migrations/`$(`$_.Name)"
}

# 4. Deploy Edge Functions
Write-Host ""
Write-Host "4. Fazendo deploy das Edge Functions..." -ForegroundColor Cyan
Get-ChildItem -Path "functions" -Directory | Where-Object { `$_.Name -ne "_shared" } | ForEach-Object {
    Write-Host "  Deploy: `$(`$_.Name)" -ForegroundColor Yellow
    supabase functions deploy `$(`$_.Name) --project-ref $mainProjectId
}

Write-Host ""
Write-Host "==========================================="
Write-Host "SETUP CONCLUIDO!"
Write-Host "==========================================="
"@

$setupScript | Out-File -FilePath "$replicationFolder\scripts\setup_replicacao.ps1" -Encoding UTF8
Write-Host "[OK] Script de setup criado" -ForegroundColor Green

# Criar README
$readme = @"
# Replicação Completa do Main - Revalya

Este diretório contém todos os arquivos necessários para criar uma branch 100% idêntica ao **main** (produção) do zero.

## 📋 Conteúdo

### Migrations
- `migrations/` - Contém todas as 4 migrations do main:
  - `20240101000000_initial_schema.sql`
  - `20250127_simplify_avatar_system.sql`
  - `20251125_120000_add_bank_history_balance_adjust_triggers.sql`
  - `20251126_120000_add_payables_triggers_bank_history.sql`

### Edge Functions
- `functions/` - Contém todas as 30 Edge Functions do main:
  - Todas as functions estão na versão mais recente do main
  - Inclui o diretório `_shared/` com arquivos compartilhados

### Scripts
- `scripts/setup_replicacao.ps1` - Script automatizado para aplicar tudo

## 🚀 Como Usar

### Opção 1: Script Automatizado (Recomendado)

```powershell
cd replicacao-main-completa
.\scripts\setup_replicacao.ps1
```

### Opção 2: Manual

#### 1. Fazer Login
```powershell
supabase login
```

#### 2. Linkar ao Projeto Main
```powershell
supabase link --project-ref $mainProjectId
```

#### 3. Aplicar Migrations
```powershell
# Aplicar cada migration na ordem
supabase db push --file migrations/20240101000000_initial_schema.sql
supabase db push --file migrations/20250127_simplify_avatar_system.sql
supabase db push --file migrations/20251125_120000_add_bank_history_balance_adjust_triggers.sql
supabase db push --file migrations/20251126_120000_add_payables_triggers_bank_history.sql
```

#### 4. Deploy Edge Functions
```powershell
# Deploy de todas as functions
Get-ChildItem -Path functions -Directory | Where-Object { `$_.Name -ne "_shared" } | ForEach-Object {
    supabase functions deploy `$(`$_.Name) --project-ref $mainProjectId
}
```

## 📊 Informações do Main

- **Project ID:** $mainProjectId
- **Migrations:** 4
- **Edge Functions:** 30
- **Status:** Produção

## ⚠️ Importante

- Este conjunto de arquivos representa o estado **exato** do main
- Use apenas para criar novas branches ou ambientes de desenvolvimento
- Não modifique os arquivos desta pasta - eles são o backup de referência

## 🔄 Atualização

Para atualizar esta estrutura quando o main mudar:

1. Execute o script `comparar_main_develop.ps1` na raiz do projeto
2. Se houver mudanças, execute `criar_estrutura_replicacao_main.ps1` novamente
3. Isso recriará a estrutura com as versões mais recentes

## 📝 Notas

- As Edge Functions estão na versão mais recente do main
- As migrations são apenas as que estão aplicadas no main
- O diretório `_shared/` contém arquivos compartilhados entre functions
"@

$readme | Out-File -FilePath "$replicationFolder\README.md" -Encoding UTF8
Write-Host "[OK] README criado" -ForegroundColor Green

# Criar arquivo de informações
$info = @"
{
  "main_project_id": "$mainProjectId",
  "created_at": "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  "migrations_count": $($mainMigrations.Count),
  "functions_count": $($functions.Count),
  "migrations": [
$(($mainMigrations | ForEach-Object { "    `"$_`"" }) -join ",\n")
  ],
  "functions": [
$(($functions | Sort-Object | ForEach-Object { "    `"$_`"" }) -join ",\n")
  ]
}
"@

$info | Out-File -FilePath "$replicationFolder\info.json" -Encoding UTF8
Write-Host "[OK] Arquivo info.json criado" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================="
Write-Host "ESTRUTURA CRIADA COM SUCESSO!"
Write-Host "==========================================="
Write-Host ""
Write-Host "Localizacao: $replicationFolder" -ForegroundColor Cyan
Write-Host "Migrations: $($mainMigrations.Count)" -ForegroundColor Green
Write-Host "Functions: $($functions.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "Para usar, execute:" -ForegroundColor Yellow
Write-Host "  cd $replicationFolder" -ForegroundColor White
Write-Host "  .\scripts\setup_replicacao.ps1" -ForegroundColor White
Write-Host ""
Write-Host "==========================================="

