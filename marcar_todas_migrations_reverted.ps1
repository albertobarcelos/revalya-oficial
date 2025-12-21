# =====================================================
# Script: Marcar Todas as Migrations como Reverted na Develop
# Data: 21/12/2025
# Descrição: Marca todas as migrations no banco develop como "reverted"
#            para resolver o erro "Remote migration versions not found"
# =====================================================

Write-Host "🔧 Marcando todas as migrations como 'reverted' na develop..." -ForegroundColor Cyan
Write-Host ""

# Configurações
$PROJECT_REF = "ivaeoagtrvjsksebnqwr"

# Verificar se o Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI não encontrado. Instale primeiro:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green

# Verificar se está logado
Write-Host ""
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Cyan
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não está autenticado. Fazendo login..." -ForegroundColor Yellow
    Write-Host "   Por favor, siga as instruções para fazer login no navegador." -ForegroundColor Yellow
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha no login. Abortando." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Autenticado" -ForegroundColor Green

# Linkar ao projeto develop
Write-Host ""
Write-Host "🔗 Linkando ao projeto develop ($PROJECT_REF)..." -ForegroundColor Cyan
supabase link --project-ref $PROJECT_REF
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha ao linkar ao projeto. Verifique o project-ref." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Projeto linkado" -ForegroundColor Green

# Listar migrations
Write-Host ""
Write-Host "📋 Listando migrations no banco..." -ForegroundColor Cyan
$migrations = supabase migration list --linked 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erro ao listar migrations. Tentando método alternativo..." -ForegroundColor Yellow
    
    # Tentar método alternativo: usar db pull para ver migrations
    Write-Host "   Usando método alternativo para obter versões..." -ForegroundColor Yellow
    
    # Extrair versões das migrations locais para comparar
    $localMigrations = Get-ChildItem supabase\migrations\*.sql | 
        Where-Object { $_.Name -match '^(\d{8,14})_' } | 
        ForEach-Object { 
            if ($_.Name -match '^(\d{8,14})_') { 
                $matches[1] 
            } 
        } | 
        Sort-Object
    
    Write-Host ""
    Write-Host "📋 Migrations locais encontradas:" -ForegroundColor Cyan
    $localMigrations | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    
    Write-Host ""
    Write-Host "⚠️  Para marcar todas as migrations remotas como reverted," -ForegroundColor Yellow
    Write-Host "   você precisa executar manualmente no SQL Editor do Supabase:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Em seguida execute:" -ForegroundColor Yellow
    Write-Host "   supabase migration repair --status reverted [VERSOES_SEPARADAS_POR_ESPACO]" -ForegroundColor Cyan
    exit 0
}

# Se conseguiu listar, extrair versões
Write-Host ""
Write-Host "📋 Migrations encontradas no banco:" -ForegroundColor Cyan
$migrations | Select-String -Pattern '\d{8,14}' | ForEach-Object { 
    Write-Host "   $_" -ForegroundColor Gray 
}

# Extrair versões para o comando repair
$versions = $migrations | Select-String -Pattern '(\d{8,14})' -AllMatches | 
    ForEach-Object { $_.Matches } | 
    ForEach-Object { $_.Value } | 
    Select-Object -Unique |
    Sort-Object

if ($versions.Count -eq 0) {
    Write-Host ""
    Write-Host "⚠️  Nenhuma migration encontrada no banco." -ForegroundColor Yellow
    Write-Host "   O banco pode estar vazio ou não há migrations aplicadas." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔧 Preparando comando para marcar como reverted..." -ForegroundColor Cyan
$versionsString = $versions -join ' '
Write-Host ""
Write-Host "Comando a executar:" -ForegroundColor Yellow
Write-Host "supabase migration repair --status reverted $versionsString" -ForegroundColor Cyan
Write-Host ""

# Perguntar confirmação
$confirmation = Read-Host "Deseja executar este comando? (S/N)"
if ($confirmation -ne 'S' -and $confirmation -ne 's') {
    Write-Host "❌ Operação cancelada pelo usuário." -ForegroundColor Yellow
    exit 0
}

# Executar repair
Write-Host ""
Write-Host "🚀 Executando repair..." -ForegroundColor Cyan
supabase migration repair --status reverted $versionsString

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Todas as migrations foram marcadas como 'reverted'!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Faça commit e push das novas migrations para develop" -ForegroundColor Yellow
    Write-Host "   2. A integração nativa do Supabase deve funcionar corretamente agora" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Erro ao executar repair. Verifique as mensagens acima." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Dica: Você pode executar o comando manualmente:" -ForegroundColor Yellow
    Write-Host "   supabase migration repair --status reverted $versionsString" -ForegroundColor Cyan
}

