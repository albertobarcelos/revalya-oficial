# Script Simples: Marcar Todas as Migrations como Reverted
# Execute este script após fazer login no Supabase CLI

$PROJECT_REF = "ivaeoagtrvjsksebnqwr"

Write-Host "🔧 Marcando todas as migrations como 'reverted'..." -ForegroundColor Cyan

# Linkar ao projeto
Write-Host "🔗 Linkando ao projeto develop..." -ForegroundColor Yellow
supabase link --project-ref $PROJECT_REF

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao linkar. Verifique se está logado: supabase login" -ForegroundColor Red
    exit 1
}

# Obter lista de migrations do banco via SQL
Write-Host "📋 Obtendo lista de migrations do banco..." -ForegroundColor Yellow

# Criar arquivo SQL temporário para obter versões
$sqlFile = [System.IO.Path]::GetTempFileName() + ".sql"
@"
SELECT string_agg(version::text, ' ' ORDER BY version) as versions
FROM supabase_migrations.schema_migrations
WHERE version IS NOT NULL;
"@ | Out-File -FilePath $sqlFile -Encoding UTF8

# Executar SQL e obter versões
# Nota: Isso requer acesso ao banco. Vamos usar uma abordagem diferente.

Write-Host ""
Write-Host "💡 SOLUÇÃO ALTERNATIVA:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Execute no SQL Editor do Supabase (projeto develop):" -ForegroundColor Yellow
Write-Host ""
Write-Host "   SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;" -ForegroundColor White
Write-Host ""
Write-Host "2. Copie todas as versões e execute:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   supabase migration repair --status reverted [COLE_AS_VERSOES_AQUI]" -ForegroundColor White
Write-Host ""
Write-Host "OU use o script SQL direto no banco para deletar todas:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   DELETE FROM supabase_migrations.schema_migrations;" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Deletar todas as migrations permite que todas sejam reaplicadas." -ForegroundColor Red
Write-Host "   Use apenas se tiver certeza de que as migrations locais estão corretas." -ForegroundColor Red

Remove-Item $sqlFile -ErrorAction SilentlyContinue

