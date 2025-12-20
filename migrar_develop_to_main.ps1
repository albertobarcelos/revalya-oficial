# Script Interativo para Migração Develop → Main
# Uso: .\migrar_develop_to_main.ps1

$mainProjectId = "wyehpiutzvwplllumgdk"
$developProjectId = "ivaeoagtrvjsksebnqwr"

Write-Host "==========================================="
Write-Host "MIGRACAO: DEVELOP → MAIN (PRODUÇÃO)"
Write-Host "==========================================="
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Você está migrando para PRODUÇÃO!" -ForegroundColor Red
Write-Host ""

# Verificar se Supabase CLI está instalado
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

# Passo 1: Comparar ambientes
Write-Host "==========================================="
Write-Host "PASSO 1: COMPARANDO AMBIENTES"
Write-Host "==========================================="
Write-Host ""

if (Test-Path ".\comparar_main_develop.ps1") {
    Write-Host "Executando comparação..." -ForegroundColor Cyan
    & .\comparar_main_develop.ps1
    Write-Host ""
} else {
    Write-Host "⚠️  Script comparar_main_develop.ps1 não encontrado" -ForegroundColor Yellow
    Write-Host "Continuando sem comparação..." -ForegroundColor Yellow
    Write-Host ""
}

# Passo 2: Menu de opções
Write-Host "==========================================="
Write-Host "PASSO 2: SELECIONAR O QUE MIGRAR"
Write-Host "==========================================="
Write-Host ""
Write-Host "O que deseja migrar?" -ForegroundColor Cyan
Write-Host "1. Edge Functions" -ForegroundColor White
Write-Host "2. Migrations (mudanças em tabelas)" -ForegroundColor White
Write-Host "3. Ambos (Functions + Migrations)" -ForegroundColor White
Write-Host "4. Apenas verificar status (não migrar)" -ForegroundColor White
Write-Host "5. Cancelar" -ForegroundColor White
Write-Host ""

$opcao = Read-Host "Digite o número da opção"

