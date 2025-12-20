# 🚀 Passo a Passo: Copiar Supabase de Produção para Local

## 📋 Pré-requisitos a Instalar

Antes de começar, você precisa instalar:

### 1. PostgreSQL (para pg_dump e psql)

**Opção A: Instalação Completa (Recomendada)**
1. Baixe o instalador: https://www.postgresql.org/download/windows/
2. Execute o instalador
3. Durante a instalação, marque a opção "Command Line Tools"
4. Adicione ao PATH: `C:\Program Files\PostgreSQL\[versão]\bin`

**Opção B: Apenas Ferramentas de Linha de Comando**
1. Baixe o ZIP: https://www.enterprisedb.com/download-postgresql-binaries
2. Extraia em `C:\PostgreSQL\bin`
3. Adicione ao PATH do Windows

**Verificar instalação:**
```powershell
pg_dump --version
psql --version
```

### 2. Supabase CLI

**Opção A: Via Scoop (Recomendada)**
```powershell
# Instalar Scoop (se não tiver)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Opção B: Via Chocolatey**
```powershell
choco install supabase
```

**Opção C: Download Manual**
1. Acesse: https://github.com/supabase/cli/releases
2. Baixe `supabase_windows_amd64.zip`
3. Extraia e adicione ao PATH

**Verificar instalação:**
```powershell
supabase --version
```

### 3. Docker Desktop
✅ Já está instalado!

---

## 🔑 Passo 1: Obter Credenciais de Produção

1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk
2. Vá em **Settings > Database**
3. Na seção "Connection string", copie a string do **Session pooler**
4. Você precisará da **senha do banco**. Se não souber:
   - Clique em "Reset database password"
   - Anote a nova senha (ela será mostrada apenas uma vez)

**Formato da connection string:**
```
postgresql://postgres.wyehpiutzvwplllumgdk:[SENHA]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

---

## 📦 Passo 2: Preparar Ambiente Local

```powershell
# Navegar para o diretório do projeto
cd D:\DESENVOLVIMENTO\revalya-oficial

# Verificar se Supabase local está rodando
supabase status

# Se não estiver rodando, iniciar
supabase start
```

Aguarde alguns segundos até todos os serviços iniciarem.

---

## 💾 Passo 3: Fazer Dump do Banco de Produção

Execute este comando (substitua `[SENHA]` pela senha real):

```powershell
# Definir variáveis
$PROD_DB_URL = "postgresql://postgres.wyehpiutzvwplllumgdk:[SENHA]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
$DUMP_FILE = "dump_producao_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Fazer dump
pg_dump "$PROD_DB_URL" `
  --clean `
  --if-exists `
  --quote-all-identifiers `
  --no-owner `
  --no-privileges `
  --verbose `
  > $DUMP_FILE

Write-Host "✅ Dump criado: $DUMP_FILE"
```

**⏱️ Tempo estimado:** Depende do tamanho do banco
- Banco pequeno (<1GB): 1-5 minutos
- Banco médio (1-5GB): 5-15 minutos
- Banco grande (>5GB): 15-60 minutos

---

## 🔄 Passo 4: Verificar Dump Criado

```powershell
# Verificar tamanho do arquivo
Get-Item $DUMP_FILE | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}

# Ver primeiras linhas (opcional)
Get-Content $DUMP_FILE -Head 20
```

---

## 🏠 Passo 5: Restaurar no Banco Local

```powershell
# Connection string do banco local
$LOCAL_DB_URL = "postgresql://postgres:postgres@localhost:54322/postgres"

# Restaurar dump
Write-Host "🔄 Restaurando dump (isso pode demorar alguns minutos)..." -ForegroundColor Yellow
psql -d "$LOCAL_DB_URL" -f $DUMP_FILE

Write-Host "✅ Dump restaurado!" -ForegroundColor Green
```

**⚠️ Nota:** Alguns avisos podem aparecer (ex: "already exists"). Isso é normal.

---

## 🔐 Passo 6: Ajustar Permissões

```powershell
# Conectar e ajustar permissões
$permissionsSQL = @"
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
"@

$permissionsSQL | psql -d "$LOCAL_DB_URL"

Write-Host "✅ Permissões ajustadas!" -ForegroundColor Green
```

---

## ✅ Passo 7: Verificar Restauração

```powershell
# Conectar ao banco local
psql "$LOCAL_DB_URL"

# Dentro do psql, execute:
\dt                    # Listar tabelas
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM charges;
SELECT COUNT(*) FROM users;
\q                     # Sair
```

Ou use o script de verificação:

```powershell
# Verificar algumas tabelas principais
$tables = @("tenants", "charges", "users", "contracts", "payables")

foreach ($table in $tables) {
    $count = psql -d "$LOCAL_DB_URL" -t -c "SELECT COUNT(*) FROM public.$table;"
    Write-Host "$table : $($count.Trim()) registros" -ForegroundColor Cyan
}
```

---

## 🎯 Passo 8: Usar o Banco Local

Agora você pode:

1. **Acessar o Studio local:**
   ```
   http://localhost:54323
   ```

2. **Conectar via aplicação:**
   - URL: `http://localhost:54321`
   - Anon Key: (veja em `supabase status`)
   - Service Role Key: (veja em `supabase status`)

