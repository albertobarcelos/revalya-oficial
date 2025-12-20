# Script para fazer deploy de todas as Edge Functions para a branch develop

$developProjectId = "ivaeoagtrvjsksebnqwr"
$functionsPath = "supabase\functions"

# Lista de todas as functions (excluindo _shared)
$functions = Get-ChildItem -Path $functionsPath -Directory | 
    Where-Object { $_.Name -ne "_shared" } | 
    Select-Object -ExpandProperty Name | 
    Sort-Object

Write-Host "==========================================="
Write-Host "DEPLOY EDGE FUNCTIONS PARA DEVELOP"
Write-Host "==========================================="
Write-Host ""
Write-Host "Project ID (develop): $developProjectId" -ForegroundColor Cyan
Write-Host "Total de functions: $($functions.Count)" -ForegroundColor Cyan
Write-Host ""

$deployedCount = 0
$failedCount = 0
$failedFunctions = @()

foreach ($func in $functions) {
    Write-Host "[$($deployedCount + $failedCount + 1)/$($functions.Count)] Fazendo deploy: $func" -ForegroundColor Yellow
    
    try {
        # Fazer deploy da function
        $result = supabase functions deploy $func --project-ref $developProjectId 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Deploy concluido: $func" -ForegroundColor Green
            $deployedCount++
        } else {
            Write-Host "  [ERRO] Falha no deploy: $func" -ForegroundColor Red
            Write-Host "  Detalhes: $result" -ForegroundColor Red
            $failedCount++
            $failedFunctions += $func
        }
    } catch {
        Write-Host "  [ERRO] Excecao ao fazer deploy: $func" -ForegroundColor Red
        Write-Host "  Detalhes: $_" -ForegroundColor Red
        $failedCount++
        $failedFunctions += $func
    }
    
    Write-Host ""
}

Write-Host "==========================================="
Write-Host "RESUMO DO DEPLOY"
Write-Host "==========================================="
Write-Host "Deploy concluido: $deployedCount/$($functions.Count)" -ForegroundColor Green

if ($failedCount -gt 0) {
    Write-Host "Falhas: $failedCount" -ForegroundColor Red
    Write-Host ""
    Write-Host "Functions que falharam:" -ForegroundColor Red
    foreach ($func in $failedFunctions) {
        Write-Host "  - $func" -ForegroundColor Red
    }
} else {
    Write-Host "Todas as functions foram deployadas com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================="

