# 🔧 Solução para Problema de Storage no Supabase Local

## Problema

Ao tentar iniciar o Supabase local, você pode encontrar o erro:
```
StorageBackendError: Migration iceberg-catalog-ids not found
```

Este é um bug conhecido em algumas versões do Supabase CLI relacionado às migrações do Storage.

## ✅ Solução 1: Fazer Dump Primeiro (Recomendado)

Você pode fazer o dump do banco de produção **sem precisar iniciar o Supabase local primeiro**:

### Passo 1: Fazer Login Manualmente

```powershell
# Execute em um terminal interativo (não via script)
npx supabase login
```

Siga as instruções na tela para fazer login.

### Passo 2: Linkar ao Projeto

```powershell
npx supabase link --project-ref wyehpiutzvwplllumgdk
```

### Passo 3: Fazer Dump

```powershell
npx supabase db dump --project-ref wyehpiutzvwplllumgdk -f dump_producao.sql
```

### Passo 4: Iniciar Apenas o Banco (sem Storage)

Se o Supabase local não iniciar por causa do Storage, você pode:

1. **Usar PostgreSQL diretamente** para restaurar o dump
2. **Ou aguardar correção** do bug do Storage

## ✅ Solução 2: Usar Versão Específica do CLI

Tente usar uma versão específica do Supabase CLI que não tenha esse bug:

```powershell
npx supabase@2.50.0 start
```

## ✅ Solução 3: Restaurar Direto no PostgreSQL

Se você tiver PostgreSQL instalado, pode restaurar o dump diretamente:

```powershell
# Após fazer o dump (passos 1-3 acima)
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f dump_producao.sql
```

## ✅ Solução 4: Usar Docker Compose Diretamente

Você pode iniciar apenas o PostgreSQL do Supabase sem os outros serviços:

```powershell
# Criar um docker-compose.yml mínimo
# E iniciar apenas o banco
```

## 📝 Nota

O problema do Storage não impede você de:
- ✅ Fazer dump do banco de produção
- ✅ Restaurar o dump localmente
- ✅ Trabalhar com o banco de dados

O Storage é usado apenas para arquivos. Se você não precisa testar uploads de arquivos localmente, pode ignorar esse erro temporariamente.

## 🔗 Links Úteis

- [Issue no GitHub sobre esse bug](https://github.com/supabase/cli/issues)
- [Supabase CLI Releases](https://github.com/supabase/cli/releases)
