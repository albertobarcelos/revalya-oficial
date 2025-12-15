# =============================================================================
# Script: Executar Cópia de Produção para Local
# =============================================================================
# 
# Este script executa o processo completo de copiar o banco de produção
# para o ambiente local usando APENAS o Supabase CLI (sem precisar PostgreSQL!).
#
# ⚠️ ANTES DE EXECUTAR:
# 1. Instale Supabase CLI (veja docs/INSTALAR_FERRAMENTAS.md)
# 2. Faça login: supabase login
# 3. Link ao projeto: supabase link --project-ref wyehpiutzvwplllumgdk
#
# =============================================================================

param(
    [Parameter(HelpMessage="Fazer login no Supabase CLI (se ainda não fez)")]
    [switch]$Login,
    
    [Parameter(HelpMessage="Linkar ao projeto (se ainda não linkou)")]
    [switch]$Link
)

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

$PROJECT_REF = "wyehpiutzvwplllumgdk"
$LOCAL_DB_URL = "postgresql://postgres:postgres@localhost:54322/postgres"

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

function Write-Step {
    param([string]$Message, [string]$Color = "Yellow")
    Write-Host "`n[STEP] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERRO] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Variável global para o comando supabase
$script:SUPABASE_CMD = "supabase"

# Verificar se supabase está disponível, senão usar npx
if (-not (Test-Command "supabase")) {
    if (Test-Command "npx") {
        $script:SUPABASE_CMD = "npx supabase"
        Write-Host "[INFO] Usando npx supabase (Supabase CLI nao instalado globalmente)" -ForegroundColor Yellow
    } else {
        Write-Host "[ERRO] Supabase CLI nao encontrado e npx tambem nao esta disponivel!" -ForegroundColor Red
        exit 1
    }
}

# =============================================================================
# VALIDAÇÕES INICIAIS
# =============================================================================

Write-Host "`n" -NoNewline
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Copiar Supabase de Producao para Local" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Verificar Supabase CLI (já verificado acima na função)
Write-Success "Supabase CLI disponivel via $script:SUPABASE_CMD"

# =============================================================================
# PASSO 1: LOGIN E LINK (SE NECESSÁRIO)
# =============================================================================

if ($Login) {
    Write-Step "Fazendo login no Supabase CLI..." "Yellow"
    Invoke-Expression "$script:SUPABASE_CMD login"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Erro ao fazer login"
        exit 1
    }
    Write-Success "Login realizado com sucesso!"
}

if ($Link) {
    Write-Step "Linkando ao projeto de producao..." "Yellow"
    supabase link --project-ref $PROJECT_REF
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Erro ao linkar projeto"
        Write-Info "Certifique-se de estar logado: supabase login"
        exit 1
    }
    Write-Success "Projeto linkado com sucesso!"
}

# Verificar se esta linkado
Write-Step "Verificando configuracao do projeto..." "Yellow"
$linkCheck = Invoke-Expression "$script:SUPABASE_CMD projects list 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Info "Parece que voce precisa fazer login e linkar o projeto"
    Write-Info "Execute:"
    Write-Host "  $script:SUPABASE_CMD login" -ForegroundColor Yellow
    Write-Host "  $script:SUPABASE_CMD link --project-ref $PROJECT_REF" -ForegroundColor Yellow
    Write-Info "Ou execute este script com: -Login -Link"
    exit 1
}

# =============================================================================
# PASSO 2: VERIFICAR/INICIAR SUPABASE LOCAL
# =============================================================================

Write-Step "Verificando Supabase local..." "Yellow"

try {
    $status = Invoke-Expression "$script:SUPABASE_CMD status 2>&1" | Out-String
    if ($LASTEXITCODE -eq 0 -and $status -match "API URL") {
        Write-Info "Supabase local já está rodando"
    } else {
        throw "Não está rodando"
    }
} catch {
    Write-Info "Supabase local nao esta rodando. Iniciando..."
    Invoke-Expression "$script:SUPABASE_CMD start"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Erro ao iniciar Supabase local"
        Write-Info "Verifique se Docker está rodando"
        exit 1
    }
    Write-Info "Aguardando inicializacao (15 segundos)..."
    Start-Sleep -Seconds 15
}

Write-Success "Supabase local está pronto!"

# =============================================================================
# PASSO 3: FAZER DUMP DO BANCO DE PRODUÇÃO
# =============================================================================

Write-Step "Fazendo dump do banco de producao..." "Yellow"
Write-Info "Isso pode demorar alguns minutos dependendo do tamanho do banco..."

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$DUMP_FILE = "dump_producao_${timestamp}.sql"

Write-Info "Arquivo de destino: $DUMP_FILE"

# Fazer dump usando Supabase CLI (usa projeto linkado automaticamente)
Invoke-Expression "$script:SUPABASE_CMD db dump --linked -f $DUMP_FILE"

