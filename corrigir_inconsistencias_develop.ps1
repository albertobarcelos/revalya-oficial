# Script para corrigir inconsistências encontradas no develop

$developProjectId = "ivaeoagtrvjsksebnqwr"

Write-Host "==========================================="
Write-Host "CORRIGINDO INCONSISTENCIAS NO DEVELOP"
Write-Host "==========================================="
Write-Host ""
Write-Host "Project ID (develop): $developProjectId" -ForegroundColor Cyan
Write-Host ""

# Functions que precisam ter verify_jwt=false
$functionsToFix = @(
    @{name="evolution-proxy"; verify_jwt=$false},
    @{name="asaas-import-charges"; verify_jwt=$false}
)

Write-Host "FUNCTIONS PARA CORRIGIR verify_jwt:" -ForegroundColor Yellow
Write-Host ""

foreach ($func in $functionsToFix) {
    Write-Host "  - $($func.name) -> verify_jwt=$($func.verify_jwt)" -ForegroundColor Yellow
}

Write-Host ""
$confirm = Read-Host "Deseja corrigir essas functions? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operacao cancelada." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Fazendo redeploy das functions com verify_jwt correto..." -ForegroundColor Cyan
Write-Host ""

foreach ($func in $functionsToFix) {
    Write-Host "[$($functionsToFix.IndexOf($func) + 1)/$($functionsToFix.Count)] Corrigindo: $($func.name)" -ForegroundColor Yellow
    
    try {
        # Fazer deploy sem verify_jwt (ou com --no-verify-jwt se disponível)
        # Nota: O Supabase CLI pode não ter essa opção, então precisamos atualizar o config.toml
        Write-Host "  [INFO] Atualizando config.toml..." -ForegroundColor Cyan
        
        # Ler config.toml atual
        $configPath = "supabase\config.toml"
        if (Test-Path $configPath) {
            $configContent = Get-Content $configPath -Raw
            
            # Verificar se já existe configuração para essa function
            $functionConfig = "[functions.$($func.name)]"
            $verifyJwtLine = "verify_jwt = $($func.verify_jwt.ToString().ToLower())"
            
            if ($configContent -match "\[functions\.$($func.name)\]") {
                # Atualizar existente
                $configContent = $configContent -replace "(?s)\[functions\.$($func.name)\].*?verify_jwt\s*=\s*\w+", "[functions.$($func.name)]`nverify_jwt = $($func.verify_jwt.ToString().ToLower())"
            } else {
                # Adicionar novo
                $configContent += "`n$functionConfig`n$verifyJwtLine`n"
            }
            
            # Salvar config.toml
            $configContent | Set-Content $configPath -NoNewline
            Write-Host "  [OK] config.toml atualizado" -ForegroundColor Green
        } else {
            Write-Host "  [AVISO] config.toml nao encontrado" -ForegroundColor Yellow
        }
        
        # Fazer redeploy
        $result = supabase functions deploy $($func.name) --project-ref $developProjectId 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Deploy concluido: $($func.name)" -ForegroundColor Green
        } else {
            Write-Host "  [ERRO] Falha no deploy: $($func.name)" -ForegroundColor Red
            Write-Host "  Detalhes: $result" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [ERRO] Excecao ao corrigir: $($func.name)" -ForegroundColor Red
        Write-Host "  Detalhes: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "==========================================="
Write-Host "CORRECAO CONCLUIDA"
Write-Host "==========================================="
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  - Verifique se o config.toml foi atualizado corretamente" -ForegroundColor Yellow
Write-Host "  - As functions foram redeployadas" -ForegroundColor Yellow
Write-Host "  - Execute 'comparar_main_develop.ps1' novamente para verificar" -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================="

