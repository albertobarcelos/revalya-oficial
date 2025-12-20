# Script Simplificado para Sincronizar Histórico da MAIN
# Uso: .\sincronizar_main_agora.ps1

$mainProjectId = "wyehpiutzvwplllumgdk"
$migrationsPath = "supabase\migrations"

Write-Host "==========================================="
Write-Host "SINCRONIZACAO DE HISTORICO - MAIN"
Write-Host "==========================================="
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Você está sincronizando o histórico da MAIN (PRODUÇÃO)" -ForegroundColor Yellow
Write-Host ""

# Verificar se Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

# Listar migrations no GitHub
Write-Host "==========================================="
Write-Host "MIGRATIONS ENCONTRADAS NO GITHUB"
Write-Host "==========================================="
Write-Host ""

$githubMigrations = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { 
        ($_.Name -match '^\d{14}_' -or $_.Name -match '^\d{8}_') -and
        $_.Name -ne "schema.sql" -and 
        $_.Name -ne "data.sql" -and 
        $_.Name -ne "roles.sql"
    } | 
    Select-Object @{
        Name="Version"; 
        Expression={ 
            # Extrair versão do nome do arquivo
            # Formato 1: YYYYMMDDHHMMSS_nome.sql (14 dígitos)
            if ($_.Name -match '^(\d{14})_') {
                $matches[1]
            }
            # Formato 2: YYYYMMDD_nome.sql (8 dígitos) - usar como está, SEM adicionar zeros
            elseif ($_.Name -match '^(\d{8})_') {
                $matches[1]
            } else {
                $null
            }
        }
    }, @{
        Name="Name"; 
        Expression={ $_.Name }
    } | 
    Sort-Object Version

Write-Host "Total de migrations encontradas: $($githubMigrations.Count)" -ForegroundColor Cyan
Write-Host ""
foreach ($mig in $githubMigrations) {
    if ($mig.Version) {
        Write-Host "  - $($mig.Version): $($mig.Name)" -ForegroundColor White
    }
}

Write-Host ""

# Confirmar
Write-Host "==========================================="
Write-Host "CONFIRMACAO"
Write-Host "==========================================="
Write-Host ""
Write-Host "Essas migrations serão marcadas como APLICADAS no histórico do Supabase." -ForegroundColor Yellow
Write-Host "O banco não será modificado, apenas o histórico será atualizado." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Certifique-se de que:" -ForegroundColor Yellow
Write-Host "  1. O banco MAIN está correto" -ForegroundColor White
Write-Host "  2. Todas essas migrations já estão aplicadas no banco" -ForegroundColor White
Write-Host "  3. Você tem acesso ao projeto MAIN" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Digite 'SIM' para continuar"

if ($confirm -ne "SIM" -and $confirm -ne "sim") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

# Conectar ao projeto
Write-Host ""
Write-Host "==========================================="
Write-Host "CONECTANDO AO PROJETO"
Write-Host "==========================================="
Write-Host ""

Write-Host "Conectando ao projeto MAIN ($mainProjectId)..." -ForegroundColor Cyan

# Verificar se já está logado
Write-Host "Verificando autenticação..." -ForegroundColor Cyan
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não está autenticado. Fazendo login..." -ForegroundColor Yellow
    Write-Host "Por favor, siga as instruções para fazer login no navegador." -ForegroundColor Yellow
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao fazer login" -ForegroundColor Red
        exit 1
    }
}

$linkResult = supabase link --project-ref $mainProjectId 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao conectar ao projeto" -ForegroundColor Red
    Write-Host "Detalhes: $linkResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente fazer login novamente:" -ForegroundColor Yellow
    Write-Host "  supabase login" -ForegroundColor White
    exit 1
}

Write-Host "✅ Conectado ao projeto MAIN!" -ForegroundColor Green
Write-Host ""

# Marcar migrations como aplicadas
Write-Host "==========================================="
Write-Host "MARCANDO MIGRATIONS COMO APLICADAS"
Write-Host "==========================================="
Write-Host ""

$successCount = 0
$errorCount = 0
$skippedCount = 0

foreach ($mig in $githubMigrations) {
    if (-not $mig.Version) {
        Write-Host "  ⚠️  Pulando: $($mig.Name) (versão não detectada)" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    Write-Host "  Marcando $($mig.Version)..." -ForegroundColor Cyan
    
    $repairResult = supabase migration repair --status applied $mig.Version 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ $($mig.Version) marcada como aplicada" -ForegroundColor Green
        $successCount++
    } else {
        # Pode ser que já esteja marcada, não é necessariamente um erro
        if ($repairResult -match "already" -or $repairResult -match "not found") {
            Write-Host "    ⚠️  $($mig.Version) (já estava marcada ou não encontrada)" -ForegroundColor Yellow
            $skippedCount++
        } else {
            Write-Host "    ❌ $($mig.Version) - Erro: $repairResult" -ForegroundColor Red
            $errorCount++
        }
    }
}

Write-Host ""
Write-Host "==========================================="
Write-Host "RESUMO"
Write-Host "==========================================="
Write-Host ""
Write-Host "Migrations processadas: $($githubMigrations.Count)" -ForegroundColor Cyan
Write-Host "  ✅ Marcadas com sucesso: $successCount" -ForegroundColor Green
Write-Host "  ⚠️  Já marcadas/puladas: $skippedCount" -ForegroundColor Yellow
if ($errorCount -gt 0) {
    Write-Host "  ❌ Erros: $errorCount" -ForegroundColor Red
}
Write-Host ""

# Verificar resultado
Write-Host "==========================================="
Write-Host "VERIFICACAO"
Write-Host "==========================================="
Write-Host ""
Write-Host "Para verificar se funcionou, execute:" -ForegroundColor Cyan
Write-Host ""
Write-Host "SQL Query no Supabase Dashboard:" -ForegroundColor White
Write-Host "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor Gray
Write-Host ""
Write-Host "OU via CLI:" -ForegroundColor White
Write-Host "supabase migration list" -ForegroundColor Gray
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "✅ Sincronização concluída com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Cyan
    Write-Host "1. Configurar integração nativa no Dashboard" -ForegroundColor White
    Write-Host "2. Testar criando uma nova migration" -ForegroundColor White
    Write-Host "3. Fazer merge para main e verificar que aplica automaticamente" -ForegroundColor White
} else {
    Write-Host "⚠️  Sincronização concluída com alguns erros." -ForegroundColor Yellow
    Write-Host "Verifique os erros acima e corrija se necessário." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================="