if ($LASTEXITCODE -eq 0) {
    if (Test-Path $DUMP_FILE) {
        $dumpSize = (Get-Item $DUMP_FILE).Length / 1MB
        Write-Success "Dump criado: $DUMP_FILE ($([math]::Round($dumpSize, 2)) MB)"
    } else {
        Write-Error "Dump não foi criado"
        exit 1
    }
} else {
    Write-Error "Erro ao criar dump!"
    Write-Info "Verifique:"
    Write-Info "  - Se está logado: supabase login"
    Write-Info "  - Se o projeto está linkado: supabase link"
    Write-Info "  - Se tem permissões no projeto"
    exit 1
}

# =============================================================================
# PASSO 4: RESTAURAR NO BANCO LOCAL
# =============================================================================

Write-Step "Restaurando dump no banco local..." "Yellow"
Write-Info "Isso pode demorar alguns minutos..."

# Verificar se psql está disponível (do Supabase local ou sistema)
$hasPsql = Test-Command "psql"

if (-not $hasPsql) {
    # Tentar usar o psql do container Docker do Supabase
    Write-Info "psql não encontrado no sistema. Usando do container Docker..."
    
    # Obter nome do container
    $containerName = docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1
    
    if ($containerName) {
        Write-Info "Usando container: $containerName"
        # Copiar arquivo para container e executar
        docker cp $DUMP_FILE "${containerName}:/tmp/dump.sql"
        docker exec $containerName psql -U postgres -d postgres -f /tmp/dump.sql 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dump restaurado com sucesso!"
        } else {
            Write-Info "AVISO: Alguns avisos podem ter aparecido, mas o restore pode ter funcionado."
        }
    } else {
        Write-Error "Não foi possível encontrar o container do banco local"
        Write-Info "Tente instalar PostgreSQL ou verifique se Supabase está rodando"
        exit 1
    }
} else {
    # Usar psql do sistema
    $restoreOutput = & psql -d "$LOCAL_DB_URL" -f $DUMP_FILE 2>&1
    
    # Verificar se houve erros críticos
    $hasErrors = $restoreOutput | Where-Object { $_ -match "ERROR|FATAL" }
    if ($hasErrors) {
        Write-Info "AVISO: Alguns erros apareceram durante o restore:"
        $hasErrors | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        Write-Info "Alguns avisos são normais (ex: 'already exists')"
    } else {
        Write-Success "Dump restaurado com sucesso!"
    }
}

# =============================================================================
# PASSO 5: AJUSTAR PERMISSÕES
# =============================================================================

Write-Step "Ajustando permissões..." "Yellow"

$permissionsSQL = @"
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
"@

if ($hasPsql) {
    $permissionsOutput = $permissionsSQL | & psql -d "$LOCAL_DB_URL" 2>&1
} else {
    $containerName = docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1
    $permissionsSQL | docker exec -i $containerName psql -U postgres -d postgres 2>&1 | Out-Null
}

if ($LASTEXITCODE -eq 0) {
    Write-Success "Permissões ajustadas!"
} else {
    Write-Info "AVISO: Alguns avisos ao ajustar permissoes (pode ser normal)"
}

# =============================================================================
# PASSO 6: VERIFICAÇÃO
# =============================================================================

Write-Step "Verificando restauracao..." "Yellow"

$tables = @("tenants", "charges", "users", "contracts", "payables")
$foundTables = 0

foreach ($table in $tables) {
    try {
        if ($hasPsql) {
            $count = & psql -d "$LOCAL_DB_URL" -t -A -c "SELECT COUNT(*) FROM public.$table;" 2>&1
        } else {
            $containerName = docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1
            $count = docker exec $containerName psql -U postgres -d postgres -t -A -c "SELECT COUNT(*) FROM public.$table;" 2>&1
        }
        
        if ($count -match '^\d+$') {
            $countValue = $count.Trim()
            Write-Host "  OK $table : $countValue registros" -ForegroundColor Cyan
            $foundTables++
        }
    } catch {
        Write-Host "  AVISO: $table : nao encontrada ou erro" -ForegroundColor Yellow
    }
}

if ($foundTables -gt 0) {
    Write-Success "Verificacao concluida! $foundTables tabelas verificadas."
} else {
    Write-Info "AVISO: Nao foi possivel verificar tabelas. O restore pode ter funcionado mesmo assim."
}

# =============================================================================
# RESUMO FINAL
# =============================================================================

Write-Host "`n" -NoNewline
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Processo Concluido!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Info "Arquivo de dump: $DUMP_FILE"
Write-Info "Banco local: $LOCAL_DB_URL"
Write-Info "Studio local: http://localhost:54323"
Write-Host ""
Write-Info "Para conectar ao banco local:"
if ($hasPsql) {
    Write-Host "  psql `"$LOCAL_DB_URL`"" -ForegroundColor Yellow
} else {
    Write-Host "  docker exec -it supabase_db_* psql -U postgres" -ForegroundColor Yellow
}
Write-Host ""
Write-Info "Para ver o status do Supabase:"
Write-Host "  $script:SUPABASE_CMD status" -ForegroundColor Yellow
Write-Host ""
