# 🗑️ Scripts Identificados para Limpeza

## 📋 Scripts Usados no package.json (MANTER)

Estes scripts são referenciados no `package.json` e devem ser **MANTIDOS**:

1. ✅ `check-current-environment.ps1` - usado em `dev:check`
2. ✅ `migrate-avatars.ts` - usado em `migrate:avatars`
3. ✅ `setup-asaas-webhook.ts` - usado em `setup:asaas-webhook`
4. ✅ `diagnose-evolution-api.ts` - usado em `diagnose:evolution`
5. ✅ `test-edge-function.ts` - usado em `test:edge-function`
6. ✅ `test-send-invite-email.ts` - usado em `test:send-invite-email`
7. ✅ `create-dev-invite.ts` - usado em `dev:create-invite`

---

## 🗑️ Scripts para EXCLUIR

### Backup/Restore (Obsoletos/Duplicados)
1. ❌ `backup-main-restore-develop-cli.ps1`
2. ❌ `backup-main-restore-develop.ps1`
3. ❌ `restore-main-backup-to-development.ps1`
4. ❌ `restore-backup-to-development.ps1`
5. ❌ `restore-backup-separado.ps1`
6. ❌ `restore-schema-only.ps1`
7. ❌ `exemplo-backup-manual.ps1`
8. ❌ `gerar-dump-producao.ps1`
9. ❌ `gerar-dump-simples.ps1`
10. ❌ `gerar-dump-schema.sql`
11. ❌ `restaurar-dump-docker.ps1`

### Clone/Sync (Obsoletos)
12. ❌ `clone-production-to-development.ps1`
13. ❌ `create-and-clone-branch.ps1`
14. ❌ `reset-and-sync-from-production.ps1`
15. ❌ `sync-migrations-from-production.ps1`
16. ❌ `fix-migration-conflicts.ps1`
17. ❌ `preparar-migracao-unica.ps1`
18. ❌ `executar-copia-producao.ps1`
19. ❌ `copiar-producao-local.ps1`

### Extração de Funções (Obsoletos)
20. ❌ `extrair-funcoes-cli.js`
21. ❌ `extrair-funcoes-producao.js`
22. ❌ `extrair-funcoes.ps1`
23. ❌ `extrair-funcoes-mcp.js`
24. ❌ `processar-funcoes.js`

### Deploy/Edge Functions (Obsoletos/Duplicados)
25. ❌ `pull-all-edge-functions.ps1`
26. ❌ `pull-edge-functions-from-production.ps1`
27. ❌ `pull-edge-functions-mcp.ts`
28. ❌ `deploy-all-edge-functions.ps1`
29. ❌ `deploy-to-production.ps1`

### Configuração/Setup (Obsoletos)
30. ❌ `atualizar-env-development.ps1`
31. ❌ `configurar-staging.ps1`
32. ❌ `setup-development-environment.ps1`
33. ❌ `switch-environment.ps1`
34. ❌ `iniciar-postgres-simples.ps1`

### Limpeza/Migrações (Obsoletos)
35. ❌ `limpar-cache-vite.ps1` (pode manter se útil)
36. ❌ `limpar-e-aplicar-migracoes.ps1`
37. ❌ `limpar-historico-migracoes.sql`

### Usuários/Tenants (Específicos/Temporários)
38. ❌ `create-user-alberto.ts` (usuário específico)
39. ❌ `remove-user-auth.ts` (temporário)
40. ❌ `remove-user-kleverson.sql` (usuário específico)
41. ❌ `delete-tenant-consysa.sql` (tenant específico)
42. ❌ `add_users_to_tenant.sql` (temporário)
43. ❌ `add_users_to_tenant.ts` (temporário)
44. ❌ `create_user_contato.ts` (temporário)
45. ❌ `sync-user-to-table.ts` (temporário)

### Sync/Import (Obsoletos)
46. ❌ `sync-customers.ts`
47. ❌ `sync-charges-real.js`

### Testes/Debug (Temporários)
48. ❌ `test-asaas-webhook.ts`
49. ❌ `test-edge-function-db.ts`
50. ❌ `test-edge-function-direct.js`
51. ❌ `test-reconciliation-modal.ts`
52. ❌ `test-sync-charges-dry-run.js`
53. ❌ `test-tenant-credentials.ts`
54. ❌ `validate-webhook-data.ts`
55. ❌ `debug-webhook-headers.ts`

### Diagnóstico/Validação (Obsoletos)
56. ❌ `check-edge-function-config.ts`
57. ❌ `check-edge-function-env.ts`
58. ❌ `diagnostico-supabase.cjs`
59. ❌ `diagnostico-supabase.js` (vazio - 0 bytes)
60. ❌ `aplicar-correcoes-supabase.cjs`
61. ❌ `setup-security.js`
62. ❌ `validate-security.js` (se existir)
63. ❌ `tenant-validation.ts`

### Listagem (Obsoletos)
64. ❌ `list-customers.js`
65. ❌ `list-customers.ts`

### Documentação/Outros
66. ❌ `README-DEV-INVITE.md` (documentação temporária)
67. ❌ `test-send-invite-email.html` (arquivo HTML de teste)
68. ❌ `scripts/package-lock.json` (não deveria estar aqui)
69. ❌ `scripts/node_modules/` (não deveria estar aqui)

---

## 📊 Resumo

- **Total de scripts para excluir:** ~69 arquivos
- **Scripts a manter:** 7 arquivos (usados no package.json)
- **Espaço estimado a liberar:** Vários MB

---

**Última atualização:** 2025-01-19

