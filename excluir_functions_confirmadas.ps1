# Script para excluir functions confirmadas que nao estao no main

# Functions confirmadas via MCP que NAO estao no main
$functionsToDelete = @(
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
Write-Host "EXCLUINDO FUNCTIONS CONFIRMADAS"
Write-Host "==========================================="
Write-Host ""
Write-Host "Verificacao via MCP: CONFIRMADO" -ForegroundColor Green
Write-Host "Total de functions a excluir: $($functionsToDelete.Count)" -ForegroundColor Yellow
Write-Host ""

$deletedCount = 0
$errorCount = 0

foreach ($func in $functionsToDelete) {
    $functionPath = "supabase\functions\$func"
    
    if (Test-Path $functionPath) {
        try {
            Remove-Item -Path $functionPath -Recurse -Force
            Write-Host "  [OK] Excluida: $func" -ForegroundColor Green
            $deletedCount++
        } catch {
            Write-Host "  [ERRO] Falha ao excluir: $func - $_" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "  [AVISO] Nao encontrada: $func (ja foi excluida?)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==========================================="
Write-Host "RESUMO DA EXCLUSAO"
Write-Host "==========================================="
Write-Host "Excluidas com sucesso: $deletedCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Erros: $errorCount" -ForegroundColor Red
}
Write-Host ""

# Verificar functions restantes
$remainingFunctions = Get-ChildItem -Path "supabase\functions" -Directory | Select-Object -ExpandProperty Name
Write-Host "Functions restantes: $($remainingFunctions.Count)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Lista de functions mantidas:" -ForegroundColor Cyan
foreach ($func in ($remainingFunctions | Sort-Object)) {
    Write-Host "  + $func" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================="

