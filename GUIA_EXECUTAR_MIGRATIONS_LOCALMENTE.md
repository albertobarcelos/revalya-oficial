# 🔧 Guia: Executar Migrations Localmente Durante Desenvolvimento

**Pergunta:** Posso executar migrations manualmente durante desenvolvimento sem fazer push para GitHub?

---

## ✅ Resposta Curta

**SIM, pode executar manualmente**, mas há algumas considerações importantes.

---

## 🎯 Opções Disponíveis

### Opção 1: Executar Manualmente via SQL Editor (Rápido)

**Como fazer:**
1. Crie a migration na pasta `supabase/migrations/`
2. Abra o SQL Editor do Supabase (projeto develop)
3. Copie e cole o conteúdo da migration
4. Execute

**Vantagens:**
- ✅ Rápido e direto
- ✅ Testa imediatamente
- ✅ Não precisa fazer commit/push

**Desvantagens:**
- ⚠️ Não registra no histórico do Supabase automaticamente
- ⚠️ Quando fizer push, o Supabase pode tentar aplicar novamente
- ⚠️ Pode gerar avisos (mas não erros, se for idempotente)

**Quando usar:**
- Testes rápidos durante desenvolvimento
- Validação antes de fazer commit

---

### Opção 2: Usar Supabase CLI (Recomendado)

**Como fazer:**
```bash
# 1. Linkar ao projeto develop
supabase link --project-ref ivaeoagtrvjsksebnqwr

# 2. Aplicar migration específica
supabase db push

# Ou aplicar migration específica
supabase migration up --version 20251221030000
```

**Vantagens:**
- ✅ Registra no histórico automaticamente
- ✅ Sincroniza com o Supabase
- ✅ Não gera avisos quando fizer push
- ✅ Workflow profissional

**Desvantagens:**
- ⚠️ Requer Supabase CLI instalado
- ⚠️ Um pouco mais lento que manual

**Quando usar:**
- Desenvolvimento normal
- Quando quer manter histórico sincronizado

---

### Opção 3: Fazer Push para GitHub (Mais Seguro)

**Como fazer:**
```bash
git add supabase/migrations/nova_migration.sql
git commit -m "feat: adicionar nova funcionalidade"
git push origin develop
```

**Vantagens:**
- ✅ Histórico sempre sincronizado
- ✅ Outros desenvolvedores veem as mudanças
- ✅ Backup automático no Git
- ✅ Sem surpresas

**Desvantagens:**
- ⚠️ Mais lento (precisa commit/push)
- ⚠️ Pode poluir histórico se fizer muitos commits de teste

**Quando usar:**
- Quando a migration está pronta
- Quando quer compartilhar com a equipe
- Para produção

---

## 🔄 Workflow Recomendado

### Durante Desenvolvimento (Testes Rápidos)

1. **Crie a migration** na pasta `supabase/migrations/`
2. **Execute manualmente** no SQL Editor do Supabase (develop)
3. **Teste** a funcionalidade
4. **Ajuste** se necessário
5. **Quando estiver pronta**, faça commit e push

### Quando a Migration Está Pronta

1. **Faça commit** da migration
2. **Push para develop**
3. **Supabase aplica automaticamente** (ou já está aplicada se você executou manualmente)

---

## ⚠️ Importante: Migrations Idempotentes

**SEMPRE** use migrations idempotentes para evitar problemas:

```sql
-- ✅ CORRETO: Idempotente
CREATE TABLE IF NOT EXISTS minha_tabela (...);
CREATE INDEX IF NOT EXISTS idx_nome ON minha_tabela(coluna);

-- ❌ ERRADO: Não idempotente
CREATE TABLE minha_tabela (...);  -- Vai dar erro se já existir
```

**Por quê?**
- Se executar manualmente e depois fizer push, o Supabase tentará aplicar novamente
- Se for idempotente, não dará erro
- Se não for idempotente, dará erro na segunda execução

---

## 🎯 Resposta Direta à Sua Pergunta

### "Posso executar manualmente?"

**SIM**, pode executar manualmente no SQL Editor durante desenvolvimento.

### "Não tem problema?"

**NÃO tem problema se:**
- ✅ A migration é idempotente (usa `IF NOT EXISTS`, etc.)
- ✅ Você faz commit/push depois
- ✅ Você está testando em develop (não em main)

**Pode ter problema se:**
- ❌ A migration não é idempotente
- ❌ Você esquece de fazer commit
- ❌ Você executa em produção sem testar

---

## 📋 Checklist

Antes de executar manualmente:
- [ ] Migration está na pasta `supabase/migrations/`
- [ ] Migration é idempotente
- [ ] Você está no ambiente correto (develop, não main)
- [ ] Você vai fazer commit depois

Depois de executar manualmente:
- [ ] Testou a funcionalidade
- [ ] Fez commit da migration
- [ ] Fez push para develop
- [ ] Verificou que não há erros

---

## 💡 Dica Pro

**Workflow Híbrido:**
1. Durante desenvolvimento: execute manualmente para testes rápidos
2. Quando estiver pronta: faça commit e push
3. O Supabase detectará que já está aplicada (se idempotente) ou aplicará automaticamente

---

## 🚨 Cuidados

1. **NUNCA** execute migrations não idempotentes manualmente sem commit
2. **SEMPRE** faça commit depois de testar
3. **NUNCA** execute em main sem testar em develop primeiro
4. **SEMPRE** verifique que a migration está no Git antes de fazer merge

---

**Última atualização:** 21/12/2025

