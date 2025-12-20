# Script para configurar Branch Protection Rules na main via GitHub API
# Uso: .\scripts\setup-branch-protection.ps1 -GitHubToken "seu_token_aqui"

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubToken,
    
    [Parameter(Mandatory=$false)]
    [string]$Owner = "albertobarcelos",
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = "revalya-oficial",
    
    [Parameter(Mandatory=$false)]
    [string]$Branch = "main",
    
    [Parameter(Mandatory=$false)]
    [int]$RequiredApprovals = 1
)

Write-Host "🔒 Configurando Branch Protection para '$Branch'" -ForegroundColor Cyan

# URL da API do GitHub
$apiUrl = "https://api.github.com/repos/$Owner/$Repo/branches/$Branch/protection"

# Headers
$headers = @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $GitHubToken"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# Payload de configuração
$body = @{
    required_status_checks = @{
        strict = $true
        contexts = @()
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
        required_approving_review_count = $RequiredApprovals
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $false
        require_last_push_approval = $false
    }
    restrictions = $null
    required_linear_history = $false
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_conversation_resolution = $true
    lock_branch = $false
    allow_fork_syncing = $false
} | ConvertTo-Json -Depth 10

Write-Host "📤 Enviando requisição para GitHub API..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Put -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Branch Protection configurada com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Configurações aplicadas:" -ForegroundColor Cyan
    Write-Host "   ✅ Require pull request before merging" -ForegroundColor Green
    Write-Host "   ✅ Required approvals: $RequiredApprovals" -ForegroundColor Green
    Write-Host "   ✅ Dismiss stale reviews: true" -ForegroundColor Green
    Write-Host "   ✅ Require conversation resolution: true" -ForegroundColor Green
    Write-Host "   ✅ Require branches to be up to date: true" -ForegroundColor Green
    Write-Host "   ✅ Include administrators: true" -ForegroundColor Green
    Write-Host "   ❌ Allow force pushes: false" -ForegroundColor Yellow
    Write-Host "   ❌ Allow deletions: false" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔗 Verifique em: https://github.com/$Owner/$Repo/settings/branches" -ForegroundColor Cyan
    
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($errorResponse) {
        Write-Host "❌ Erro ao configurar branch protection:" -ForegroundColor Red
        Write-Host "   Mensagem: $($errorResponse.message)" -ForegroundColor Red
        
        if ($errorResponse.errors) {
            foreach ($error in $errorResponse.errors) {
                Write-Host "   - $($error.message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ Erro ao configurar branch protection:" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "💡 Dicas:" -ForegroundColor Yellow
    Write-Host "   1. Verifique se o token tem permissão 'repo' (full control)" -ForegroundColor Yellow
    Write-Host "   2. Verifique se você tem permissão de admin no repositório" -ForegroundColor Yellow
    Write-Host "   3. Tente configurar manualmente em: https://github.com/$Owner/$Repo/settings/branches" -ForegroundColor Yellow
    
    exit 1
}

