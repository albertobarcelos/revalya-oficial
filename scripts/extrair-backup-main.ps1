# =====================================================
# Script: Extrair Backup Completo da MAIN
# =====================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString
)

Write-Host "`n[INFO] Extraindo backup da MAIN..." -ForegroundColor Cyan

# Renomear .env temporariamente para evitar erro de parsing
$envBackup = $false
if (Test-Path .env) {
    Write-Host "[INFO] Renomeando .env temporariamente..." -ForegroundColor Yellow
    Rename-Item .env .env.backup -ErrorAction SilentlyContinue
    $envBackup = $true
}

# Função para executar com retry
function Invoke-DumpWithRetry {
    param(
        [string]$Command,
        [string]$Description,
        [int]$MaxRetries = 3
    )
    
    $retry = 0
    while ($retry -lt $MaxRetries) {
        Write-Host "[Tentativa $($retry + 1)/$MaxRetries] $Description..." -ForegroundColor Yellow
        $result = Invoke-Expression $Command 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Host "[OK] $Description concluido!" -ForegroundColor Green
            return $true
        } else {
            $retry++
            if ($retry -lt $MaxRetries) {
                Write-Host "[ERRO] Falha na tentativa $retry. Aguardando 5 segundos..." -ForegroundColor Red
                Start-Sleep -Seconds 5
            } else {
                Write-Host "[ERRO] Falhou apos $MaxRetries tentativas" -ForegroundColor Red
                Write-Host $result
                return $false
            }
        }
    }
}

# 1. Extrair Roles
if (-not (Invoke-DumpWithRetry "supabase db dump --db-url `"$ConnectionString`" -f roles.sql --role-only" "Extraindo roles")) {
    Write-Host "[AVISO] Falha ao extrair roles, continuando..." -ForegroundColor Yellow
}

# 2. Extrair Schema (estrutura: tabelas, functions, triggers, etc)
if (-not (Invoke-DumpWithRetry "supabase db dump --db-url `"$ConnectionString`" -f schema.sql" "Extraindo schema")) {
    Write-Host "[ERRO] Falha ao extrair schema. Tente novamente mais tarde." -ForegroundColor Red
    exit 1
}

# 3. Extrair Dados
if (-not (Invoke-DumpWithRetry "supabase db dump --db-url `"$ConnectionString`" -f data.sql --use-copy --data-only" "Extraindo dados")) {
    Write-Host "[AVISO] Falha ao extrair dados, mas schema foi extraido." -ForegroundColor Yellow
}

# Restaurar .env se foi renomeado
if ($envBackup) {
    Write-Host "[INFO] Restaurando .env..." -ForegroundColor Yellow
    Rename-Item .env.backup .env -ErrorAction SilentlyContinue
}

Write-Host "`n[OK] Backup extraido!" -ForegroundColor Green
if (Test-Path roles.sql) { Write-Host "   - roles.sql" -ForegroundColor Gray }
if (Test-Path schema.sql) { Write-Host "   - schema.sql" -ForegroundColor Gray }
if (Test-Path data.sql) { Write-Host "   - data.sql" -ForegroundColor Gray }
Write-Host ""

