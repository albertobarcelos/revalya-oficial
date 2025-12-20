# =============================================================================
# Script: Configurar Ambiente de Staging no Supabase
# =============================================================================
# 
# Este script ajuda a criar e configurar um ambiente de staging (dev)
# no Supabase usando Development Branches.
#
# ⚠️ ANTES DE EXECUTAR:
# 1. Instale Supabase CLI (veja docs/INSTALAR_FERRAMENTAS.md)
# 2. Faça login: supabase login
# 3. O custo é $0.01344/hora (~$10/mês se rodar 24/7)
#
# =============================================================================

param(
    [Parameter(HelpMessage="Fazer login no Supabase CLI (se ainda não fez)")]
    [switch]$Login,
    
    [Parameter(HelpMessage="Criar uma nova branch de staging")]
    [switch]$Create,
    
    [Parameter(HelpMessage="Nome da branch a criar (padrão: staging)")]
    [string]$BranchName = "staging",
    
    [Parameter(HelpMessage="Corrigir branch existente (develop)")]
    [switch]$Fix,
    
    [Parameter(HelpMessage="Aplicar migrações na branch")]
    [switch]$Push,
    
    [Parameter(HelpMessage="Deploy de Edge Functions")]
    [switch]$DeployFunctions,
    
    [Parameter(HelpMessage="Listar branches existentes")]
    [switch]$List
)

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================

$PROJECT_REF_PRODUCTION = "wyehpiutzvwplllumgdk"
$BRANCH_DEVELOP_REF = "salhcvfmblogfnuqdhve"

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

function Write-Step {
    param([string]$Message, [string]$Color = "Yellow")
    Write-Host "`n[STEP] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERRO] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[AVISO] $Message" -ForegroundColor Yellow
}

function Test-SupabaseCLI {
    try {
        $version = supabase --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Supabase CLI encontrado: $version"
            return $true
        }
    }
    catch {
        Write-Error "Supabase CLI não encontrado!"
        Write-Info "Instale seguindo: docs/INSTALAR_FERRAMENTAS.md"
        return $false
    }
    return $false
}

function Confirm-Cost {
    Write-Warning "`n⚠️  CUSTO DA BRANCH:"
    Write-Info "   - $0.01344 por hora"
    Write-Info "   - ~$10/mês se rodar 24/7"
    Write-Host ""
    $confirm = Read-Host "Você confirma que entende este custo? (s/N)"
    return $confirm -eq "s" -or $confirm -eq "S"
}

# =============================================================================
# FUNÇÕES PRINCIPAIS
# =============================================================================

function Invoke-Login {
    Write-Step "Fazendo login no Supabase CLI..."
    supabase login
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Login realizado com sucesso!"
        return $true
    }
    else {
        Write-Error "Falha no login"
        return $false
    }
}

function Invoke-LinkProduction {
    Write-Step "Linkando ao projeto de produção..."
    supabase link --project-ref $PROJECT_REF_PRODUCTION
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Projeto linkado com sucesso!"
        return $true
    }
    else {
        Write-Error "Falha ao linkar projeto"
        return $false
    }
}

function Invoke-ListBranches {
    Write-Step "Listando branches existentes..."
    Write-Host ""
    supabase branches list --project-ref $PROJECT_REF_PRODUCTION
    Write-Host ""
}

function Invoke-CreateBranch {
    param([string]$Name)
    
    Write-Step "Criando branch '$Name'..."
    
    if (-not (Confirm-Cost)) {
        Write-Error "Criação cancelada pelo usuário"
        return $false
    }
    
    Write-Info "Criando branch... Isso pode levar alguns minutos..."
    supabase branches create $Name --project-ref $PROJECT_REF_PRODUCTION
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Branch '$Name' criada com sucesso!"
        Write-Info "Anote o project_ref retornado acima"
        return $true
    }
    else {
        Write-Error "Falha ao criar branch"
        return $false
    }
}

function Invoke-FixDevelopBranch {
    Write-Step "Corrigindo branch 'develop'..."
    
    Write-Info "Linkando à branch develop..."
    supabase branches link develop --project-ref $BRANCH_DEVELOP_REF
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha ao linkar branch develop"
        return $false
    }
    
    Write-Info "Aplicando migrações..."
    supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Branch 'develop' corrigida com sucesso!"
        return $true
    }
    else {
        Write-Error "Falha ao aplicar migrações"
        Write-Info "Tente executar manualmente: supabase db push"
        return $false
    }
}

function Invoke-PushMigrations {
    param([string]$BranchName, [string]$ProjectRef)
    
    Write-Step "Aplicando migrações na branch '$BranchName'..."
    
    if ($ProjectRef) {
        Write-Info "Linkando à branch '$BranchName'..."
        supabase branches link $BranchName --project-ref $ProjectRef
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Falha ao linkar branch"
            return $false
        }
    }
    
    Write-Info "Aplicando migrações..."
    supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migrações aplicadas com sucesso!"
        return $true
    }
    else {
        Write-Error "Falha ao aplicar migrações"
        return $false
    }
}

