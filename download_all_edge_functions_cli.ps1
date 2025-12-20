# Script PowerShell para baixar TODAS as Edge Functions do Main
# Usa Supabase CLI: supabase functions download

param(
    [string]$ProjectRef = "wyehpiutzvwplllumgdk"
)

Write-Host "==========================================="
Write-Host "Download de Edge Functions do Main"
Write-Host "==========================================="
Write-Host ""

# Verificar se Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Supabase CLI nao encontrado!" -ForegroundColor Red
    Write-Host "Instale: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

# Conectar ao projeto main
Write-Host "Conectando ao projeto main: $ProjectRef" -ForegroundColor Cyan
supabase link --project-ref $ProjectRef

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao conectar ao projeto" -ForegroundColor Red
    exit 1
}

# Lista de todas as Edge Functions
$functions = @(
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

$total = $functions.Count
$current = 0
$success = 0
$failed = @()

Write-Host "Total de functions: $total"
Write-Host ""

foreach ($func in $functions) {
    $current++
    Write-Host "[$current/$total] Baixando: $func" -ForegroundColor Cyan
    
    supabase functions download $func --project-ref $ProjectRef
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK $func baixada com sucesso" -ForegroundColor Green
        $success++
    } else {
        Write-Host "ERRO $func falhou" -ForegroundColor Red
        $failed += $func
    }
    
    Write-Host ""
}

Write-Host "==========================================="
if ($success -eq $total) {
    Write-Host "Download concluido: $success/$total" -ForegroundColor Green
} else {
    Write-Host "Download concluido: $success/$total" -ForegroundColor Yellow
}
Write-Host "==========================================="

if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "Functions que falharam:" -ForegroundColor Red
    foreach ($func in $failed) {
        Write-Host "  - $func" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Baixe manualmente via Dashboard:" -ForegroundColor Yellow
    $dashboardUrl = "https://supabase.com/dashboard/project/$ProjectRef/functions"
    Write-Host $dashboardUrl -ForegroundColor Cyan
}
