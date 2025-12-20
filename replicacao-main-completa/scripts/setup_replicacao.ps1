# Script de Setup para Replicar Main do Zero
# Projeto: Revalya
# Main Project ID: wyehpiutzvwplllumgdk

Write-Host "==========================================="
Write-Host "SETUP: REPLICACAO DO MAIN"
Write-Host "==========================================="
Write-Host ""

# 1. Fazer login no Supabase CLI
Write-Host "1. Fazendo login no Supabase CLI..." -ForegroundColor Cyan
supabase login

# 2. Linkar ao projeto main
Write-Host ""
Write-Host "2. Linkando ao projeto main..." -ForegroundColor Cyan
supabase link --project-ref wyehpiutzvwplllumgdk

# 3. Aplicar migrations
Write-Host ""
Write-Host "3. Aplicando migrations..." -ForegroundColor Cyan
Write-Host "  IMPORTANTE: Copie as migrations para supabase/migrations/ do projeto" -ForegroundColor Yellow
Write-Host "  Depois execute: supabase db push" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Comando manual:" -ForegroundColor Cyan
Write-Host "    # Copiar migrations" -ForegroundColor White
Write-Host "    Copy-Item migrations\*.sql ..\..\supabase\migrations\" -ForegroundColor White
Write-Host "    # Aplicar" -ForegroundColor White
Write-Host "    cd ..\.." -ForegroundColor White
Write-Host "    supabase db push" -ForegroundColor White

# 4. Deploy Edge Functions
Write-Host ""
Write-Host "4. Fazendo deploy das Edge Functions..." -ForegroundColor Cyan
Get-ChildItem -Path "functions" -Directory | Where-Object { $_.Name -ne "_shared" } | ForEach-Object {
    Write-Host "  Deploy: $($_.Name)" -ForegroundColor Yellow
    supabase functions deploy $($_.Name) --project-ref wyehpiutzvwplllumgdk
}

Write-Host ""
Write-Host "==========================================="
Write-Host "SETUP CONCLUIDO!"
Write-Host "==========================================="
