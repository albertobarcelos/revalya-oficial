# 📋 Guia: Copiar Supabase de Produção para Local

Este guia explica como criar uma **cópia EXATA** do banco de dados Supabase em produção para o ambiente local.

## 🎯 Objetivo

Ter uma réplica completa do banco de produção localmente para:
- Testar com dados reais (anônimos se necessário)
- Debug de problemas específicos
- Desenvolvimento sem afetar produção
- Análise de dados históricos

## ⚠️ Avisos Importantes

1. **Dados Sensíveis**: Se o banco contém dados sensíveis, considere anonimizar antes de usar localmente
2. **Tamanho do Banco**: Bancos muito grandes (>10GB) podem demorar para fazer dump/restore
3. **Storage**: Backups do Supabase não incluem arquivos do Storage, apenas metadados
4. **Senhas de Roles**: Senhas de roles customizadas não são incluídas em backups lógicos

---

## 📦 Método 1: Usando pg_dump (Recomendado)

Este é o método mais direto e confiável para copiar o banco completo.

### Pré-requisitos

1. **PostgreSQL instalado** (inclui `pg_dump` e `psql`)
   - Windows: [Download PostgreSQL](https://www.postgresql.org/download/windows/)
   - Mac: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql-client`

2. **Credenciais de Produção**
   - Connection string do banco de produção
   - Senha do banco (se não tiver, reset em Settings > Database)

### Passo 1: Obter Connection String de Produção

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk)
2. Vá em **Settings > Database**
3. Na seção "Connection string", copie a string do **Session pooler** ou **Direct connection**
4. Substitua `[YOUR-PASSWORD]` pela senha real do banco

**Exemplo de connection string:**
```
postgresql://postgres.wyehpiutzvwplllumgdk:[SENHA]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### Passo 2: Fazer Dump do Banco de Produção

Execute no terminal (PowerShell no Windows):

```powershell
# Definir variáveis de ambiente
$PROD_DB_URL = "postgresql://postgres.wyehpiutzvwplllumgdk:[SENHA]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
$DUMP_FILE = "dump_producao_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Fazer dump completo
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

**Opções do pg_dump:**
- `--clean`: Remove objetos antes de criar (DROP IF EXISTS)
- `--if-exists`: Usa IF EXISTS nos DROPs
- `--quote-all-identifiers`: Coloca aspas em todos os identificadores
- `--no-owner`: Não inclui comandos de OWNER (evita problemas de permissão)
- `--no-privileges`: Não inclui comandos GRANT/REVOKE
- `--verbose`: Mostra progresso

**Para bancos grandes, adicione:**
```powershell
pg_dump "$PROD_DB_URL" `
  --clean `
  --if-exists `
  --quote-all-identifiers `
  --no-owner `
  --no-privileges `
  --jobs=4 `
  --format=directory `
  --file=dump_producao
```

### Passo 3: Iniciar Supabase Local

```powershell
# Garantir que o Supabase local está rodando
supabase start

# Verificar se está funcionando
supabase status
```

### Passo 4: Restaurar no Banco Local

```powershell
# Connection string do banco local
$LOCAL_DB_URL = "postgresql://postgres:postgres@localhost:54322/postgres"

# Restaurar o dump
psql -d "$LOCAL_DB_URL" -f $DUMP_FILE

Write-Host "✅ Banco restaurado localmente!"
```

**Se o dump for muito grande, use:**
```powershell
# Com compressão
psql -d "$LOCAL_DB_URL" < $DUMP_FILE
```

### Passo 5: Verificar Restauração

```powershell
# Conectar ao banco local
psql "$LOCAL_DB_URL"

# Verificar algumas tabelas
\dt
SELECT COUNT(*) FROM tenants;
SELECT COUNT(*) FROM charges;
\q
```

---

## 📥 Método 2: Baixar Backup do Dashboard

Se seu projeto tem backups lógicos disponíveis no dashboard.

### Passo 1: Baixar Backup

1. Acesse [Database Backups > Scheduled backups](https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/database/backups/scheduled)
2. Selecione um backup recente
3. Clique em **Download**
4. Anote a versão do Postgres (ex: `15.6.1.115`)

### Passo 2: Restaurar Backup Localmente

```powershell
# Criar diretório temporário se não existir
if (-not (Test-Path "supabase\.temp")) {
    New-Item -ItemType Directory -Path "supabase\.temp" -Force
}

# Salvar versão do Postgres
$POSTGRES_VERSION = "15.6.1.115"  # Substitua pela versão do seu backup
echo $POSTGRES_VERSION > supabase\.temp\postgres-version

# Restaurar backup
supabase db start --from-backup "caminho/para/backup.backup"

Write-Host "✅ Backup restaurado!"
```

### Passo 3: Reiniciar Stack Completo

```powershell
# Parar tudo
supabase stop

# Iniciar novamente (vai usar o banco restaurado)
supabase start
```

**⚠️ Limitação**: Este método só funciona se:
- Seu projeto tem backups lógicos (não físicos)
- A versão do Postgres é >= 15.1.0.55

---

## 🔧 Método 3: Usando Supabase CLI

O Supabase CLI tem comandos específicos para dump/restore.

### Passo 1: Fazer Dump com CLI

```powershell
# Linkar ao projeto de produção (se ainda não estiver)
supabase link --project-ref wyehpiutzvwplllumgdk

# Fazer dump
supabase db dump -f dump_producao.sql

Write-Host "✅ Dump criado: dump_producao.sql"
```

### Passo 2: Restaurar Localmente

```powershell
# Garantir que Supabase local está rodando
supabase start

# Restaurar dump
supabase db reset  # Isso reseta o banco local primeiro
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f dump_producao.sql

# OU usar o comando do CLI (se disponível)
supabase db load dump_producao.sql
```

---

## 🎯 Método 4: Copiar Apenas Schema (Sem Dados)

Se você só precisa da estrutura, não dos dados:

```powershell
# Dump apenas do schema
pg_dump "$PROD_DB_URL" `
  --schema-only `
  --clean `
  --if-exists `
  --no-owner `
  --no-privileges `
  > schema_only.sql

# Restaurar schema localmente
psql -d "$LOCAL_DB_URL" -f schema_only.sql
```

---

## 🎯 Método 5: Copiar Apenas Dados (Sem Schema)

Se você já tem o schema e só precisa dos dados:

```powershell
# Dump apenas dos dados
pg_dump "$PROD_DB_URL" `
  --data-only `
  --quote-all-identifiers `
  --no-owner `
  --no-privileges `
  > data_only.sql

# Restaurar dados localmente
psql -d "$LOCAL_DB_URL" -f data_only.sql
```

---

## 🔍 Verificação e Troubleshooting

### Verificar se a Cópia Está Completa

```sql
-- Conectar ao banco local
psql "postgresql://postgres:postgres@localhost:54322/postgres"

-- Comparar número de registros
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;
```

### Problemas Comuns

#### 1. Erro de Permissão

```sql
-- Executar no banco local após restore
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

#### 2. Erro de search_path

Se encontrar erros relacionados a `search_path`, certifique-se de usar nomes qualificados com schema:

```sql
-- ❌ Ruim
SELECT * FROM my_table;

-- ✅ Bom
SELECT * FROM public.my_table;
```

#### 3. Constraints Inválidas

Algumas constraints podem falhar durante o restore. Verifique logs e ajuste se necessário.

#### 4. Views Circulares

Views que referenciam a si mesmas causam erro. Remova essas views antes do restore.

---

## 📊 Comparação de Métodos

| Método | Velocidade | Complexidade | Dados Completos | Recomendado Para |
|--------|-----------|--------------|-----------------|------------------|
| pg_dump | ⭐⭐⭐⭐ | ⭐⭐ | ✅ Sim | **Uso geral |
| Dashboard Backup | ⭐⭐⭐ | ⭐ | ⚠️ Depende | Projetos com backups lógicos |
| Supabase CLI | ⭐⭐⭐ | ⭐⭐ | ✅ Sim | Usuários do CLI |
| Schema Only | ⭐⭐⭐⭐⭐ | ⭐ | ❌ Não | Estrutura apenas |
| Data Only | ⭐⭐⭐⭐ | ⭐ | ⚠️ Parcial | Dados em schema existente |

---

## 🚀 Script Automatizado (PowerShell)

Crie um script para automatizar o processo:

```powershell
# save-dump-producao.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$ProdPassword,
    
    [string]$DumpFile = "dump_producao_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
)