switch ($opcao) {
    "1" {
        Write-Host ""
        Write-Host "==========================================="
        Write-Host "MIGRANDO EDGE FUNCTIONS"
        Write-Host "==========================================="
        Write-Host ""
        Write-Host "Como deseja fazer o deploy?" -ForegroundColor Cyan
        Write-Host "1. Deploy seletivo (especificar functions)" -ForegroundColor White
        Write-Host "2. Deploy de todas as functions" -ForegroundColor White
        Write-Host "3. Cancelar" -ForegroundColor White
        Write-Host ""
        
        $deployOpcao = Read-Host "Digite o número da opção"
        
        switch ($deployOpcao) {
            "1" {
                Write-Host ""
                Write-Host "Digite os nomes das functions separados por vírgula:" -ForegroundColor Cyan
                Write-Host "Exemplo: function1,function2,function3" -ForegroundColor Gray
                $functions = Read-Host "Functions"
                
                if ($functions) {
                    Write-Host ""
                    Write-Host "⚠️  Confirmar deploy para PRODUÇÃO?" -ForegroundColor Yellow
                    Write-Host "Functions: $functions" -ForegroundColor Cyan
                    $confirm = Read-Host "Digite 'SIM' para confirmar"
                    
                    if ($confirm -eq "SIM") {
                        & .\deploy_functions_to_main.ps1 -Functions $functions
                    } else {
                        Write-Host "Operação cancelada." -ForegroundColor Yellow
                    }
                }
            }
            "2" {
                Write-Host ""
                Write-Host "⚠️  ATENÇÃO: Isso fará deploy de TODAS as functions para PRODUÇÃO!" -ForegroundColor Red
                $confirm = Read-Host "Digite 'SIM' para confirmar"
                
                if ($confirm -eq "SIM") {
                    & .\deploy_functions_to_main.ps1
                } else {
                    Write-Host "Operação cancelada." -ForegroundColor Yellow
                }
            }
            "3" {
                Write-Host "Operação cancelada." -ForegroundColor Yellow
                exit 0
            }
            default {
                Write-Host "Opção inválida." -ForegroundColor Red
                exit 1
            }
        }
    }
    "2" {
        Write-Host ""
        Write-Host "==========================================="
        Write-Host "MIGRANDO MIGRATIONS"
        Write-Host "==========================================="
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE: Migrations devem ser aplicadas com cuidado!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Opções:" -ForegroundColor Cyan
        Write-Host "1. Aplicar via CLI (supabase db push)" -ForegroundColor White
        Write-Host "2. Aplicar via Dashboard (recomendado para produção)" -ForegroundColor White
        Write-Host "3. Cancelar" -ForegroundColor White
        Write-Host ""
        
        $migrationOpcao = Read-Host "Digite o número da opção"
        
        switch ($migrationOpcao) {
            "1" {
                Write-Host ""
                Write-Host "⚠️  Confirmar aplicação de migrations via CLI?" -ForegroundColor Yellow
                Write-Host "Isso irá conectar ao projeto main e aplicar migrations pendentes." -ForegroundColor Yellow
                $confirm = Read-Host "Digite 'SIM' para confirmar"
                
                if ($confirm -eq "SIM") {
                    Write-Host ""
                    Write-Host "Conectando ao projeto main..." -ForegroundColor Cyan
                    supabase link --project-ref $mainProjectId
                    
                    Write-Host ""
                    Write-Host "Verificando diferenças..." -ForegroundColor Cyan
                    supabase db diff
                    
                    Write-Host ""
                    Write-Host "Aplicando migrations..." -ForegroundColor Cyan
                    supabase db push
                    
                    Write-Host ""
                    Write-Host "✅ Migrations aplicadas!" -ForegroundColor Green
                } else {
                    Write-Host "Operação cancelada." -ForegroundColor Yellow
                }
            }
            "2" {
                Write-Host ""
                Write-Host "📋 INSTRUÇÕES PARA APLICAR VIA DASHBOARD:" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "1. Acesse: https://supabase.com/dashboard/project/$mainProjectId" -ForegroundColor White
                Write-Host "2. Vá em: SQL Editor (menu lateral)" -ForegroundColor White
                Write-Host "3. Clique em: New query" -ForegroundColor White
                Write-Host "4. Abra o arquivo de migration em: supabase/migrations/" -ForegroundColor White
                Write-Host "5. Cole o conteúdo no editor" -ForegroundColor White
                Write-Host "6. Revise cuidadosamente" -ForegroundColor Yellow
                Write-Host "7. Execute (Run ou Ctrl+Enter)" -ForegroundColor White
                Write-Host ""
                Write-Host "⚠️  Lembre-se de fazer backup se necessário!" -ForegroundColor Yellow
            }
            "3" {
                Write-Host "Operação cancelada." -ForegroundColor Yellow
                exit 0
            }
            default {
                Write-Host "Opção inválida." -ForegroundColor Red
                exit 1
            }
        }
    }
    "3" {
        Write-Host ""
        Write-Host "==========================================="
        Write-Host "MIGRANDO FUNCTIONS + MIGRATIONS"
        Write-Host "==========================================="
        Write-Host ""
        Write-Host "⚠️  ATENÇÃO: Isso irá migrar TUDO para PRODUÇÃO!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Ordem recomendada:" -ForegroundColor Cyan
        Write-Host "1. Aplicar migrations primeiro" -ForegroundColor White
        Write-Host "2. Depois fazer deploy das functions" -ForegroundColor White
        Write-Host ""
        $confirm = Read-Host "Digite 'SIM' para continuar"
        
        if ($confirm -eq "SIM") {
            # Migrations primeiro
            Write-Host ""
            Write-Host "==========================================="
            Write-Host "PASSO 1: APLICANDO MIGRATIONS"
            Write-Host "==========================================="
            Write-Host ""
            Write-Host "⚠️  Aplicar migrations via CLI ou Dashboard?" -ForegroundColor Yellow
            Write-Host "1. CLI (automático)" -ForegroundColor White
            Write-Host "2. Dashboard (manual - mais seguro)" -ForegroundColor White
            $migrationOpcao = Read-Host "Opção"
            
            if ($migrationOpcao -eq "1") {
                supabase link --project-ref $mainProjectId
                supabase db push
            } else {
                Write-Host ""
                Write-Host "📋 Aplique as migrations via Dashboard primeiro:" -ForegroundColor Cyan
                Write-Host "https://supabase.com/dashboard/project/$mainProjectId" -ForegroundColor White
                Write-Host ""
                Read-Host "Pressione Enter após aplicar as migrations"
            }
            
            # Functions depois
            Write-Host ""
            Write-Host "==========================================="
            Write-Host "PASSO 2: DEPLOY DAS FUNCTIONS"
            Write-Host "==========================================="
            Write-Host ""
            Write-Host "Fazer deploy de todas as functions?" -ForegroundColor Cyan
            $deployAll = Read-Host "Digite 'SIM' para todas, ou 'NAO' para seletivo"
            
            if ($deployAll -eq "SIM") {
                & .\deploy_functions_to_main.ps1
            } else {
                Write-Host ""
                Write-Host "Digite os nomes das functions separados por vírgula:" -ForegroundColor Cyan
                $functions = Read-Host "Functions"
                if ($functions) {
                    & .\deploy_functions_to_main.ps1 -Functions $functions
                }
            }
        } else {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
            exit 0
        }
    }
    "4" {
        Write-Host ""
        Write-Host "==========================================="
        Write-Host "VERIFICAÇÃO DE STATUS"
        Write-Host "==========================================="
        Write-Host ""
        Write-Host "Executando comparação completa..." -ForegroundColor Cyan
        & .\comparar_main_develop.ps1
        Write-Host ""
        Write-Host "✅ Verificação concluída!" -ForegroundColor Green
        exit 0
    }
    "5" {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Opção inválida." -ForegroundColor Red
        exit 1
    }
}

# Passo 3: Verificação final
Write-Host ""
Write-Host "==========================================="
Write-Host "PASSO 3: VERIFICAÇÃO FINAL"
Write-Host "==========================================="
Write-Host ""

Write-Host "Deseja executar verificação final?" -ForegroundColor Cyan
$verificar = Read-Host "Digite 'SIM' para verificar"

if ($verificar -eq "SIM") {
    Write-Host ""
    Write-Host "Executando comparação..." -ForegroundColor Cyan
    & .\comparar_main_develop.ps1
    Write-Host ""
    Write-Host "✅ Verificação concluída!" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================="
Write-Host "PRÓXIMOS PASSOS"
Write-Host "==========================================="
Write-Host ""
Write-Host "1. Verificar Dashboard Main:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/$mainProjectId" -ForegroundColor White
Write-Host ""
Write-Host "2. Testar endpoints em produção" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Monitorar logs por alguns minutos" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Validar que tudo está funcionando" -ForegroundColor Cyan
Write-Host ""
Write-Host "==========================================="
Write-Host "✅ MIGRAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "==========================================="

