# Script para reverter uma PR mergeada na main
# Uso: .\scripts\revert-pr.ps1 -PrNumber 59

param(
    [Parameter(Mandatory=$true)]
    [int]$PrNumber,
    
    [Parameter(Mandatory=$false)]
    [string]$MergeCommitSha = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateBranch = $false
)

Write-Host "🔄 Revertendo PR #$PrNumber" -ForegroundColor Cyan

# Verificar se está no diretório correto
if (-not (Test-Path ".git")) {
    Write-Host "❌ Erro: Este script deve ser executado na raiz do repositório" -ForegroundColor Red
    exit 1
}

# Verificar status do git
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Aviso: Há mudanças não commitadas" -ForegroundColor Yellow
    $response = Read-Host "Deseja fazer stash? (s/n)"
    if ($response -eq "s") {
        git stash
        Write-Host "✅ Mudanças salvas em stash" -ForegroundColor Green
    } else {
        Write-Host "❌ Abortando. Por favor, commit ou faça stash das mudanças primeiro." -ForegroundColor Red
        exit 1
    }
}

# Mudar para main
Write-Host "📦 Mudando para branch main..." -ForegroundColor Cyan
git checkout main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao mudar para main" -ForegroundColor Red
    exit 1
}

# Atualizar main
Write-Host "⬇️  Atualizando main..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao atualizar main" -ForegroundColor Red
    exit 1
}

# Se não foi fornecido o commit SHA, tentar encontrar
if ([string]::IsNullOrEmpty($MergeCommitSha)) {
    Write-Host "🔍 Procurando commit de merge da PR #$PrNumber..." -ForegroundColor Cyan
    
    # Tentar encontrar o commit de merge
    $mergeCommits = git log --merges --oneline --grep="Merge pull request #$PrNumber" -1
    if ($mergeCommits) {
        $MergeCommitSha = ($mergeCommits -split ' ')[0]
        Write-Host "✅ Encontrado commit: $MergeCommitSha" -ForegroundColor Green
    } else {
        Write-Host "❌ Não foi possível encontrar o commit de merge automaticamente" -ForegroundColor Red
        Write-Host "Por favor, forneça o commit SHA usando -MergeCommitSha" -ForegroundColor Yellow
        exit 1
    }
}

# Criar branch se solicitado
if ($CreateBranch) {
    $branchName = "revert-pr-$PrNumber"
    Write-Host "🌿 Criando branch: $branchName" -ForegroundColor Cyan
    git checkout -b $branchName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao criar branch" -ForegroundColor Red
        exit 1
    }
}

# Reverter o commit
Write-Host "🔄 Revertendo commit $MergeCommitSha..." -ForegroundColor Cyan
git revert -m 1 $MergeCommitSha

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Reversão concluída com sucesso!" -ForegroundColor Green
    
    if ($CreateBranch) {
        Write-Host "📤 Para fazer push da branch:" -ForegroundColor Cyan
        Write-Host "   git push origin revert-pr-$PrNumber" -ForegroundColor Yellow
        Write-Host "📝 Depois crie uma PR no GitHub" -ForegroundColor Cyan
    } else {
        Write-Host "📤 Para fazer push direto na main:" -ForegroundColor Cyan
        Write-Host "   git push origin main" -ForegroundColor Yellow
        Write-Host "⚠️  Certifique-se de revisar as mudanças antes!" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Erro durante a reversão. Pode haver conflitos." -ForegroundColor Red
    Write-Host "💡 Resolva os conflitos e use: git revert --continue" -ForegroundColor Yellow
    exit 1
}