$PROD_DB_URL = "postgresql://postgres.wyehpiutzvwplllumgdk:$ProdPassword@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
$LOCAL_DB_URL = "postgresql://postgres:postgres@localhost:54322/postgres"

Write-Host "🔄 Fazendo dump do banco de produção..." -ForegroundColor Yellow
pg_dump "$PROD_DB_URL" `
  --clean `
  --if-exists `
  --quote-all-identifiers `
  --no-owner `
  --no-privileges `
  --verbose `
  > $DumpFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dump criado: $DumpFile" -ForegroundColor Green
    
    Write-Host "🔄 Iniciando Supabase local..." -ForegroundColor Yellow
    supabase start
    
    Write-Host "🔄 Restaurando no banco local..." -ForegroundColor Yellow
    psql -d "$LOCAL_DB_URL" -f $DumpFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Banco restaurado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao restaurar banco" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Erro ao criar dump" -ForegroundColor Red
}
```

**Uso:**
```powershell
.\save-dump-producao.ps1 -ProdPassword "sua_senha_aqui"
```

---

## 📝 Checklist de Restauração

- [ ] Backup/dump criado com sucesso
- [ ] Supabase local está rodando (`supabase start`)
- [ ] Dump restaurado sem erros
- [ ] Permissões ajustadas (se necessário)
- [ ] Tabelas principais verificadas
- [ ] Contadores de registros conferidos
- [ ] Edge Functions funcionando
- [ ] Storage configurado (se necessário)

---

## 🔐 Segurança

1. **Nunca commitar dumps** no Git (já está no `.gitignore`)
2. **Anonimizar dados sensíveis** antes de usar localmente
3. **Proteger senhas** - use variáveis de ambiente
4. **Limpar dumps** após uso se contiverem dados sensíveis

---

## 📚 Referências

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Restoring Downloaded Backup](https://supabase.com/docs/guides/local-development/restoring-downloaded-backup)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

---

**Última atualização:** Janeiro 2025