function Invoke-DeployFunctions {
    param([string]$BranchName, [string]$ProjectRef)
    
    Write-Step "Fazendo deploy de Edge Functions na branch '$BranchName'..."
    
    if ($ProjectRef) {
        Write-Info "Linkando à branch '$BranchName'..."
        supabase branches link $BranchName --project-ref $ProjectRef
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Falha ao linkar branch"
            return $false
        }
    }
    
    Write-Info "Fazendo deploy de todas as functions..."
    supabase functions deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Edge Functions deployadas com sucesso!"
        return $true
    }
    else {
        Write-Error "Falha no deploy das functions"
        return $false
    }
}

function Show-CredentialsInfo {
    Write-Step "Como obter credenciais da branch:" -Color "Cyan"
    Write-Host ""
    Write-Info "1. Acesse: https://supabase.com/dashboard"
    Write-Info "2. Selecione o projeto da branch"
    Write-Info "3. Vá em Settings > API"
    Write-Info "4. Copie:"
    Write-Host "   - Project URL" -ForegroundColor White
    Write-Host "   - anon/public key" -ForegroundColor White
    Write-Host "   - service_role key (se necessário)" -ForegroundColor White
    Write-Host ""
    Write-Info "Configure no arquivo .env.staging ou variáveis de ambiente"
}

# =============================================================================
# EXECUÇÃO PRINCIPAL
# =============================================================================

Write-Host "`n"
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Configurar Ambiente de Staging - Supabase                 ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar Supabase CLI
if (-not (Test-SupabaseCLI)) {
    exit 1
}

# Login
if ($Login) {
    if (-not (Invoke-Login)) {
        exit 1
    }
}

# Linkar ao projeto de produção (se necessário)
if ($Create -or $Fix -or $Push -or $DeployFunctions) {
    Write-Info "Verificando se projeto está linkado..."
    $linkCheck = supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0 -or $linkCheck -notmatch $PROJECT_REF_PRODUCTION) {
        if (-not (Invoke-LinkProduction)) {
            Write-Error "Execute com -Link para linkar ao projeto primeiro"
            exit 1
        }
    }
}

# Listar branches
if ($List) {
    Invoke-ListBranches
    exit 0
}

# Criar branch
if ($Create) {
    if (-not (Invoke-CreateBranch -Name $BranchName)) {
        exit 1
    }
    
    Write-Host ""
    Write-Warning "⚠️  IMPORTANTE:"
    Write-Info "Anote o 'project_ref' retornado acima"
    Write-Info "Use-o para linkar e fazer deploy:"
    Write-Host "   supabase branches link $BranchName --project-ref [PROJECT_REF]" -ForegroundColor White
    Write-Host "   supabase db push" -ForegroundColor White
    Write-Host ""
    
    Show-CredentialsInfo
    exit 0
}

# Corrigir branch develop
if ($Fix) {
    if (-not (Invoke-FixDevelopBranch)) {
        exit 1
    }
    
    Write-Host ""
    Write-Success "Branch 'develop' configurada!"
    Write-Info "Project Ref: $BRANCH_DEVELOP_REF"
    Write-Info "URL: https://salhcvfmblogfnuqdhve.supabase.co"
    Write-Host ""
    
    Show-CredentialsInfo
    exit 0
}

# Aplicar migrações
if ($Push) {
    Write-Warning "Você precisa fornecer o project_ref da branch"
    Write-Info "Exemplo: .\scripts\configurar-staging.ps1 -Push"
    Write-Info "Depois execute: supabase branches link [NOME] --project-ref [REF]"
    Write-Info "E então: supabase db push"
    exit 0
}

# Deploy de functions
if ($DeployFunctions) {
    Write-Warning "Você precisa fornecer o project_ref da branch"
    Write-Info "Exemplo: .\scripts\configurar-staging.ps1 -DeployFunctions"
    Write-Info "Depois execute: supabase branches link [NOME] --project-ref [REF]"
    Write-Info "E então: supabase functions deploy"
    exit 0
}

# Se nenhuma opção foi especificada, mostrar ajuda
Write-Host ""
Write-Host "Uso do script:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  .\scripts\configurar-staging.ps1 -Login              # Fazer login"
Write-Host "  .\scripts\configurar-staging.ps1 -List               # Listar branches"
Write-Host "  .\scripts\configurar-staging.ps1 -Create             # Criar nova branch 'staging'"
Write-Host "  .\scripts\configurar-staging.ps1 -Create -BranchName 'dev'  # Criar branch 'dev'"
Write-Host "  .\scripts\configurar-staging.ps1 -Fix                # Corrigir branch 'develop'"
Write-Host ""
Write-Host "Exemplos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Primeira vez (login + criar branch):"
Write-Host "  .\scripts\configurar-staging.ps1 -Login -Create"
Write-Host ""
Write-Host "  # Corrigir branch develop existente:"
Write-Host "  .\scripts\configurar-staging.ps1 -Fix"
Write-Host ""
Write-Host "  # Listar todas as branches:"
Write-Host "  .\scripts\configurar-staging.ps1 -List"
Write-Host ""
Write-Host "Para mais informações, veja: docs/CRIAR_AMBIENTE_STAGING.md" -ForegroundColor Green
Write-Host ""
