# 🚀 Comandos Essenciais: Supabase Local

## 📦 Atualizar Supabase CLI

### Se instalado via Scoop (Recomendado):
```powershell
scoop update supabase
```

### Se instalado via Download Manual:
1. Baixe a versão mais recente: https://github.com/supabase/cli/releases
2. Substitua o arquivo `supabase.exe` na pasta do PATH

### Verificar versão:
```powershell
supabase --version
```

---

## 🏁 Iniciar Supabase Local

### Comando básico:
```powershell
supabase start
```

### Com versão específica (se necessário):
```powershell
npx supabase@latest start
```

### Com debug (para troubleshooting):
```powershell
supabase start --debug
```

---

## 🛑 Parar Supabase Local

```powershell
supabase stop
```

---

## 📊 Ver Status

```powershell
supabase status
```

Este comando mostra:
- URLs de todos os serviços (API, Studio, Database, etc.)
- Chaves de acesso (Publishable key, Secret key)
- Status de cada serviço

---

## 🔄 Reiniciar Supabase Local

```powershell
supabase stop
supabase start
```

---

## 🗄️ Resetar Banco de Dados (Limpar tudo)

```powershell
supabase db reset
```

**⚠️ ATENÇÃO:** Isso apaga TODOS os dados locais e recria o banco do zero aplicando as migrações.

---

## 📥 Restaurar Dados de Produção

Após iniciar o Supabase local, para restaurar os dados:

```powershell
# 1. Copiar dump para o container
docker cp dump_producao.sql supabase_db_wyehpiutzvwplllumgdk:/tmp/dump.sql

# 2. Restaurar schema
docker exec supabase_db_wyehpiutzvwplllumgdk psql -U postgres -d postgres -f /tmp/dump.sql

# 3. Copiar e restaurar dados
docker cp dump_dados.sql supabase_db_wyehpiutzvwplllumgdk:/tmp/dump_dados.sql
docker exec supabase_db_wyehpiutzvwplllumgdk psql -U postgres -d postgres -f /tmp/dump_dados.sql
```

---

## 🔗 URLs Importantes (Após `supabase start`)

- **API URL:** http://127.0.0.1:54321
- **Studio (Dashboard):** http://127.0.0.1:54323
- **Database:** postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **GraphQL:** http://127.0.0.1:54321/graphql/v1
- **Storage:** http://127.0.0.1:54321/storage/v1
- **Mailpit (Emails):** http://127.0.0.1:54324

---

## 🧪 Testar Edge Functions Localmente

```powershell
# Servir uma função específica
supabase functions serve nome-da-funcao

# Servir todas as funções
supabase functions serve

# Com hot reload (desenvolvimento)
supabase functions serve --no-verify-jwt
```

---

## 📝 Comandos Úteis Adicionais

### Ver logs:
```powershell
# Logs do banco
docker logs supabase_db_wyehpiutzvwplllumgdk

# Logs de uma função
supabase functions logs nome-da-funcao
```

### Gerar tipos TypeScript:
```powershell
supabase gen types typescript --local > src/types/database.ts
```

### Aplicar migrações:
```powershell
supabase db push
```

### Criar nova migração:
```powershell
supabase migration new nome_da_migracao
```

### Ver diferenças no schema:
```powershell
supabase db diff
```

---

## 🔧 Troubleshooting

### Limpar cache e reiniciar:
```powershell
supabase stop
Remove-Item -Recurse -Force supabase\.temp -ErrorAction SilentlyContinue
supabase start
```

### Ver containers Docker:
```powershell
docker ps --filter "name=supabase"
```

### Limpar tudo e começar do zero:
```powershell
supabase stop
docker system prune -af --volumes
supabase start
```

---

## 📚 Fluxo Completo Recomendado

```powershell
# 1. Atualizar CLI (se necessário)
scoop update supabase

# 2. Verificar status
supabase status

# 3. Se não estiver rodando, iniciar
supabase start

# 4. Verificar se está tudo OK
supabase status

# 5. Acessar Studio
# Abra: http://127.0.0.1:54323
```

---

## ✅ Checklist Rápido

- [ ] Supabase CLI atualizado (`supabase --version`)
- [ ] Docker Desktop rodando
- [ ] Supabase local iniciado (`supabase start`)
- [ ] Todos os serviços saudáveis (`supabase status`)
- [ ] Studio acessível (http://127.0.0.1:54323)
- [ ] Dados restaurados (se necessário)

---

**Última atualização:** Dezembro 2024



