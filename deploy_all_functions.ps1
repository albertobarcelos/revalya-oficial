# Script para fazer deploy de todas as Edge Functions
# Execute: .\deploy_all_functions.ps1

Write-Host "==========================================="
Write-Host "Deploy de todas as Edge Functions"
Write-Host "==========================================="
Write-Host ""

$functionsPath = "supabase\functions"
$functions = Get-ChildItem -Path $functionsPath -Directory | Where-Object { $_.Name -ne "_shared" }

$total = $functions.Count
$current = 0

foreach ($function in $functions) {
    $current++
    $functionName = $function.Name
    
    Write-Host "[$current/$total] Deploying: $functionName" -ForegroundColor Cyan
    
    try {
        supabase functions deploy $functionName
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $functionName deployed successfully" -ForegroundColor Green
        } else {
            Write-Host "✗ $functionName failed to deploy" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error deploying $functionName : $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "==========================================="
Write-Host "Deploy concluído!"
Write-Host "==========================================="

