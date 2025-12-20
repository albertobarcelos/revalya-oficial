# Script para sincronizar Edge Functions do Main para Local
# Requer: Supabase CLI configurado e conectado ao projeto main

param(
    [string]$ProjectRef = "",
    [string]$OutputPath = "supabase\functions"
)

Write-Host "==========================================="
Write-Host "Sincronização de Edge Functions"
Write-Host "==========================================="
Write-Host ""

# Verificar se Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

# Se project-ref foi fornecido, conectar
if ($ProjectRef) {
    Write-Host "Conectando ao projeto: $ProjectRef" -ForegroundColor Cyan
    supabase link --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao conectar ao projeto" -ForegroundColor Red
        exit 1
    }
}

# Listar functions disponíveis
Write-Host "Listando Edge Functions disponíveis..." -ForegroundColor Cyan
$functionsList = supabase functions list

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao listar functions" -ForegroundColor Red
    Write-Host "Tente conectar manualmente: supabase link --project-ref <project-ref>" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "NOTA: O Supabase CLI não tem comando direto para fazer pull de Edge Functions." -ForegroundColor Yellow
Write-Host ""
Write-Host "OPÇÕES:" -ForegroundColor Cyan
Write-Host "1. Use o Supabase Dashboard para copiar manualmente cada function" -ForegroundColor White
Write-Host "2. Use a API do Supabase (requer autenticação)" -ForegroundColor White
Write-Host ""
Write-Host "URL do Dashboard:" -ForegroundColor Cyan
Write-Host "https://supabase.com/dashboard/project/$ProjectRef/functions" -ForegroundColor White
Write-Host ""

# Lista de functions que devem existir (baseado no diretório local)
$expectedFunctions = @(
    "asaas-import-all-charges",
    "asaas-import-charges",
    "asaas-proxy",
    "asaas-webhook-charges",
    "assinafy-delete-contact",
    "assinafy-delete-template",
    "assinafy-list-contacts",
    "assinafy-list-signer-documents",
    "assinafy-list-templates",
    "assinafy-update-contact",
    "bulk-insert-helper",
    "cleanup-expired-tokens",
    "create-user-admin",
    "cron-cleanup-scheduler",
    "digital-contracts",
    "evolution-proxy",
    "exchange-tenant-code",
    "fetch-asaas-customer",
    "financial-calculations",
    "financial-notifications",
    "financial-reports",
    "focusnfe",
    "jwt-custom-claims",
    "messages",
    "monitor-constraint-violations",
    "recalc-billing-statuses",
    "revoke-tenant-session",
    "send-bulk-messages",
    "send-invite-email",
    "send-welcome-email",
    "sync-charges-from-asaas-api",
    "validate-tenant-token"
)

Write-Host "==========================================="
Write-Host "Functions que devem ser sincronizadas:" -ForegroundColor Cyan
Write-Host "==========================================="
foreach ($func in $expectedFunctions) {
    $localPath = Join-Path $OutputPath $func
    if (Test-Path $localPath) {
        Write-Host "✓ $func (existe localmente)" -ForegroundColor Green
    } else {
        Write-Host "✗ $func (NÃO existe localmente)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================="
Write-Host "Próximos Passos:" -ForegroundColor Cyan
Write-Host "==========================================="
Write-Host "1. Acesse o Dashboard do Supabase" -ForegroundColor White
Write-Host "2. Vá em Functions" -ForegroundColor White
Write-Host "3. Para cada function, copie o código e salve localmente" -ForegroundColor White
Write-Host "4. OU use a API do Supabase para download automático" -ForegroundColor White

