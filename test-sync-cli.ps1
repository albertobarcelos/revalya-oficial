# Script para testar Edge Function sync-charges-from-staging via CLI
# Modo: DRY-RUN (nao altera dados)

$tenantId = "8d2888f1-64a5-445f-84f5-2614d5160251"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY"
$url = "https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/hyper-task/$tenantId"

$body = @{
    dryRun = $true
    batchSize = 50
} | ConvertTo-Json

Write-Host "Testando Edge Function em modo DRY-RUN..."
Write-Host "Tenant ID: $tenantId"
Write-Host "URL: $url"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json"
    } -Body $body
    
    Write-Host "SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "RESUMO:" -ForegroundColor Cyan
    Write-Host "   Total encontrado: $($response.summary.total)"
    Write-Host "   Processadas: $($response.summary.processed)"
    Write-Host "   Seriam atualizadas: $($response.summary.updated)" -ForegroundColor Yellow
    Write-Host "   Seriam ignoradas: $($response.summary.skipped)"
    Write-Host "   Erros: $($response.summary.errors)"
    Write-Host ""
    
    if($response.details -and $response.details.Count -gt 0) {
        Write-Host "Primeiros detalhes (limitado a 50):" -ForegroundColor Cyan
        $response.details | Select-Object -First 5 | Format-Table -AutoSize
    }
    
    Write-Host ""
    Write-Host "MODO DRY-RUN: Nenhum dado foi alterado no banco" -ForegroundColor Green
    
    # Salvar resposta completa em arquivo JSON para analise
    $response | ConvertTo-Json -Depth 10 | Out-File -FilePath "test-sync-response.json" -Encoding UTF8
    Write-Host "Resposta completa salva em: test-sync-response.json"
    
} catch {
    Write-Host "ERRO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes do erro:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message
    }
    
    if($_.Response) {
        $reader = New-Object System.IO.StreamReader($_.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Resposta do servidor:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}
