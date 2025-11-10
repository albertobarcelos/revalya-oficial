$tenantId = "8d2888f1-64a5-445f-84f5-2614d5160251"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY"
$url = "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/sync-charges-from-staging/$tenantId"
$body = @{
    dryRun = $true
    batchSize = 50
} | ConvertTo-Json

Write-Host "🔄 Iniciando teste em modo dry-run..." -ForegroundColor Cyan
Write-Host "📋 Tenant ID: $tenantId" -ForegroundColor Gray
Write-Host "🔗 URL: $url" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json"
    } -Body $body

    Write-Host "✅ Teste concluído com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Resumo:" -ForegroundColor Cyan
    Write-Host "   Total de movimentações: $($response.summary.total)" -ForegroundColor White
    Write-Host "   Processadas: $($response.summary.processed)" -ForegroundColor White
    Write-Host "   Seriam atualizadas: $($response.summary.updated)" -ForegroundColor Yellow
    Write-Host "   Seriam ignoradas: $($response.summary.skipped)" -ForegroundColor Gray
    Write-Host "   Erros: $($response.summary.errors)" -ForegroundColor $(if ($response.summary.errors -gt 0) { "Red" } else { "Green" })
    Write-Host ""

    if ($response.details -and $response.details.Count -gt 0) {
        Write-Host "📝 Detalhes (primeiros 5 itens):" -ForegroundColor Cyan
        $response.details[0..4] | ForEach-Object {
            Write-Host ""
            Write-Host "   Movimentação: $($_.movement_id)" -ForegroundColor White
            Write-Host "   Charge ID: $($_.charge_id)" -ForegroundColor Gray
            Write-Host "   ID Externo: $($_.id_externo)" -ForegroundColor Gray
            if ($_.update_data) {
                Write-Host "   Status: $($_.update_data.status)" -ForegroundColor Yellow
                Write-Host "   Payment Value: $($_.update_data.payment_value)" -ForegroundColor Yellow
            }
            if ($_.reason) {
                Write-Host "   Motivo: $($_.reason)" -ForegroundColor Gray
            }
        }
    }

    Write-Host ""
    Write-Host "🧪 Modo DRY-RUN: Nenhum dado foi alterado" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao executar teste:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}


