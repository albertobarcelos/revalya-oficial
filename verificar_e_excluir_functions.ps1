# Script para verificar via MCP e excluir functions que nao estao no main

# Functions baixadas do main (confirmadas via MCP)
$functionsFromMain = @(
    "send-invite-email",
    "invite-reseller-invite-token",
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
    "evolution-proxy",
    "invite-reseller-user",
    "validate-reseller-invite-token"
)

# Diretorios que devem ser mantidos
$keepDirectories = @("_shared")

# Functions que serao verificadas e possivelmente excluidas
$functionsToCheck = @(
    "backup",
    "cleanup-expired-tokens",
    "cron-cleanup-scheduler",
    "digital-contracts",
    "financial-calculations",
    "financial-notifications",
    "financial-reports",
    "focusnfe",
    "messages",
    "monitor-constraint-violations",
    "send-welcome-email",
    "validate-tenant-token"
)

Write-Host "==========================================="
Write-Host "VERIFICACAO FINAL ANTES DE EXCLUIR"
Write-Host "==========================================="
Write-Host ""
Write-Host "Functions a verificar (nao estao na lista do main):" -ForegroundColor Yellow
Write-Host ""

foreach ($func in $functionsToCheck) {
    if ($func -in $functionsFromMain) {
        Write-Host "  + $func (ENCONTRADA NO MAIN - NAO EXCLUIR)" -ForegroundColor Green
    } else {
        Write-Host "  - $func (NAO encontrada no main - EXCLUIR)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================="
Write-Host "Aguardando confirmacao via MCP..." -ForegroundColor Cyan
Write-Host "==========================================="

