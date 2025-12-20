# Script Corrigido para Sincronizar Histórico da MAIN
# Uso: .\sincronizar_main_corrigido.ps1

$mainProjectId = "wyehpiutzvwplllumgdk"
$migrationsPath = "supabase\migrations"

Write-Host "==========================================="
Write-Host "SINCRONIZACAO DE HISTORICO - MAIN (CORRIGIDO)"
Write-Host "==========================================="
Write-Host ""

# Verificar se Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    exit 1
}

# Listar migrations e extrair versões corretas
Write-Host "==========================================="
Write-Host "MIGRATIONS ENCONTRADAS NO GITHUB"
Write-Host "==========================================="
Write-Host ""

# Mapeamento manual das migrations com suas versões corretas
$migrationsMap = @(
    @{Version="20240101000000"; File="20240101000000_initial_schema.sql"},
    @{Version="20250127"; File="20250127_simplify_avatar_system.sql"},
    @{Version="20251125"; File="20251125_120000_add_bank_history_balance_adjust_triggers.sql"},
    @{Version="20251126"; File="20251126_120000_add_payables_triggers_bank_history.sql"},
    @{Version="20251127"; File="20251127_120000_create_bank_operation_history.sql"},
    @{Version="20251128"; File="20251128_120000_create_get_bank_statement_rpc.sql"},
    @{Version="20251212"; File="20251212_120000_allow_public_read_tenant_invites_by_token.sql"},
    @{Version="20251213"; File="20251213_120000_remove_tenant_invites_updated_at_trigger.sql"},
    @{Version="20251213120001"; File="20251213_120001_add_api_key_encryption.sql"},
    @{Version="20251213120002"; File="20251213_120002_update_functions_to_use_vault.sql"},
    @{Version="20251214"; File="20251214_120000_add_focusnfe_integration.sql"},
    @{Version="20251215161709"; File="20251215161709_update_default_templates_tags.sql"},
    @{Version="20251220111401"; File="20251220111401_functions_triggers_policies.sql"}
)

Write-Host "Total de migrations: $($migrationsMap.Count)" -ForegroundColor Cyan
Write-Host ""
foreach ($mig in $migrationsMap) {
    $filePath = Join-Path $migrationsPath $mig.File
    if (Test-Path $filePath) {
        Write-Host "  ✅ $($mig.Version): $($mig.File)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($mig.Version): $($mig.File) (arquivo não encontrado)" -ForegroundColor Red
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
$confirm = Read-Host "Digite 'SIM' para continuar"

if ($confirm -ne "SIM" -and $confirm -ne "sim") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

# Verificar autenticação
Write-Host ""
Write-Host "==========================================="
Write-Host "VERIFICANDO AUTENTICACAO"
Write-Host "==========================================="
Write-Host ""

Write-Host "Verificando se está autenticado..." -ForegroundColor Cyan
$projectsCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não está autenticado. Fazendo login..." -ForegroundColor Yellow
    Write-Host "Por favor, siga as instruções no navegador." -ForegroundColor Yellow
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao fazer login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "✅ Já está autenticado!" -ForegroundColor Green
}

Write-Host ""

# Conectar ao projeto
Write-Host "==========================================="
Write-Host "CONECTANDO AO PROJETO"
Write-Host "==========================================="
Write-Host ""

Write-Host "Conectando ao projeto MAIN ($mainProjectId)..." -ForegroundColor Cyan
$linkResult = supabase link --project-ref $mainProjectId 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao conectar ao projeto" -ForegroundColor Red
    Write-Host "Detalhes: $linkResult" -ForegroundColor Red
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

foreach ($mig in $migrationsMap) {
    $filePath = Join-Path $migrationsPath $mig.File
    if (-not (Test-Path $filePath)) {
        Write-Host "  ⚠️  Pulando: $($mig.File) (arquivo não encontrado)" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    Write-Host "  Marcando $($mig.Version)..." -ForegroundColor Cyan
    
    # Usar --debug para ver mais detalhes se necessário
    $repairResult = supabase migration repair --status applied $mig.Version 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ $($mig.Version) marcada como aplicada" -ForegroundColor Green
        $successCount++
    } else {
        # Verificar tipo de erro
        $errorMsg = $repairResult -join " "
        if ($errorMsg -match "already" -or $errorMsg -match "not found" -or $errorMsg -match "does not exist") {
            Write-Host "    ⚠️  $($mig.Version) (já estava marcada ou não encontrada)" -ForegroundColor Yellow
            $skippedCount++
        } elseif ($errorMsg -match "SASL" -or $errorMsg -match "auth" -or $errorMsg -match "connection") {
            Write-Host "    ❌ $($mig.Version) - Erro de autenticação/conexão" -ForegroundColor Red
            Write-Host "       Tente fazer login novamente: supabase login" -ForegroundColor Yellow
            $errorCount++
        } else {
            Write-Host "    ❌ $($mig.Version) - Erro: $errorMsg" -ForegroundColor Red
            $errorCount++
        }
    }
}

Write-Host ""
Write-Host "==========================================="
Write-Host "RESUMO"
Write-Host "==========================================="
Write-Host ""
Write-Host "Migrations processadas: $($migrationsMap.Count)" -ForegroundColor Cyan
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
Write-Host "Para verificar se funcionou, execute no Supabase Dashboard:" -ForegroundColor Cyan
Write-Host ""
Write-Host "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor Gray
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
    Write-Host ""
    Write-Host "Se houver erros de autenticação:" -ForegroundColor Yellow
    Write-Host "1. Execute: supabase login" -ForegroundColor White
    Write-Host "2. Execute este script novamente" -ForegroundColor White
}

Write-Host ""
Write-Host "==========================================="

