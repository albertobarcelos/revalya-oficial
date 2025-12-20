# 📊 Relatório de Comparação: Main vs Develop

**Data:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Main Project ID:** `wyehpiutzvwplllumgdk`  
**Develop Project ID:** `ivaeoagtrvjsksebnqwr`

---

## 🔍 Resumo Executivo

### Edge Functions
- ✅ **Total de functions:** 30 em ambos os ambientes
- ⚠️ **Versões diferentes:** 30/30 (todas as functions têm versões diferentes)
- ⚠️ **verify_jwt diferentes:** 2 functions

### Migrations
- ⚠️ **Main:** 4 migrations
- ⚠️ **Develop:** 9 migrations (5 a mais que o main)

---

## 📋 Detalhes das Inconsistências

### 1. Edge Functions - Versões Diferentes

**Todas as 30 functions têm versões diferentes entre main e develop:**

| Function | Main | Develop | Diferença |
|----------|------|---------|-----------|
| `send-invite-email` | v36 | v1 | -35 versões |
| `asaas-webhook-charges` | v62 | v1 | -61 versões |
| `send-bulk-messages` | v61 | v1 | -60 versões |
| `asaas-import-charges` | v52 | v1 | -51 versões |
| `bulk-insert-helper` | v32 | v1 | -31 versões |
| `asaas-proxy` | v31 | v1 | -30 versões |
| `create-tenant-session-v3` | v29 | v1 | -28 versões |
| `exchange-tenant-code` | v28 | v1 | -27 versões |
| `fetch-asaas-customer` | v27 | v1 | -26 versões |
| `accept-reseller-invite` | v26 | v1 | -25 versões |
| `create-tenant-session-v2` | v26 | v1 | -25 versões |
| `invite-reseller-user` | v26 | v1 | -25 versões |
| `jwt-custom-claims` | v26 | v1 | -25 versões |
| `refresh-tenant-token` | v26 | v1 | -25 versões |
| `refresh-tenant-token-v2` | v26 | v1 | -25 versões |
| `refresh-tenant-token-v3` | v26 | v1 | -25 versões |
| `revoke-tenant-session` | v26 | v1 | -25 versões |
| `validate-reseller-invite-token` | v26 | v1 | -25 versões |
| `assinafy-list-templates` | v12 | v1 | -11 versões |
| `asaas-import-all-charges` | v12 | v1 | -11 versões |
| `recalc-billing-statuses` | v11 | v1 | -10 versões |
| `daily-billing-status-update` | v13 | v1 | -12 versões |
| `sync-charges-from-asaas-api` | v22 | v1 | -21 versões |
| `assinafy-list-contacts` | v7 | v1 | -6 versões |
| `evolution-proxy` | v6 | v1 | -5 versões |
| `assinafy-delete-contact` | v5 | v1 | -4 versões |
| `assinafy-delete-template` | v5 | v1 | -4 versões |
| `assinafy-list-signer-documents` | v5 | v1 | -4 versões |
| `assinafy-update-contact` | v5 | v1 | -4 versões |
| `create-user-admin` | v5 | v1 | -4 versões |

**Análise:**
- O develop tem todas as functions na versão 1 (primeiro deploy)
- O main tem versões muito mais altas (até v62)
- Isso é **esperado** pois o develop acabou de receber o deploy inicial
- As versões do main representam o histórico de evolução em produção

### 2. Edge Functions - verify_jwt Diferentes

**2 functions têm configuração `verify_jwt` diferente:**

| Function | Main | Develop | Impacto |
|----------|------|---------|---------|
| `evolution-proxy` | `false` | `true` | ⚠️ **CRÍTICO** - Pode bloquear requisições |
| `asaas-import-charges` | `false` | `true` | ⚠️ **CRÍTICO** - Pode bloquear requisições |

**Ação Necessária:**
- Ajustar `verify_jwt` no develop para `false` nestas 2 functions
- Ou atualizar o `config.toml` local para refletir essas configurações

### 3. Migrations - Diferenças

**Migrations no Main (4):**
1. `20240101000000_initial_schema`
2. `20250127_simplify_avatar_system`
3. `20251125_120000_add_bank_history_balance_adjust_triggers`
4. `20251126_120000_add_payables_triggers_bank_history`

**Migrations Extras no Develop (5):**
1. `20251127_120000_create_bank_operation_history`
2. `20251128_120000_create_get_bank_statement_rpc`
3. `20251212_120000_allow_public_read_tenant_invites_by_token`
4. `20251213_120000_remove_tenant_invites_updated_at_trigger`
5. `20251215161709_update_default_templates_tags`

**Análise:**
- O develop tem 5 migrations que **não estão aplicadas no main**
- Isso significa que o develop está **mais avançado** que o main em termos de schema
- Essas migrations precisam ser aplicadas no main ou removidas do develop

---

## ✅ Recomendações

### Prioridade Alta

1. **Corrigir `verify_jwt` no develop:**
   ```powershell
   # Atualizar config.toml ou fazer redeploy com verify_jwt=false
   supabase functions deploy evolution-proxy --project-ref ivaeoagtrvjsksebnqwr --no-verify-jwt
   supabase functions deploy asaas-import-charges --project-ref ivaeoagtrvjsksebnqwr --no-verify-jwt
   ```

2. **Sincronizar migrations:**
   - Decidir se as 5 migrations extras do develop devem ir para o main
   - Ou remover essas migrations do develop para manter igual ao main

### Prioridade Média

3. **Atualizar versões das Edge Functions:**
   - As versões diferentes são esperadas (develop acabou de receber deploy)
   - Conforme o develop evolui, as versões se alinharão naturalmente

### Prioridade Baixa

4. **Monitorar evolução:**
   - Executar `comparar_main_develop.ps1` periodicamente
   - Manter documentação atualizada

---

## 📁 Estrutura de Replicação

Foi criada a pasta `replicacao-main-completa/` com:
- ✅ Todas as 4 migrations do main
- ✅ Todas as 30 Edge Functions do main
- ✅ Script de setup automatizado
- ✅ Documentação completa

**Uso:**
```powershell
cd replicacao-main-completa
.\scripts\setup_replicacao.ps1
```

---

## 🔄 Próximos Passos

1. ✅ Comparação concluída
2. ✅ Estrutura de replicação criada
3. ⏳ Corrigir `verify_jwt` no develop
4. ⏳ Decidir sobre migrations extras
5. ⏳ Documentar decisões tomadas

---

**Gerado por:** Script de comparação automática  
**Última atualização:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