3. **Verificar status:**
   ```powershell
   supabase status
   ```

---

## 🛠️ Troubleshooting

### Erro: "pg_dump não encontrado"
- Verifique se PostgreSQL está instalado
- Verifique se `C:\Program Files\PostgreSQL\[versão]\bin` está no PATH
- Reinicie o terminal após adicionar ao PATH

### Erro: "Não foi possível conectar"
- Verifique se a senha está correta
- Verifique se o projeto não está pausado
- Tente usar "Direct connection" ao invés de "Session pooler"

### Erro: "permission denied" durante restore
- Execute o Passo 6 (Ajustar Permissões)
- Se persistir, execute:
  ```sql
  ALTER DATABASE postgres OWNER TO postgres;
  ```

### Erro: "relation already exists"
- Isso é normal se você já tem o schema local
- O dump vai tentar recriar tudo
- Se quiser apenas dados, use `--data-only` no pg_dump

### Banco muito grande
- Use `--jobs=4` para paralelizar (se disponível)
- Considere fazer dump apenas de schemas específicos
- Use `--format=directory` para dumps grandes

---

## 📝 Script Completo (Copiar e Colar)

```powershell
# =============================================================================
# CONFIGURAÇÕES - AJUSTE AQUI
# =============================================================================
$PROD_PASSWORD = "SUA_SENHA_AQUI"  # ⚠️ SUBSTITUA PELA SENHA REAL
$PROJECT_REF = "wyehpiutzvwplllumgdk"

# =============================================================================
# CONNECTION STRINGS
# =============================================================================
$PROD_DB_URL = "postgresql://postgres.$PROJECT_REF`:$PROD_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
$LOCAL_DB_URL = "postgresql://postgres:postgres@localhost:54322/postgres"
$DUMP_FILE = "dump_producao_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# =============================================================================
# PASSO 1: VERIFICAR SUPABASE LOCAL
# =============================================================================
Write-Host "`n🔄 Verificando Supabase local..." -ForegroundColor Yellow
$status = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Supabase local não está rodando. Iniciando..." -ForegroundColor Yellow
    supabase start
    Start-Sleep -Seconds 10
} else {
    Write-Host "✅ Supabase local está rodando" -ForegroundColor Green
}

# =============================================================================
# PASSO 2: FAZER DUMP
# =============================================================================
Write-Host "`n🔄 Fazendo dump do banco de produção..." -ForegroundColor Yellow
Write-Host "⏱️  Isso pode demorar alguns minutos dependendo do tamanho do banco..." -ForegroundColor Cyan

pg_dump "$PROD_DB_URL" `
  --clean `
  --if-exists `
  --quote-all-identifiers `
  --no-owner `
  --no-privileges `
  --verbose `
  > $DUMP_FILE

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $DUMP_FILE).Length / 1MB
    Write-Host "✅ Dump criado: $DUMP_FILE ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao criar dump!" -ForegroundColor Red
    exit 1
}

# =============================================================================
# PASSO 3: RESTAURAR NO LOCAL
# =============================================================================
Write-Host "`n🔄 Restaurando dump no banco local..." -ForegroundColor Yellow
Write-Host "⏱️  Isso pode demorar alguns minutos..." -ForegroundColor Cyan

psql -d "$LOCAL_DB_URL" -f $DUMP_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dump restaurado!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Alguns avisos podem ter aparecido, mas o restore pode ter funcionado." -ForegroundColor Yellow
}

# =============================================================================
# PASSO 4: AJUSTAR PERMISSÕES
# =============================================================================
Write-Host "`n🔄 Ajustando permissões..." -ForegroundColor Yellow

$permissionsSQL = @"
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
"@

$permissionsSQL | psql -d "$LOCAL_DB_URL" | Out-Null
Write-Host "✅ Permissões ajustadas!" -ForegroundColor Green

# =============================================================================
# PASSO 5: VERIFICAÇÃO
# =============================================================================
Write-Host "`n🔄 Verificando restauração..." -ForegroundColor Yellow

$tables = @("tenants", "charges", "users")
foreach ($table in $tables) {
    $count = psql -d "$LOCAL_DB_URL" -t -A -c "SELECT COUNT(*) FROM public.$table;" 2>&1
    if ($count -match '^\d+$') {
        Write-Host "  ✅ $table : $($count.Trim()) registros" -ForegroundColor Cyan
    }
}

# =============================================================================
# RESUMO
# =============================================================================
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ Processo Concluído!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Arquivo de dump: $DUMP_FILE" -ForegroundColor Cyan
Write-Host "🔗 Banco local: $LOCAL_DB_URL" -ForegroundColor Cyan
Write-Host "🌐 Studio local: http://localhost:54323" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para conectar ao banco:"
Write-Host "  psql `"$LOCAL_DB_URL`"" -ForegroundColor Yellow
Write-Host ""
```

---

## 🎉 Pronto!

Agora você tem uma cópia exata do banco de produção rodando localmente!

**Próximos passos:**
- Acesse o Studio em http://localhost:54323
- Teste sua aplicação conectando ao Supabase local
- Use os dados para desenvolvimento e testes

**Lembre-se:**
- O arquivo de dump contém dados reais - mantenha seguro
- Não commite o dump no Git (já está no .gitignore)
- Considere anonimizar dados sensíveis se necessário
