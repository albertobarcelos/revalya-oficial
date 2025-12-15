# =============================================================================
# Script: Restaurar Dump usando Docker Diretamente
# =============================================================================
# 
# Este script restaura o dump do banco de produção usando Docker diretamente,
# contornando o problema do Storage no Supabase CLI.
#
# =============================================================================

param(
    [Parameter(HelpMessage="Caminho do arquivo de dump")]
    [string]$DumpFile = "dump_producao.sql"
)

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Restaurar Dump no Banco Local (via Docker)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Verificar se o arquivo existe
if (-not (Test-Path $DumpFile)) {
    Write-Host "[ERRO] Arquivo de dump nao encontrado: $DumpFile" -ForegroundColor Red
    exit 1
}

$dumpSize = (Get-Item $DumpFile).Length / 1MB
Write-Host "[INFO] Arquivo de dump: $DumpFile ($([math]::Round($dumpSize, 2)) MB)" -ForegroundColor Cyan

# Verificar se Docker está rodando
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Docker nao esta rodando!" -ForegroundColor Red
    exit 1
}

# Nome do container PostgreSQL do Supabase
$containerName = "supabase_db_wyehpiutzvwplllumgdk"

# Verificar se o container existe
$containerExists = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
if (-not $containerExists) {
    Write-Host "[INFO] Container do banco nao encontrado. Tentando iniciar Supabase..." -ForegroundColor Yellow
    
    # Tentar iniciar apenas o banco
    npx supabase start --ignore-health-check 2>&1 | Out-Null
    
    # Aguardar um pouco
    Start-Sleep -Seconds 5
    
    # Verificar novamente
    $containerExists = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
    if (-not $containerExists) {
        Write-Host "[ERRO] Nao foi possivel iniciar o container do banco." -ForegroundColor Red
        Write-Host "[INFO] Tente iniciar manualmente: npx supabase start" -ForegroundColor Yellow
        exit 1
    }
}

# Verificar se o container está rodando
$containerRunning = docker ps --filter "name=$containerName" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "[INFO] Container parado. Iniciando..." -ForegroundColor Yellow
    docker start $containerName
    Start-Sleep -Seconds 3
}

Write-Host "[INFO] Container: $containerName" -ForegroundColor Cyan

# Copiar dump para o container
Write-Host "`n[STEP] Copiando dump para o container..." -ForegroundColor Yellow
docker cp $DumpFile "${containerName}:/tmp/dump.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Erro ao copiar arquivo para o container" -ForegroundColor Red
    exit 1
}

# Restaurar dump
Write-Host "[STEP] Restaurando dump no banco..." -ForegroundColor Yellow
Write-Host "[INFO] Isso pode demorar alguns minutos..." -ForegroundColor Cyan

docker exec $containerName psql -U postgres -d postgres -f /tmp/dump.sql 2>&1 | Tee-Object -Variable restoreOutput

# Verificar se houve erros críticos
$hasErrors = $restoreOutput | Where-Object { $_ -match "ERROR|FATAL" }
if ($hasErrors) {
    Write-Host "`n[AVISO] Alguns erros apareceram durante o restore:" -ForegroundColor Yellow
    $hasErrors | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host "[INFO] Alguns avisos sao normais (ex: 'already exists')" -ForegroundColor Cyan
} else {
    Write-Host "`n[OK] Dump restaurado com sucesso!" -ForegroundColor Green
}

# Ajustar permissões
Write-Host "`n[STEP] Ajustando permissoes..." -ForegroundColor Yellow

$permissionsSQL = @"
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
"@

$permissionsSQL | docker exec -i $containerName psql -U postgres -d postgres 2>&1 | Out-Null

Write-Host "[OK] Permissoes ajustadas!" -ForegroundColor Green

# Verificação
Write-Host "`n[STEP] Verificando restauracao..." -ForegroundColor Yellow

$tables = @("tenants", "charges", "users", "contracts", "payables")
$foundTables = 0

foreach ($table in $tables) {
    $count = docker exec $containerName psql -U postgres -d postgres -t -A -c "SELECT COUNT(*) FROM public.$table;" 2>&1
    if ($count -match '^\d+$') {
        $countValue = $count.Trim()
        Write-Host "  OK $table : $countValue registros" -ForegroundColor Cyan
        $foundTables++
    }
}

if ($foundTables -gt 0) {
    Write-Host "`n[OK] Verificacao concluida! $foundTables tabelas verificadas." -ForegroundColor Green
} else {
    Write-Host "`n[AVISO] Nao foi possivel verificar tabelas. O restore pode ter funcionado mesmo assim." -ForegroundColor Yellow
}

# Resumo
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Processo Concluido!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Banco local disponivel em:" -ForegroundColor Cyan
Write-Host "  postgresql://postgres:postgres@localhost:54322/postgres" -ForegroundColor Yellow
Write-Host ""
Write-Host "[INFO] Para conectar:" -ForegroundColor Cyan
Write-Host "  docker exec -it $containerName psql -U postgres" -ForegroundColor Yellow
Write-Host ""
