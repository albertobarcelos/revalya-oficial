# Script para Renomear Migrations com Conflito de Versão
# Uso: .\renomear_migrations_conflito.ps1

$migrationsPath = "supabase\migrations"

Write-Host "==========================================="
Write-Host "RENOMEAR MIGRATIONS COM CONFLITO DE VERSAO"
Write-Host "==========================================="
Write-Host ""

# Migrations que precisam ser renomeadas
$migrationsToRename = @(
    @{
        OldName = "20251213_120001_add_api_key_encryption.sql"
        NewName = "20251213120001_add_api_key_encryption.sql"
        Version = "20251213120001"
    },
    @{
        OldName = "20251213_120002_update_functions_to_use_vault.sql"
        NewName = "20251213120002_update_functions_to_use_vault.sql"
        Version = "20251213120002"
    }
)

Write-Host "Migrations que serão renomeadas:" -ForegroundColor Cyan
Write-Host ""
foreach ($mig in $migrationsToRename) {
    $oldPath = Join-Path $migrationsPath $mig.OldName
    $newPath = Join-Path $migrationsPath $mig.NewName
    
    if (Test-Path $oldPath) {
        Write-Host "  ✅ $($mig.OldName)" -ForegroundColor White
        Write-Host "     → $($mig.NewName)" -ForegroundColor Green
        Write-Host "     Versão: $($mig.Version)" -ForegroundColor Cyan
    } else {
        Write-Host "  ❌ $($mig.OldName) (não encontrado)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "==========================================="
Write-Host "CONFIRMACAO"
Write-Host "==========================================="
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Isso irá renomear arquivos de migration!" -ForegroundColor Yellow
Write-Host "Certifique-se de que:" -ForegroundColor Yellow
Write-Host "  1. Você fez backup ou commit das mudanças" -ForegroundColor White
Write-Host "  2. Ninguém está trabalhando nessas migrations" -ForegroundColor White
Write-Host "  3. Você atualizará o histórico do banco após renomear" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Digite 'SIM' para continuar"

if ($confirm -ne "SIM" -and $confirm -ne "sim") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "==========================================="
Write-Host "RENOMEANDO ARQUIVOS"
Write-Host "==========================================="
Write-Host ""

$renamedCount = 0
$errorCount = 0

foreach ($mig in $migrationsToRename) {
    $oldPath = Join-Path $migrationsPath $mig.OldName
    $newPath = Join-Path $migrationsPath $mig.NewName
    
    if (-not (Test-Path $oldPath)) {
        Write-Host "  ⚠️  Arquivo não encontrado: $($mig.OldName)" -ForegroundColor Yellow
        $errorCount++
        continue
    }
    
    if (Test-Path $newPath) {
        Write-Host "  ⚠️  Arquivo destino já existe: $($mig.NewName)" -ForegroundColor Yellow
        Write-Host "     Pulando renomeação..." -ForegroundColor Yellow
        continue
    }
    
    Write-Host "  Renomeando: $($mig.OldName)" -ForegroundColor Cyan
    Write-Host "    → $($mig.NewName)" -ForegroundColor Green
    
    try {
        Rename-Item -Path $oldPath -NewName $mig.NewName
        Write-Host "    ✅ Renomeado com sucesso!" -ForegroundColor Green
        $renamedCount++
    } catch {
        Write-Host "    ❌ Erro ao renomear: $_" -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

Write-Host "==========================================="
Write-Host "RESUMO"
Write-Host "==========================================="
Write-Host ""
Write-Host "Arquivos renomeados: $renamedCount/$($migrationsToRename.Count)" -ForegroundColor $(if ($renamedCount -eq $migrationsToRename.Count) { "Green" } else { "Yellow" })

if ($errorCount -gt 0) {
    Write-Host "Erros: $errorCount" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================="
Write-Host "PROXIMOS PASSOS"
Write-Host "==========================================="
Write-Host ""
Write-Host "1. Commit das mudanças:" -ForegroundColor Cyan
Write-Host "   git add supabase/migrations/" -ForegroundColor White
Write-Host "   git commit -m 'fix: renomear migrations para evitar conflito de versão'" -ForegroundColor White
Write-Host "   git push origin develop" -ForegroundColor White
Write-Host ""
Write-Host "2. Sincronizar histórico da develop:" -ForegroundColor Cyan
Write-Host "   .\sincronizar_historico_migrations.ps1 -ProjectRef 'ivaeoagtrvjsksebnqwr' -ProjectName 'develop'" -ForegroundColor White
Write-Host ""
Write-Host "3. OU adicionar diretamente via SQL na develop:" -ForegroundColor Cyan
Write-Host "   INSERT INTO supabase_migrations.schema_migrations (version, name)" -ForegroundColor White
Write-Host "   VALUES ('20251213120001', '120001_add_api_key_encryption')," -ForegroundColor White
Write-Host "          ('20251213120002', '120002_update_functions_to_use_vault')" -ForegroundColor White
Write-Host "   ON CONFLICT (version) DO NOTHING;" -ForegroundColor White
Write-Host ""
Write-Host "==========================================="

