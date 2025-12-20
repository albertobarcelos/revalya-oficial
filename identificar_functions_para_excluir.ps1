# Script para identificar Edge Functions que NÃO vieram do main

# Functions baixadas do main (30 functions)
$functionsFromMain = @(
    "send-invite-email",
    "invite-reseller-user",
    "validate-reseller-invite-token",
    "accept-reseller-invite",
    "jwt-custom-claims",
    "exchange-tenant-code",
    "refresh-tenant-token",
    "create-tenant-session-v2",
    "refresh-tenant-token-v2",
    "revoke-tenant-session",
    "create-tenant-session-v3",
    "refresh-tenant-token-v3",
    "asaas-proxy",
    "bulk-insert-helper",
    "fetch-asaas-customer",
    "asaas-webhook-charges",
    "send-bulk-messages",
    "recalc-billing-statuses",
    "daily-billing-status-update",
    "asaas-import-charges",
    "sync-charges-from-asaas-api",
    "asaas-import-all-charges",
    "assinafy-list-templates",
    "assinafy-delete-template",
    "assinafy-list-contacts",
    "assinafy-update-contact",
    "assinafy-delete-contact",
    "assinafy-list-signer-documents",
    "create-user-admin",
    "evolution-proxy"
)

# Diretórios que devem ser mantidos (não são functions)
$keepDirectories = @("_shared")

# Obter todas as functions locais
$localFunctions = Get-ChildItem -Path "supabase\functions" -Directory | Select-Object -ExpandProperty Name

# Identificar functions que NÃO vieram do main
$functionsToDelete = $localFunctions | Where-Object { 
    $_ -notin $functionsFromMain -and $_ -notin $keepDirectories 
}

Write-Host "==========================================="
Write-Host "ANALISE: Functions Locais vs Main"
Write-Host "==========================================="
Write-Host ""
Write-Host "Functions baixadas do main: $($functionsFromMain.Count)" -ForegroundColor Green
Write-Host "Functions locais encontradas: $($localFunctions.Count)" -ForegroundColor Cyan
Write-Host ""

if ($functionsToDelete.Count -gt 0) {
    Write-Host "==========================================="
    Write-Host "FUNCTIONS PARA EXCLUIR (nao estao no main):" -ForegroundColor Yellow
    Write-Host "==========================================="
    Write-Host ""
    
    foreach ($func in $functionsToDelete) {
        Write-Host "  - $func" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Total: $($functionsToDelete.Count) function(s) para excluir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "==========================================="
    Write-Host "FUNCTIONS QUE SERAO MANTIDAS:" -ForegroundColor Green
    Write-Host "==========================================="
    Write-Host ""
    
    foreach ($func in $functionsFromMain) {
        Write-Host "  + $func" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Diretorio _shared sera mantido" -ForegroundColor Cyan
} else {
    Write-Host "Todas as functions locais estao no main!" -ForegroundColor Green
    Write-Host "Nada para excluir." -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================="

