# =============================================================================
# Script: Copiar Supabase de Produção para Local
# =============================================================================
# 
# Este script automatiza o processo de copiar o banco de dados Supabase
# de produção para o ambiente local.
#
# Uso:
#   .\scripts\copiar-producao-local.ps1 -ProdPassword "sua_senha"
#
# =============================================================================

param(
    [Parameter(Mandatory=$true, HelpMessage="Senha do banco de produção")]
    [string]$ProdPassword,
    
    [Parameter(HelpMessage="Nome do arquivo de dump (opcional)")]
    [string]$DumpFile = "",
    
    [Parameter(HelpMessage="Apenas schema, sem dados")]
    [switch]$SchemaOnly,
    
    [Parameter(HelpMessage="Apenas dados, sem schema")]
    [switch]$DataOnly,
    
    [Parameter(HelpMessage="Pular restauração (apenas criar dump)")]
    [switch]$DumpOnly,
    
    [Parameter(HelpMessage="Verificar após restauração")]
    [switch]$Verify
)

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

$PROJECT_REF = "wyehpiutzvwplllumgdk"
$PROD_HOST = "aws-0-us-west-1.pooler.supabase.com"
$PROD_PORT = "6543"
$PROD_DB = "postgres"
$PROD_USER = "postgres.$PROJECT_REF"

$LOCAL_HOST = "localhost"
$LOCAL_PORT = "54322"
$LOCAL_DB = "postgres"
$LOCAL_USER = "postgres"
$LOCAL_PASSWORD = "postgres"

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

