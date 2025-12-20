# Script PowerShell para testar sincronização em dry-run
# Uso: .\test-sync-dry-run.ps1

$tenantId = "8d2888f1-64a5-445f-84f5-2614d5160251"
$supabaseUrl = "https://wyehpiutzvwplllumgdk.supabase.co"
$functionName = "sync-charges-from-staging"

# AIDEV-NOTE: Obter anon key do ambiente ou pedir ao usuário
$anonKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $anonKey) {
    Write-Host "❌ VITE_SUPABASE_ANON_KEY não encontrada no ambiente" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, configure a variável de ambiente:" -ForegroundColor Yellow
    Write-Host '  $env:VITE_SUPABASE_ANON_KEY="sua_chave_aqui"' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou forneça a chave agora:" -ForegroundColor Yellow
    $anonKey = Read-Host "Digite a SUPABASE_ANON_KEY"
}

if (-not $anonKey) {
    Write-Host "❌ Chave não fornecida. Abortando." -ForegroundColor Red
    exit 1
}

$url = "$supabaseUrl/functions/v1/$functionName/$tenantId"

Write-Host "🔄 Iniciando teste em modo dry-run..." -ForegroundColor Cyan
Write-Host "📋 Tenant ID: $tenantId" -ForegroundColor Gray
Write-Host "🔗 URL: $url" -ForegroundColor Gray
Write-Host ""

$body = @{
    dryRun = $true
    batchSize = 50
} | ConvertTo-Json

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
        Write-Host "📝 Detalhes (primeiros 10 itens):" -ForegroundColor Cyan
        $response.details[0..9] | ForEach-Object -Begin { $i = 1 } -Process {
            Write-Host ""
            Write-Host "   $i. Movimentação: $($_.movement_id)" -ForegroundColor White
            Write-Host "      Charge ID: $($_.charge_id)" -ForegroundColor Gray
            Write-Host "      ID Externo: $($_.id_externo)" -ForegroundColor Gray
            if ($_.update_data) {
                Write-Host "      Status: $($_.update_data.status)" -ForegroundColor Yellow
                Write-Host "      Payment Value: $($_.update_data.payment_value)" -ForegroundColor Yellow
            }
            if ($_.reason) {
                Write-Host "      Motivo: $($_.reason)" -ForegroundColor Gray
            }
            $i++
        }
        
        if ($response.details.Count -gt 10) {
            Write-Host ""
            Write-Host "   ... e mais $($response.details.Count - 10) itens" -ForegroundColor Gray
        }
    }

    if ($response.errors -and $response.errors.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  Erros encontrados:" -ForegroundColor Red
        $response.errors[0..9] | ForEach-Object -Begin { $i = 1 } -Process {
            Write-Host ""
            Write-Host "   $i. $($_.error)" -ForegroundColor Red
            $i++
        }
    }

    Write-Host ""
    Write-Host "🧪 Modo DRY-RUN: Nenhum dado foi alterado" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Para executar a sincronização real, use:" -ForegroundColor Cyan
    Write-Host "   .\sync-charges-real.ps1" -ForegroundColor Yellow

} catch {
    Write-Host "❌ Erro ao executar teste:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
    
    exit 1
}


