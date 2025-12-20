# =============================================================================
# Script: Iniciar PostgreSQL Simples (sem Supabase completo)
# =============================================================================
# 
# Este script inicia apenas o PostgreSQL usando a imagem do Supabase,
# contornando o problema do Storage.
#
# =============================================================================

$containerName = "revalya_postgres_local"
$port = "54322"
$dbName = "postgres"
$user = "postgres"
$password = "postgres"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Iniciar PostgreSQL Local (Simples)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Verificar se o container já existe
$existing = docker ps -a --filter "name=$containerName" --format "{{.Names}}"
if ($existing) {
    Write-Host "[INFO] Container ja existe: $containerName" -ForegroundColor Cyan
    
    # Verificar se está rodando
    $running = docker ps --filter "name=$containerName" --format "{{.Names}}"
    if ($running) {
        Write-Host "[OK] Container ja esta rodando!" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Iniciando container..." -ForegroundColor Yellow
        docker start $containerName
        Start-Sleep -Seconds 3
        Write-Host "[OK] Container iniciado!" -ForegroundColor Green
    }
} else {
    Write-Host "[STEP] Criando container PostgreSQL..." -ForegroundColor Yellow
    
    # Usar a imagem do Supabase PostgreSQL
    docker run -d `
        --name $containerName `
        -e POSTGRES_PASSWORD=$password `
        -e POSTGRES_DB=$dbName `
        -p "${port}:5432" `
        public.ecr.aws/supabase/postgres:15.8.1.121
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Container criado!" -ForegroundColor Green
        Write-Host "[INFO] Aguardando inicializacao (10 segundos)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10
    } else {
        Write-Host "[ERRO] Erro ao criar container" -ForegroundColor Red
        exit 1
    }
}

# Verificar conexão
Write-Host "[STEP] Verificando conexao..." -ForegroundColor Yellow
$test = docker exec $containerName psql -U $user -d $dbName -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] PostgreSQL esta funcionando!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Connection string:" -ForegroundColor Cyan
    Write-Host "  postgresql://${user}:${password}@localhost:${port}/${dbName}" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[INFO] Para conectar:" -ForegroundColor Cyan
    Write-Host "  docker exec -it $containerName psql -U $user" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[ERRO] Nao foi possivel conectar ao banco" -ForegroundColor Red
    exit 1
}
