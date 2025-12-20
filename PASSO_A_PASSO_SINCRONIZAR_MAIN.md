# 🔄 Passo a Passo: Sincronizar Histórico da MAIN

## 🎯 Objetivo

Sincronizar o histórico de migrations da MAIN, marcando todas as migrations do GitHub como aplicadas (já que o banco está correto).

---

## 📋 Migrations Encontradas no GitHub

Baseado no seu repositório, estas são as migrations que estão no GitHub:

1. `20240101000000_initial_schema.sql`
2. `20250127_simplify_avatar_system.sql`
3. `20251125_120000_add_bank_history_balance_adjust_triggers.sql`
4. `20251126_120000_add_payables_triggers_bank_history.sql`
5. `20251127_120000_create_bank_operation_history.sql`
6. `20251128_120000_create_get_bank_statement_rpc.sql`
7. `20251212_120000_allow_public_read_tenant_invites_by_token.sql`
8. `20251213_120000_remove_tenant_invites_updated_at_trigger.sql`
9. `20251213_120001_add_api_key_encryption.sql`
10. `20251213_120002_update_functions_to_use_vault.sql`
11. `20251214_120000_add_focusnfe_integration.sql`
12. `20251215161709_update_default_templates_tags.sql`
13. `20251220111401_functions_triggers_policies.sql`

**Total: 13 migrations**

---

## ✅ Passo a Passo

### Passo 1: Executar Script de Sincronização

```powershell
# Executar script
.\sincronizar_historico_migrations.ps1 -ProjectRef "wyehpiutzvwplllumgdk" -ProjectName "main"
```

### Passo 2: Escolher Opção no Menu

Quando o script perguntar, escolha:

**Opção 1: Marcar todas as migrations do GitHub como aplicadas**

Isso vai marcar todas as 13 migrations como aplicadas no histórico do Supabase.

### Passo 3: Confirmar

Quando pedir confirmação, digite: **SIM**

### Passo 4: Aguardar Conclusão

O script vai:
1. Conectar ao projeto MAIN
2. Marcar cada migration como aplicada
3. Mostrar progresso de cada uma

---

## 🔍 Verificação Após Sincronização

### Verificar no Supabase

```sql
-- Executar no SQL Editor do Supabase Dashboard
SELECT version, name 
FROM supabase_migrations.schema_migrations 
ORDER BY version;
```

**Deve mostrar todas as 13 migrations listadas acima.**

### Verificar via CLI

```bash
# Conectar ao projeto
supabase link --project-ref wyehpiutzvwplllumgdk

# Listar migrations
supabase migration list
```

**Deve mostrar todas as migrations como aplicadas.**

---

## 🎯 Comandos Diretos (Alternativa)

Se preferir fazer manualmente via CLI:

```bash
# 1. Conectar ao projeto
supabase link --project-ref wyehpiutzvwplllumgdk

# 2. Marcar cada migration como aplicada
supabase migration repair --status applied 20240101000000
supabase migration repair --status applied 20250127
supabase migration repair --status applied 20251125
supabase migration repair --status applied 20251126
supabase migration repair --status applied 20251127
supabase migration repair --status applied 20251128
supabase migration repair --status applied 20251212
supabase migration repair --status applied 20251213
supabase migration repair --status applied 20251213120001
supabase migration repair --status applied 20251213120002
supabase migration repair --status applied 20251214
supabase migration repair --status applied 20251215161709
supabase migration repair --status applied 20251220111401
```

**Nota:** Algumas migrations podem ter timestamps diferentes. O script interativo é mais seguro porque detecta automaticamente.

---

## ⚠️ Importante

### Antes de Executar

- ✅ Certifique-se de que o banco MAIN está realmente correto
- ✅ Todas essas migrations já estão aplicadas no banco
- ✅ Você tem acesso ao projeto MAIN

### Durante a Execução

- ✅ O script vai conectar ao projeto (pode pedir autenticação)
- ✅ Vai marcar migrations como aplicadas (não vai reaplicar)
- ✅ Não vai modificar o banco, apenas o histórico

### Após a Execução

- ✅ Histórico estará sincronizado
- ✅ Pronto para usar integração nativa
- ✅ Novas migrations serão aplicadas automaticamente

---

## 🚨 Troubleshooting

### Erro: "Supabase CLI não encontrado"

**Solução:**
```bash
# Instalar Supabase CLI
npm install -g supabase
```

### Erro: "Falha ao conectar ao projeto"

**Solução:**
```bash
# Fazer login primeiro
supabase login
```

### Erro: "Migration não encontrada"

**Solução:**
- Verificar se o nome da migration está correto
- O script detecta automaticamente, mas se falhar, use o comando manual

---

## ✅ Checklist

- [ ] Script executado
- [ ] Opção 1 escolhida (marcar todas como aplicadas)
- [ ] Confirmação dada (SIM)
- [ ] Todas as migrations marcadas com sucesso
- [ ] Verificação no Supabase executada
- [ ] Histórico sincronizado

---

## 🎯 Próximos Passos

Após sincronizar:

1. **Configurar integração nativa** no Dashboard
2. **Testar** criando uma nova migration
3. **Fazer merge** para main e verificar que aplica automaticamente

---

**Pronto para executar!** 🚀

Execute o script e siga as instruções na tela.

