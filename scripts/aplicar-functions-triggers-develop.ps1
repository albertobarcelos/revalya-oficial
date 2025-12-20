# =====================================================
# Script: Aplicar Functions, Triggers e Edge Functions
# Objetivo: Extrair da MAIN e aplicar na DEVELOP
# =====================================================

param(
    [string]$MAIN_PROJECT_ID = "wyehpiutzvwplllumgdk",
    [string]$DEV_PROJECT_ID = "sqkkktsstkcupldqtsgi"
)

# Cores para output
function Write-Step { param($msg) Write-Host "`n🔷 $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Yellow }

Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║  Aplicar Functions, Triggers e Edge Functions                ║
║  MAIN → DEVELOP                                              ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Verificar se Supabase CLI está instalado
Write-Step "Verificando Supabase CLI..."
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Error "Supabase CLI não encontrado. Instale: https://supabase.com/docs/guides/cli"
    exit 1
}
Write-Success "Supabase CLI encontrado"

# Verificar se está autenticado
Write-Step "Verificando autenticação..."
$authCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Não está autenticado no Supabase"
    Write-Info "Execute: supabase login"
    exit 1
}
Write-Success "Autenticado no Supabase"

# =====================================================
# PARTE 1: Extrair Functions e Triggers da MAIN
# =====================================================

Write-Step "PARTE 1: Extraindo Functions e Triggers da MAIN..."

$mainConnString = Read-Host "Digite a connection string da MAIN (postgresql://...)"

if ([string]::IsNullOrWhiteSpace($mainConnString)) {
    Write-Error "Connection string é obrigatória"
    exit 1
}

Write-Info "Gerando dump do schema da MAIN (apenas estrutura)..."
$tempDump = "temp_schema_main.sql"

# Fazer dump apenas do schema (sem dados)
supabase db dump --db-url $mainConnString -f $tempDump --schema-only 2>&1 | Out-Null

if (-not (Test-Path $tempDump)) {
    Write-Error "Erro ao gerar dump da MAIN"
    exit 1
}

Write-Success "Dump gerado: $tempDump"

# Extrair apenas functions e triggers
Write-Info "Extraindo functions e triggers do dump..."
$functionsFile = "functions_triggers_main.sql"

$content = Get-Content $tempDump -Raw -Encoding UTF8
$functionsTriggers = @()

# Regex para pegar CREATE FUNCTION (com ou sem OR REPLACE)
$functionPattern = "(?s)CREATE\s+(OR\s+REPLACE\s+)?FUNCTION.*?;\s*"
$functionMatches = [regex]::Matches($content, $functionPattern)
foreach ($match in $functionMatches) {
    $functionsTriggers += $match.Value.Trim()
}

# Regex para pegar CREATE TRIGGER
$triggerPattern = "(?s)CREATE\s+(OR\s+REPLACE\s+)?TRIGGER.*?;\s*"
$triggerMatches = [regex]::Matches($content, $triggerPattern)
foreach ($match in $triggerMatches) {
    $functionsTriggers += $match.Value.Trim()
}

# Salvar em arquivo
if ($functionsTriggers.Count -gt 0) {
    $functionsTriggers -join "`n`n" | Set-Content $functionsFile -Encoding UTF8
    Write-Success "Functions e triggers extraídos: $functionsFile ($($functionsTriggers.Count) objetos)"
} else {
    Write-Error "Nenhuma function ou trigger encontrada no dump"
    Remove-Item $tempDump -ErrorAction SilentlyContinue
    exit 1
}

# Limpar arquivo temporário
Remove-Item $tempDump -ErrorAction SilentlyContinue

# =====================================================
# PARTE 2: Aplicar na DEVELOP
# =====================================================

Write-Step "PARTE 2: Aplicando na DEVELOP..."

Write-Info "Linkando ao projeto DEVELOPMENT..."
supabase link --project-ref $DEV_PROJECT_ID 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Error "Erro ao linkar ao projeto DEVELOPMENT"
    exit 1
}
Write-Success "Linkado ao projeto DEVELOPMENT"

Write-Info "Solicitando connection string da DEVELOP..."
$devConnString = Read-Host "Digite a connection string da DEVELOP (postgresql://...)"

if ([string]::IsNullOrWhiteSpace($devConnString)) {
    Write-Error "Connection string da DEVELOP é obrigatória"
    exit 1
}

Write-Info "Aplicando functions e triggers via psql..."
$sqlContent = Get-Content $functionsFile -Raw -Encoding UTF8

# Aplicar via psql
$sqlContent | psql $devConnString 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Functions e triggers aplicadas com sucesso!"
} else {
    Write-Error "Erro ao aplicar functions e triggers"
    Write-Info "Verifique os erros acima e tente aplicar manualmente via SQL Editor"
    Write-Info "Arquivo gerado: $functionsFile"
}

# =====================================================
# PARTE 3: Deploy Edge Functions
# =====================================================

Write-Step "PARTE 3: Fazendo deploy das Edge Functions..."

Write-Info "Fazendo deploy de todas as Edge Functions..."
supabase functions deploy --project-ref $DEV_PROJECT_ID 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Edge Functions deployadas com sucesso!"
} else {
    Write-Error "Erro ao fazer deploy das Edge Functions"
    Write-Info "Verifique os erros acima"
}

# =====================================================
# RESUMO
# =====================================================

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ PROCESSO CONCLUÍDO                                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "Arquivo gerado: $functionsFile"
Write-Info "Dashboard Development: https://supabase.com/dashboard/project/$DEV_PROJECT_ID"
Write-Host ""
