# Script para Sincronizar Histórico de Migrations com GitHub
# Uso: .\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main"

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectRef,
    
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [switch]$DryRun = $false
)

$migrationsPath = "supabase\migrations"

Write-Host "==========================================="
Write-Host "SINCRONIZACAO DE HISTORICO DE MIGRATIONS"
Write-Host "==========================================="
Write-Host ""
Write-Host "Projeto: $ProjectName" -ForegroundColor Cyan
Write-Host "Project Ref: $ProjectRef" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 MODO DRY-RUN (simulação)" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar se Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

# Verificar se pasta de migrations existe
if (-not (Test-Path $migrationsPath)) {
    Write-Host "ERRO: Pasta de migrations não encontrada: $migrationsPath" -ForegroundColor Red
    exit 1
}

# Passo 1: Listar migrations no GitHub
Write-Host "==========================================="
Write-Host "PASSO 1: LISTANDO MIGRATIONS NO GITHUB"
Write-Host "==========================================="
Write-Host ""

$githubMigrations = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | 
    Where-Object { 
        $_.Name -match '^\d{14}_' -and 
        $_.Name -ne "schema.sql" -and 
        $_.Name -ne "data.sql" -and 
        $_.Name -ne "roles.sql"
    } | 
    Select-Object @{
        Name="Version"; 
        Expression={ 
            if ($_.Name -match '^(\d{14})_') {
                $matches[1]
            } else {
                $null
            }
        }
    }, @{
        Name="Name"; 
        Expression={ $_.Name }
    } | 
    Sort-Object Version

Write-Host "Migrations encontradas no GitHub: $($githubMigrations.Count)" -ForegroundColor Cyan
foreach ($mig in $githubMigrations) {
    Write-Host "  - $($mig.Version): $($mig.Name)" -ForegroundColor White
}

Write-Host ""

# Passo 2: Conectar ao projeto
Write-Host "==========================================="
Write-Host "PASSO 2: CONECTANDO AO PROJETO"
Write-Host "==========================================="
Write-Host ""

if (-not $DryRun) {
    Write-Host "Conectando ao projeto $ProjectRef..." -ForegroundColor Cyan
    supabase link --project-ref $ProjectRef
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao conectar ao projeto" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Conectado!" -ForegroundColor Green
    Write-Host ""
}

# Passo 3: Verificar migrations aplicadas no Supabase
Write-Host "==========================================="
Write-Host "PASSO 3: VERIFICANDO MIGRATIONS APLICADAS"
Write-Host "==========================================="
Write-Host ""

Write-Host "⚠️  Para verificar migrations aplicadas, execute manualmente:" -ForegroundColor Yellow
Write-Host ""
Write-Host "SQL Query:" -ForegroundColor Cyan
Write-Host "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor White
Write-Host ""
Write-Host "Ou via Dashboard:" -ForegroundColor Cyan
Write-Host "https://supabase.com/dashboard/project/$ProjectRef" -ForegroundColor White
Write-Host ""

# Passo 4: Sincronizar histórico
Write-Host "==========================================="
Write-Host "PASSO 4: SINCRONIZAR HISTORICO"
Write-Host "==========================================="
Write-Host ""

