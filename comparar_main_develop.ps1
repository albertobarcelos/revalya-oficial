# Script para comparar Main vs Develop e identificar inconsistências

$mainProjectId = "wyehpiutzvwplllumgdk"
$developProjectId = "ivaeoagtrvjsksebnqwr"

Write-Host "==========================================="
Write-Host "COMPARACAO: MAIN vs DEVELOP"
Write-Host "==========================================="
Write-Host ""
Write-Host "Main Project ID: $mainProjectId" -ForegroundColor Cyan
Write-Host "Develop Project ID: $developProjectId" -ForegroundColor Cyan
Write-Host ""

# Dados já coletados via MCP
$mainFunctions = @(
    @{slug="send-invite-email"; version=36; verify_jwt=$true},
    @{slug="invite-reseller-user"; version=26; verify_jwt=$true},
    @{slug="validate-reseller-invite-token"; version=26; verify_jwt=$true},
    @{slug="accept-reseller-invite"; version=26; verify_jwt=$true},
    @{slug="jwt-custom-claims"; version=26; verify_jwt=$true},
    @{slug="exchange-tenant-code"; version=28; verify_jwt=$true},
    @{slug="refresh-tenant-token"; version=26; verify_jwt=$true},
    @{slug="create-tenant-session-v2"; version=26; verify_jwt=$true},
    @{slug="refresh-tenant-token-v2"; version=26; verify_jwt=$true},
    @{slug="revoke-tenant-session"; version=26; verify_jwt=$true},
    @{slug="create-tenant-session-v3"; version=29; verify_jwt=$true},
    @{slug="refresh-tenant-token-v3"; version=26; verify_jwt=$true},
    @{slug="asaas-proxy"; version=31; verify_jwt=$false},
    @{slug="bulk-insert-helper"; version=32; verify_jwt=$true},
    @{slug="fetch-asaas-customer"; version=27; verify_jwt=$true},
    @{slug="asaas-webhook-charges"; version=62; verify_jwt=$false},
    @{slug="send-bulk-messages"; version=61; verify_jwt=$true},
    @{slug="recalc-billing-statuses"; version=11; verify_jwt=$true},
    @{slug="daily-billing-status-update"; version=13; verify_jwt=$true},
    @{slug="asaas-import-charges"; version=52; verify_jwt=$false},
    @{slug="sync-charges-from-asaas-api"; version=22; verify_jwt=$true},
    @{slug="asaas-import-all-charges"; version=12; verify_jwt=$true},
    @{slug="assinafy-list-templates"; version=12; verify_jwt=$true},
    @{slug="assinafy-delete-template"; version=5; verify_jwt=$true},
    @{slug="assinafy-list-contacts"; version=7; verify_jwt=$true},
    @{slug="assinafy-update-contact"; version=5; verify_jwt=$true},
    @{slug="assinafy-delete-contact"; version=5; verify_jwt=$true},
    @{slug="assinafy-list-signer-documents"; version=5; verify_jwt=$true},
    @{slug="create-user-admin"; version=5; verify_jwt=$true},
    @{slug="evolution-proxy"; version=6; verify_jwt=$false}
)

$developFunctions = @(
    @{slug="accept-reseller-invite"; version=1; verify_jwt=$true},
    @{slug="asaas-import-all-charges"; version=1; verify_jwt=$true},
    @{slug="asaas-import-charges"; version=1; verify_jwt=$true},
    @{slug="asaas-proxy"; version=1; verify_jwt=$false},
    @{slug="asaas-webhook-charges"; version=1; verify_jwt=$false},
    @{slug="assinafy-delete-contact"; version=1; verify_jwt=$true},
    @{slug="assinafy-delete-template"; version=1; verify_jwt=$true},
    @{slug="assinafy-list-contacts"; version=1; verify_jwt=$true},
    @{slug="assinafy-list-signer-documents"; version=1; verify_jwt=$true},
    @{slug="assinafy-list-templates"; version=1; verify_jwt=$true},
    @{slug="assinafy-update-contact"; version=1; verify_jwt=$true},
    @{slug="bulk-insert-helper"; version=1; verify_jwt=$true},
    @{slug="create-tenant-session-v2"; version=1; verify_jwt=$true},
    @{slug="create-tenant-session-v3"; version=1; verify_jwt=$true},
    @{slug="create-user-admin"; version=1; verify_jwt=$true},
    @{slug="daily-billing-status-update"; version=1; verify_jwt=$true},
    @{slug="evolution-proxy"; version=1; verify_jwt=$true},
    @{slug="exchange-tenant-code"; version=1; verify_jwt=$true},
    @{slug="fetch-asaas-customer"; version=1; verify_jwt=$true},
    @{slug="invite-reseller-user"; version=1; verify_jwt=$true},
    @{slug="jwt-custom-claims"; version=1; verify_jwt=$true},
    @{slug="recalc-billing-statuses"; version=1; verify_jwt=$true},
    @{slug="refresh-tenant-token"; version=1; verify_jwt=$true},
    @{slug="refresh-tenant-token-v2"; version=1; verify_jwt=$true},
    @{slug="refresh-tenant-token-v3"; version=1; verify_jwt=$true},
    @{slug="revoke-tenant-session"; version=1; verify_jwt=$true},
    @{slug="send-bulk-messages"; version=1; verify_jwt=$true},
    @{slug="send-invite-email"; version=1; verify_jwt=$true},
    @{slug="sync-charges-from-asaas-api"; version=1; verify_jwt=$true},
    @{slug="validate-reseller-invite-token"; version=1; verify_jwt=$true}
)

