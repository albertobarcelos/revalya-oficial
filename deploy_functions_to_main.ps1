# Script para fazer deploy seletivo de Edge Functions para Main (Produção)
# Uso: .\deploy_functions_to_main.ps1 -Functions "function1,function2"
# OU: .\deploy_functions_to_main.ps1 (deploy de todas)

param(
    [string]$Functions = "",  # Lista separada por vírgula: "function1,function2"
    [switch]$DryRun = $false,  # Apenas simular, não fazer deploy
    [switch]$Verify = $true    # Verificar antes de fazer deploy
)

$mainProjectId = "wyehpiutzvwplllumgdk"
$developProjectId = "ivaeoagtrvjsksebnqwr"
$functionsPath = "supabase\functions"

Write-Host "==========================================="
Write-Host "DEPLOY EDGE FUNCTIONS PARA MAIN (PRODUÇÃO)"
Write-Host "==========================================="
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Você está fazendo deploy para PRODUÇÃO!" -ForegroundColor Red
Write-Host ""

# Verificar se Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

# Determinar quais functions fazer deploy
$functionsToDeploy = @()

if ($Functions) {
    # Deploy seletivo
    $functionsToDeploy = $Functions -split "," | ForEach-Object { $_.Trim() }
    Write-Host "Deploy seletivo de: $($functionsToDeploy.Count) function(s)" -ForegroundColor Cyan
    Write-Host "Functions: $($functionsToDeploy -join ', ')" -ForegroundColor Cyan
} else {
    # Deploy de todas as functions locais
    $allFunctions = Get-ChildItem -Path $functionsPath -Directory | 
        Where-Object { $_.Name -ne "_shared" } | 
        Select-Object -ExpandProperty Name | 
        Sort-Object
    
    Write-Host "Todas as functions locais serão deployadas" -ForegroundColor Yellow
    Write-Host "Total: $($allFunctions.Count) functions" -ForegroundColor Yellow
    Write-Host ""
    
    if ($Verify) {
        Write-Host "Deseja continuar? (S/N)" -ForegroundColor Yellow
        $response = Read-Host
        if ($response -ne "S" -and $response -ne "s") {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
            exit 0
        }
    }
    
    $functionsToDeploy = $allFunctions
}

Write-Host ""
Write-Host "Main Project ID: $mainProjectId" -ForegroundColor Cyan
Write-Host "Functions Path: $functionsPath" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 MODO DRY-RUN (simulação)" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar se functions existem localmente
$missingFunctions = @()
foreach ($func in $functionsToDeploy) {
    $funcPath = Join-Path $functionsPath $func
    if (-not (Test-Path $funcPath)) {
        $missingFunctions += $func
    }
}

if ($missingFunctions.Count -gt 0) {
    Write-Host "ERRO: As seguintes functions não existem localmente:" -ForegroundColor Red
    foreach ($func in $missingFunctions) {
        Write-Host "  - $func" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Verifique o caminho: $functionsPath" -ForegroundColor Yellow
    exit 1
}

# Estatísticas
$deployedCount = 0
$failedCount = 0
$failedFunctions = @()
$skippedCount = 0

Write-Host "==========================================="
Write-Host "INICIANDO DEPLOY"
Write-Host "==========================================="
Write-Host ""

foreach ($func in $functionsToDeploy) {
    $current = $deployedCount + $failedCount + $skippedCount + 1
    $total = $functionsToDeploy.Count
    
    Write-Host "[$current/$total] Processando: $func" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "  [DRY-RUN] Simulando deploy de: $func" -ForegroundColor Cyan
        Write-Host "  Comando: supabase functions deploy $func --project-ref $mainProjectId" -ForegroundColor Gray
        $skippedCount++
        Write-Host ""
        continue
    }
    
    try {
        # Fazer deploy da function
        Write-Host "  Fazendo deploy..." -ForegroundColor Cyan
        $result = supabase functions deploy $func --project-ref $mainProjectId 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [✓] Deploy concluído: $func" -ForegroundColor Green
            $deployedCount++
        } else {
            Write-Host "  [✗] Falha no deploy: $func" -ForegroundColor Red
            Write-Host "  Detalhes: $result" -ForegroundColor Red
            $failedCount++
            $failedFunctions += $func
        }
    } catch {
        Write-Host "  [✗] Exceção ao fazer deploy: $func" -ForegroundColor Red
        Write-Host "  Detalhes: $_" -ForegroundColor Red
        $failedCount++
        $failedFunctions += $func
    }
    
    Write-Host ""
}

# Resumo
Write-Host "==========================================="
Write-Host "RESUMO DO DEPLOY"
Write-Host "==========================================="
Write-Host ""

if ($DryRun) {
    Write-Host "Modo: DRY-RUN (simulação)" -ForegroundColor Yellow
    Write-Host "Functions que seriam deployadas: $($functionsToDeploy.Count)" -ForegroundColor Cyan
} else {
    Write-Host "Deploy concluído: $deployedCount/$($functionsToDeploy.Count)" -ForegroundColor $(if ($deployedCount -eq $functionsToDeploy.Count) { "Green" } else { "Yellow" })
    
    if ($failedCount -gt 0) {
        Write-Host "Falhas: $failedCount" -ForegroundColor Red
        Write-Host ""
        Write-Host "Functions que falharam:" -ForegroundColor Red
        foreach ($func in $failedFunctions) {
            Write-Host "  - $func" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Verifique os logs acima para detalhes." -ForegroundColor Yellow
    } else {
        Write-Host "Todas as functions foram deployadas com sucesso!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Verificar Dashboard: https://supabase.com/dashboard/project/$mainProjectId/functions" -ForegroundColor White
Write-Host "2. Testar endpoints em produção" -ForegroundColor White
Write-Host "3. Monitorar logs" -ForegroundColor White
Write-Host "4. Executar: .\comparar_main_develop.ps1 para verificar sincronização" -ForegroundColor White
Write-Host ""
Write-Host "==========================================="

