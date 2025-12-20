# =====================================================
# Script de Verificação de Ambiente Atual
# Descrição: Verifica qual ambiente está ativo e mostra informações
# =====================================================

# Cores para output
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Verificação de Ambiente - Revalya                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Error "Arquivo .env não encontrado!"
    Write-Info "Execute: .\scripts\switch-environment.ps1 -Environment development"
    exit 1
}

# Ler URL do Supabase
$envContent = Get-Content ".env"
$supabaseUrl = ($envContent | Where-Object { $_ -match "^VITE_SUPABASE_URL=" }) -replace "VITE_SUPABASE_URL=", ""

if (-not $supabaseUrl) {
    Write-Error "VITE_SUPABASE_URL não encontrada no .env"
    exit 1
}

# Detectar ambiente
$isProduction = $supabaseUrl -match "wyehpiutzvwplllumgdk"
$isDevelopment = $supabaseUrl -match "salhcvfmblogfnuqdhve"

if ($isProduction) {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ⚠️  AMBIENTE DE PRODUÇÃO ATIVO ⚠️                    ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Warning "Project ID: wyehpiutzvwplllumgdk"
    Write-Warning "Status: ATIVO - 10 clientes funcionais"
    Write-Warning "URL: $supabaseUrl"
    Write-Host ""
    Write-Warning "⚠️  CUIDADO: Qualquer operação afetará dados reais!"
} elseif ($isDevelopment) {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ AMBIENTE DE DESENVOLVIMENTO ATIVO                 ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Success "Project ID: salhcvfmblogfnuqdhve"
    Write-Success "Status: Ambiente de testes e desenvolvimento"
    Write-Success "URL: $supabaseUrl"
    Write-Host ""
    Write-Info "✅ Seguro para desenvolvimento e testes"
} else {
    Write-Warning "Ambiente desconhecido detectado"
    Write-Info "URL: $supabaseUrl"
}

# Verificar chaves configuradas
Write-Host ""
Write-Info "Verificando configuração das chaves..."

$anonKey = ($envContent | Where-Object { $_ -match "^VITE_SUPABASE_ANON_KEY=" }) -replace "VITE_SUPABASE_ANON_KEY=", ""
$serviceKey = ($envContent | Where-Object { $_ -match "^VITE_SUPABASE_SERVICE_ROLE_KEY=" }) -replace "VITE_SUPABASE_SERVICE_ROLE_KEY=", ""

if ($anonKey -match "SUBSTITUA" -or $serviceKey -match "SUBSTITUA") {
    Write-Warning "⚠️  Chaves do Supabase precisam ser configuradas!"
    Write-Info "Acesse: https://supabase.com/dashboard/project/salhcvfmblogfnuqdhve/settings/api"
} else {
    Write-Success "✅ Chaves configuradas corretamente"
}

# Verificar se há backup
$backups = Get-ChildItem -Filter ".env.backup.*" -ErrorAction SilentlyContinue
if ($backups) {
    Write-Host ""
    Write-Info "Backups disponíveis:"
    $backups | ForEach-Object {
        Write-Info "  - $($_.Name)"
    }
}

Write-Host ""

