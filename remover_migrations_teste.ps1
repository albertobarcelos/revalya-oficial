# Script PowerShell para remover migrations de teste antes de merge para main
# Execute: .\remover_migrations_teste.ps1

Write-Host "🔍 Verificando migrations de teste..." -ForegroundColor Cyan

# Verificar se estamos na branch develop
$currentBranch = git branch --show-current
if ($currentBranch -ne "develop") {
    Write-Host "⚠️  ATENÇÃO: Você não está na branch develop!" -ForegroundColor Yellow
    Write-Host "   Branch atual: $currentBranch" -ForegroundColor Yellow
    $continue = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# Migrations de teste para remover
$migrationsToRemove = @(
    "supabase/migrations/20251220202812_test_fluxo_develop_main.sql",
    "supabase/migrations/20251220224743_rollback_test_fluxo_develop_main.sql"
)

# Migration duplicada (opcional)
$migrationDuplicate = "supabase/migrations/20251221024436_create_invites_table.sql"

Write-Host ""
Write-Host "📋 Migrations que serão removidas:" -ForegroundColor Cyan
foreach ($migration in $migrationsToRemove) {
    if (Test-Path $migration) {
        Write-Host "  ❌ $migration" -ForegroundColor Red
    } else {
        Write-Host "  ⚠️  $migration (não encontrada)" -ForegroundColor Yellow
    }
}

Write-Host ""
$confirm = Read-Host "Deseja remover as migrations de teste? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "❌ Operação cancelada." -ForegroundColor Red
    exit 0
}

# Remover migrations de teste
Write-Host ""
Write-Host "🗑️  Removendo migrations de teste..." -ForegroundColor Cyan
foreach ($migration in $migrationsToRemove) {
    if (Test-Path $migration) {
        git rm $migration
        Write-Host "  ✅ Removida: $migration" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Não encontrada: $migration" -ForegroundColor Yellow
    }
}

# Perguntar sobre migration duplicada
Write-Host ""
$removeDuplicate = Read-Host "Deseja remover a migration duplicada (20251221024436_create_invites_table.sql)? (s/N)"
if ($removeDuplicate -eq "s" -or $removeDuplicate -eq "S") {
    if (Test-Path $migrationDuplicate) {
        git rm $migrationDuplicate
        Write-Host "  ✅ Removida: $migrationDuplicate" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Não encontrada: $migrationDuplicate" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Migrations removidas do Git com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  ATENÇÃO IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   As migrations ainda estão no histórico do banco de dados!" -ForegroundColor Yellow
Write-Host "   Você precisa removê-las manualmente via SQL." -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. COMMIT E PUSH:" -ForegroundColor White
Write-Host "      git commit -m 'chore: remover migrations de teste antes de merge para main'"
Write-Host "      git push origin develop"
Write-Host ""
Write-Host "   2. REMOVER DO HISTÓRICO DO BANCO (DEVELOP):" -ForegroundColor White
Write-Host "      - Abra o SQL Editor do Supabase (projeto develop)"
Write-Host "      - Execute o script: remover_migrations_do_historico.sql"
Write-Host ""
Write-Host "   3. FAZER MERGE PARA MAIN:" -ForegroundColor White
Write-Host "      git checkout main"
Write-Host "      git merge develop"
Write-Host "      git push origin main"
Write-Host ""
Write-Host "   4. REMOVER DO HISTÓRICO DO BANCO (MAIN):" -ForegroundColor White
Write-Host "      - Abra o SQL Editor do Supabase (projeto main)"
Write-Host "      - Execute o script: remover_migrations_do_historico.sql"
Write-Host ""
Write-Host "   📄 Script SQL disponível em: remover_migrations_do_historico.sql" -ForegroundColor Cyan
Write-Host ""