Write-Host "Opções de sincronização:" -ForegroundColor Cyan
Write-Host "1. Marcar todas as migrations do GitHub como aplicadas" -ForegroundColor White
Write-Host "2. Marcar migrations específicas como aplicadas" -ForegroundColor White
Write-Host "3. Marcar migrations como reverted (removidas do GitHub)" -ForegroundColor White
Write-Host "4. Cancelar" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Digite o número da opção"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "⚠️  ATENÇÃO: Isso marcará TODAS as migrations do GitHub como aplicadas!" -ForegroundColor Red
        Write-Host "Certifique-se de que essas migrations já estão aplicadas no banco." -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Digite 'SIM' para confirmar"
        
        if ($confirm -eq "SIM") {
            Write-Host ""
            Write-Host "Marcando migrations como aplicadas..." -ForegroundColor Cyan
            
            $versions = $githubMigrations | ForEach-Object { $_.Version } | Where-Object { $_ -ne $null }
            $versionsString = $versions -join " "
            
            if ($DryRun) {
                Write-Host "[DRY-RUN] Comando que seria executado:" -ForegroundColor Yellow
                Write-Host "supabase migration repair --status applied $versionsString" -ForegroundColor Gray
            } else {
                foreach ($version in $versions) {
                    Write-Host "  Marcando $version como aplicada..." -ForegroundColor Cyan
                    supabase migration repair --status applied $version 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "    ✅ $version marcada" -ForegroundColor Green
                    } else {
                        Write-Host "    ⚠️  $version (pode já estar marcada)" -ForegroundColor Yellow
                    }
                }
            }
            
            Write-Host ""
            Write-Host "✅ Sincronização concluída!" -ForegroundColor Green
        } else {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Digite as versões das migrations (separadas por espaço):" -ForegroundColor Cyan
        Write-Host "Exemplo: 20240101000000 20250127 20251125" -ForegroundColor Gray
        $versionsInput = Read-Host "Versões"
        
        if ($versionsInput) {
            $versions = $versionsInput -split " " | Where-Object { $_ -ne "" }
            
            Write-Host ""
            Write-Host "Migrations que serão marcadas como aplicadas:" -ForegroundColor Cyan
            foreach ($v in $versions) {
                $mig = $githubMigrations | Where-Object { $_.Version -eq $v }
                if ($mig) {
                    Write-Host "  - $v : $($mig.Name)" -ForegroundColor White
                } else {
                    Write-Host "  - $v : (não encontrada no GitHub)" -ForegroundColor Yellow
                }
            }
            
            Write-Host ""
            $confirm = Read-Host "Digite 'SIM' para confirmar"
            
            if ($confirm -eq "SIM") {
                Write-Host ""
                Write-Host "Marcando migrations..." -ForegroundColor Cyan
                
                foreach ($version in $versions) {
                    if ($DryRun) {
                        Write-Host "[DRY-RUN] Marcaria $version como aplicada" -ForegroundColor Yellow
                    } else {
                        Write-Host "  Marcando $version..." -ForegroundColor Cyan
                        supabase migration repair --status applied $version 2>&1 | Out-Null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Host "    ✅ $version marcada" -ForegroundColor Green
                        } else {
                            Write-Host "    ⚠️  $version (pode já estar marcada)" -ForegroundColor Yellow
                        }
                    }
                }
                
                Write-Host ""
                Write-Host "✅ Sincronização concluída!" -ForegroundColor Green
            } else {
                Write-Host "Operação cancelada." -ForegroundColor Yellow
            }
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Digite as versões das migrations que foram removidas do GitHub:" -ForegroundColor Cyan
        Write-Host "Essas migrations serão marcadas como 'reverted'" -ForegroundColor Yellow
        $versionsInput = Read-Host "Versões (separadas por espaço)"
        
        if ($versionsInput) {
            $versions = $versionsInput -split " " | Where-Object { $_ -ne "" }
            
            Write-Host ""
            Write-Host "⚠️  ATENÇÃO: Isso marcará migrations como reverted!" -ForegroundColor Red
            Write-Host "Certifique-se de que essas migrations foram realmente removidas do GitHub." -ForegroundColor Yellow
            Write-Host ""
            $confirm = Read-Host "Digite 'SIM' para confirmar"
            
            if ($confirm -eq "SIM") {
                Write-Host ""
                Write-Host "Marcando migrations como reverted..." -ForegroundColor Cyan
                
                foreach ($version in $versions) {
                    if ($DryRun) {
                        Write-Host "[DRY-RUN] Marcaria $version como reverted" -ForegroundColor Yellow
                    } else {
                        Write-Host "  Marcando $version como reverted..." -ForegroundColor Cyan
                        supabase migration repair --status reverted $version 2>&1 | Out-Null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Host "    ✅ $version marcada como reverted" -ForegroundColor Green
                        } else {
                            Write-Host "    ⚠️  $version (pode já estar marcada)" -ForegroundColor Yellow
                        }
                    }
                }
                
                Write-Host ""
                Write-Host "✅ Sincronização concluída!" -ForegroundColor Green
            } else {
                Write-Host "Operação cancelada." -ForegroundColor Yellow
            }
        }
    }
    "4" {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Opção inválida." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================="
Write-Host "PRÓXIMOS PASSOS"
Write-Host "==========================================="
Write-Host ""
Write-Host "1. Verificar histórico sincronizado:" -ForegroundColor Cyan
Write-Host "   SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor White
Write-Host ""
Write-Host "2. Testar aplicação de nova migration:" -ForegroundColor Cyan
Write-Host "   supabase migration new teste" -ForegroundColor White
Write-Host "   supabase db push" -ForegroundColor White
Write-Host ""
Write-Host "3. Verificar que apenas novas migrations são aplicadas" -ForegroundColor Cyan
Write-Host ""
Write-Host "==========================================="