$mainMigrations = @(
    @{version="20240101000000"; name="initial_schema"},
    @{version="20250127"; name="simplify_avatar_system"},
    @{version="20251125"; name="120000_add_bank_history_balance_adjust_triggers"},
    @{version="20251126"; name="120000_add_payables_triggers_bank_history"}
)

$developMigrations = @(
    @{version="20240101000000"; name="initial_schema"},
    @{version="20250127"; name="simplify_avatar_system"},
    @{version="20251125"; name="120000_add_bank_history_balance_adjust_triggers"},
    @{version="20251126"; name="120000_add_payables_triggers_bank_history"},
    @{version="20251127"; name="120000_create_bank_operation_history"},
    @{version="20251128"; name="120000_create_get_bank_statement_rpc"},
    @{version="20251212"; name="120000_allow_public_read_tenant_invites_by_token"},
    @{version="20251213"; name="120000_remove_tenant_invites_updated_at_trigger"},
    @{version="20251215161709"; name="update_default_templates_tags"}
)

# Comparar Edge Functions
Write-Host "==========================================="
Write-Host "EDGE FUNCTIONS - COMPARACAO"
Write-Host "==========================================="
Write-Host ""
Write-Host "Main: $($mainFunctions.Count) functions" -ForegroundColor Cyan
Write-Host "Develop: $($developFunctions.Count) functions" -ForegroundColor Cyan
Write-Host ""

# Criar dicionários para comparação
$mainFuncDict = @{}
$developFuncDict = @{}

foreach ($func in $mainFunctions) {
    $mainFuncDict[$func.slug] = $func
}

foreach ($func in $developFunctions) {
    $developFuncDict[$func.slug] = $func
}

# Verificar versões diferentes
Write-Host "FUNCTIONS COM VERSOES DIFERENTES:" -ForegroundColor Yellow
Write-Host ""
$versionDifferences = @()

foreach ($slug in $mainFuncDict.Keys) {
    if ($developFuncDict.ContainsKey($slug)) {
        $mainVer = $mainFuncDict[$slug].version
        $devVer = $developFuncDict[$slug].version
        
        if ($mainVer -ne $devVer) {
            Write-Host "  - $slug" -ForegroundColor Red
            Write-Host "    Main: v$mainVer | Develop: v$devVer" -ForegroundColor Yellow
            $versionDifferences += $slug
        }
    }
}

if ($versionDifferences.Count -eq 0) {
    Write-Host "  Nenhuma diferenca de versao encontrada." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Total: $($versionDifferences.Count) functions com versoes diferentes" -ForegroundColor Yellow
}

Write-Host ""

# Verificar verify_jwt diferentes
Write-Host "FUNCTIONS COM verify_jwt DIFERENTE:" -ForegroundColor Yellow
Write-Host ""
$jwtDifferences = @()

foreach ($slug in $mainFuncDict.Keys) {
    if ($developFuncDict.ContainsKey($slug)) {
        $mainJwt = $mainFuncDict[$slug].verify_jwt
        $devJwt = $developFuncDict[$slug].verify_jwt
        
        if ($mainJwt -ne $devJwt) {
            Write-Host "  - $slug" -ForegroundColor Red
            Write-Host "    Main: verify_jwt=$mainJwt | Develop: verify_jwt=$devJwt" -ForegroundColor Yellow
            $jwtDifferences += $slug
        }
    }
}

if ($jwtDifferences.Count -eq 0) {
    Write-Host "  Nenhuma diferenca de verify_jwt encontrada." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Total: $($jwtDifferences.Count) functions com verify_jwt diferente" -ForegroundColor Yellow
}

Write-Host ""

# Comparar Migrations
Write-Host "==========================================="
Write-Host "MIGRATIONS - COMPARACAO"
Write-Host "==========================================="
Write-Host ""
Write-Host "Main: $($mainMigrations.Count) migrations" -ForegroundColor Cyan
Write-Host "Develop: $($developMigrations.Count) migrations" -ForegroundColor Cyan
Write-Host ""

# Migrations que estão no develop mas não no main
$developOnlyMigrations = $developMigrations | Where-Object { 
    $migration = $_
    -not ($mainMigrations | Where-Object { $_.version -eq $migration.version })
}

if ($developOnlyMigrations.Count -gt 0) {
    Write-Host "MIGRATIONS APENAS NO DEVELOP (nao estao no main):" -ForegroundColor Yellow
    Write-Host ""
    foreach ($mig in $developOnlyMigrations) {
        Write-Host "  - $($mig.version): $($mig.name)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Total: $($developOnlyMigrations.Count) migrations extras no develop" -ForegroundColor Yellow
} else {
    Write-Host "Todas as migrations do develop estao no main." -ForegroundColor Green
}

Write-Host ""

# Resumo
Write-Host "==========================================="
Write-Host "RESUMO DE INCONSISTENCIAS"
Write-Host "==========================================="
Write-Host ""
Write-Host "Edge Functions:" -ForegroundColor Cyan
Write-Host "  - Versoes diferentes: $($versionDifferences.Count)" -ForegroundColor $(if ($versionDifferences.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host "  - verify_jwt diferentes: $($jwtDifferences.Count)" -ForegroundColor $(if ($jwtDifferences.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Migrations:" -ForegroundColor Cyan
Write-Host "  - Migrations extras no develop: $($developOnlyMigrations.Count)" -ForegroundColor $(if ($developOnlyMigrations.Count -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($versionDifferences.Count -eq 0 -and $jwtDifferences.Count -eq 0 -and $developOnlyMigrations.Count -eq 0) {
    Write-Host "Nenhuma inconsistencia encontrada!" -ForegroundColor Green
} else {
    Write-Host "Inconsistencias encontradas. Verifique os detalhes acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================="