function Write-Step {
    param([string]$Message, [string]$Color = "Yellow")
    Write-Host "`n🔄 $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# =============================================================================
# VALIDAÇÕES INICIAIS
# =============================================================================

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Copiar Supabase de Produção para Local" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Verificar se pg_dump está instalado
if (-not (Test-Command "pg_dump")) {
    Write-Error "pg_dump não encontrado. Instale PostgreSQL primeiro."
    Write-Info "Windows: https://www.postgresql.org/download/windows/"
    Write-Info "Mac: brew install postgresql"
    Write-Info "Linux: sudo apt-get install postgresql-client"
    exit 1
}

# Verificar se psql está instalado
if (-not (Test-Command "psql")) {
    Write-Error "psql não encontrado. Instale PostgreSQL primeiro."
    exit 1
}

# Verificar se Supabase CLI está instalado
if (-not (Test-Command "supabase")) {
    Write-Error "Supabase CLI não encontrado."
    Write-Info "Instale: npm install -g supabase"
    exit 1
}

# =============================================================================
# CONFIGURAR CONNECTION STRINGS
# =============================================================================

$PROD_DB_URL = "postgresql://${PROD_USER}:${ProdPassword}@${PROD_HOST}:${PROD_PORT}/${PROD_DB}"
$LOCAL_DB_URL = "postgresql://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_DB}"

# Gerar nome do arquivo de dump se não fornecido
if ([string]::IsNullOrEmpty($DumpFile)) {
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $mode = if ($SchemaOnly) { "schema" } elseif ($DataOnly) { "data" } else { "full" }
    $DumpFile = "dump_producao_${mode}_${timestamp}.sql"
}

# =============================================================================
# PASSO 1: FAZER DUMP DO BANCO DE PRODUÇÃO
# =============================================================================

Write-Step "Fazendo dump do banco de produção..." "Yellow"

$dumpArgs = @(
    "`"$PROD_DB_URL`"",
    "--clean",
    "--if-exists",
    "--quote-all-identifiers",
    "--no-owner",
    "--no-privileges",
    "--verbose"
)

if ($SchemaOnly) {
    $dumpArgs += "--schema-only"
    Write-Info "Modo: Apenas schema (sem dados)"
} elseif ($DataOnly) {
    $dumpArgs += "--data-only"
    Write-Info "Modo: Apenas dados (sem schema)"
} else {
    Write-Info "Modo: Completo (schema + dados)"
}

Write-Info "Arquivo de destino: $DumpFile"

# Executar pg_dump
$dumpProcess = Start-Process -FilePath "pg_dump" -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $DumpFile -RedirectStandardError "dump_errors.log"

if ($dumpProcess.ExitCode -ne 0) {
    Write-Error "Erro ao criar dump. Verifique dump_errors.log"
    Get-Content "dump_errors.log" | Write-Host -ForegroundColor Red
    exit 1
}

$dumpSize = (Get-Item $DumpFile).Length / 1MB
Write-Success "Dump criado: $DumpFile ($([math]::Round($dumpSize, 2)) MB)"

# Se apenas dump foi solicitado, parar aqui
if ($DumpOnly) {
    Write-Success "Dump criado com sucesso. Use -DumpOnly:$false para restaurar também."
    exit 0
}

# =============================================================================
# PASSO 2: INICIAR SUPABASE LOCAL
# =============================================================================

Write-Step "Verificando Supabase local..." "Yellow"

# Verificar se Supabase está rodando
$supabaseStatus = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Info "Supabase local não está rodando. Iniciando..."
    supabase start
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Erro ao iniciar Supabase local"
        exit 1
    }
    Start-Sleep -Seconds 5  # Aguardar inicialização
} else {
    Write-Info "Supabase local já está rodando"
}

# =============================================================================
# PASSO 3: RESTAURAR NO BANCO LOCAL
# =============================================================================

Write-Step "Restaurando dump no banco local..." "Yellow"

# Testar conexão local primeiro
$testConnection = psql "$LOCAL_DB_URL" -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Não foi possível conectar ao banco local"
    Write-Info "Verifique se Supabase está rodando: supabase start"
    exit 1
}

# Restaurar dump
Write-Info "Isso pode demorar alguns minutos dependendo do tamanho do dump..."
$restoreProcess = Start-Process -FilePath "psql" -ArgumentList "-d", "`"$LOCAL_DB_URL`"", "-f", $DumpFile -NoNewWindow -Wait -PassThru -RedirectStandardError "restore_errors.log"

if ($restoreProcess.ExitCode -ne 0) {
    Write-Error "Erro ao restaurar dump. Verifique restore_errors.log"
    Get-Content "restore_errors.log" | Select-Object -Last 20 | Write-Host -ForegroundColor Red
    Write-Info "Alguns erros podem ser normais (ex: objetos já existentes)"
} else {
    Write-Success "Dump restaurado com sucesso!"
}

# =============================================================================
# PASSO 4: AJUSTAR PERMISSÕES
# =============================================================================

Write-Step "Ajustando permissões..." "Yellow"

$permissionsSQL = @"
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
"@

$permissionsSQL | psql "$LOCAL_DB_URL" 2>&1 | Out-Null
Write-Success "Permissões ajustadas"

# =============================================================================
# PASSO 5: VERIFICAÇÃO (OPCIONAL)
# =============================================================================

if ($Verify) {
    Write-Step "Verificando restauração..." "Yellow"
    
    $verificationSQL = @"
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 10;
"@
    
    Write-Info "Primeiras 10 tabelas:"
    $verificationSQL | psql "$LOCAL_DB_URL" -A -F " | " -t
    
    # Contar registros em algumas tabelas principais
    $mainTables = @("tenants", "charges", "users", "contracts")
    Write-Info "`nContagem de registros nas tabelas principais:"
    
    foreach ($table in $mainTables) {
        $countSQL = "SELECT COUNT(*) FROM public.$table;"
        $count = $countSQL | psql "$LOCAL_DB_URL" -t -A | ForEach-Object { $_.Trim() }
        if ($count -match '^\d+$') {
            Write-Host "  $table : $count registros" -ForegroundColor Cyan
        }
    }
}

# =============================================================================
# RESUMO FINAL
# =============================================================================

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Processo Concluído!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Info "Arquivo de dump: $DumpFile"
Write-Info "Banco local: $LOCAL_DB_URL"
Write-Info ""
Write-Info "Para conectar ao banco local:"
Write-Host "  psql `"$LOCAL_DB_URL`"" -ForegroundColor Cyan
Write-Info ""
Write-Info "Para limpar o dump após uso:"
Write-Host "  Remove-Item $DumpFile" -ForegroundColor Cyan
Write-Host ""
