# 🎯 Melhores Práticas: Funções no Supabase

**Última atualização:** 21/12/2025

---

## 📋 Resumo Executivo

### ✅ Regra de Ouro
**SEMPRE crie arquivos de migration para qualquer mudança no banco de dados, mesmo que tenha testado via MCP.**

### ⚠️ Por quê?
- **MCP é para testes/verificação** - Não persiste no Git
- **Migrations são versionadas** - Ficam no histórico do projeto
- **Integração nativa do Supabase** - Aplica migrations automaticamente
- **Reprodutibilidade** - Outros desenvolvedores terão as mesmas mudanças

---

## 🔄 Fluxo Correto: Criar Nova Função

### 1️⃣ **Criar Migration Local**

```bash
# Criar nova migration
supabase migration new nome_da_funcao

# Exemplo:
supabase migration new create_calculate_total_function
```

### 2️⃣ **Escrever a Função na Migration**

```sql
-- supabase/migrations/20251221_nome_da_funcao.sql

BEGIN;

-- AIDEV-NOTE: Criar função para calcular total
CREATE OR REPLACE FUNCTION public.calculate_total(p_amount numeric, p_tax numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_amount + (p_amount * p_tax / 100);
END;
$$;

-- Comentários descritivos
COMMENT ON FUNCTION public.calculate_total IS 
  'Calcula o total incluindo taxa percentual';

COMMIT;
```

### 3️⃣ **Testar Localmente (Opcional)**

```bash
# Iniciar Supabase local
supabase start

# Aplicar migrations localmente
supabase db reset

# Testar função
supabase db execute "SELECT calculate_total(100, 10);"
```

### 4️⃣ **Commit e Push para Develop**

```bash
git add supabase/migrations/
git commit -m "feat: adicionar função calculate_total"
git push origin develop
```

### 5️⃣ **Integração Nativa Aplica Automaticamente**

A integração nativa do Supabase detecta a migration e aplica automaticamente na develop.

---

## 🔧 Quando Usar MCP vs Migrations

### ✅ **Use MCP para:**
- **Verificação rápida** - Testar queries antes de criar migration
- **Análise de dados** - Consultar dados existentes
- **Debugging** - Investigar problemas
- **Comparação** - Comparar MAIN vs DEVELOP
- **Aplicação temporária** - Testes que serão descartados
- **Correção urgente** - Fix rápido que depois será versionado

### ❌ **NÃO use MCP para:**
- **Mudanças permanentes** - Funções, triggers, tabelas
- **Alterações de schema** - Foreign keys, constraints, índices
- **Mudanças que precisam ser versionadas** - Qualquer coisa que vá para produção
- **Edge Functions** - Não se aplica (são arquivos TypeScript)

### ⚠️ **Regra de Ouro:**
> **Se você aplicou via MCP e funcionou, CRIE A MIGRATION IMEDIATAMENTE!**
> 
> **MCP = Teste | Migration = Produção**

---

## 📝 Tipos de Funções no Supabase

### 1. **Database Functions (PostgreSQL) - RPC Functions**

**Onde:** `supabase/migrations/*.sql`

**O que são:** Funções SQL executadas no banco de dados PostgreSQL.

```sql
-- supabase/migrations/20251221_calcular_total.sql
CREATE OR REPLACE FUNCTION public.calcular_total(p_amount numeric, p_tax numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_amount + (p_amount * p_tax / 100);
END;
$$;
```

**Como chamar:**
```typescript
// No frontend/backend
const { data, error } = await supabase.rpc('calcular_total', {
  p_amount: 100,
  p_tax: 10
});
```

**Fluxo:**
1. ✅ Criar migration: `supabase migration new nome_da_funcao`
2. ✅ Escrever função na migration
3. ✅ Commit e push para develop
4. ✅ Integração nativa aplica automaticamente

**⚠️ NÃO use MCP para criar permanentemente** - Use apenas para testar!

### 2. **Edge Functions (Deno) - Serverless Functions**

**Onde:** `supabase/functions/nome-da-funcao/index.ts`

**O que são:** Funções serverless executadas via HTTP (similar a AWS Lambda).

```typescript
// supabase/functions/meu-endpoint/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  
  const { data } = await req.json();
  
  return new Response(
    JSON.stringify({ message: "Processado", data }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

**Como chamar:**
```typescript
// No frontend/backend
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/meu-endpoint`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dados: 'exemplo' })
  }
);
```

**Fluxo:**
1. ✅ Criar pasta: `supabase/functions/meu-endpoint/`
2. ✅ Criar arquivo: `index.ts`
3. ✅ Commit e push para develop
4. ✅ Integração nativa faz deploy automaticamente

**⚠️ Edge Functions NÃO precisam de migration** - São arquivos TypeScript versionados no Git

---

## 🎯 Workflow Recomendado

### Para Database Functions (PostgreSQL)

```
┌─────────────────────────────────────┐
│ 1. Criar migration local            │
│    supabase migration new nome_func │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. Escrever função na migration     │
│    (com comentários AIDEV-NOTE)     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. Testar localmente (opcional)    │
│    supabase db reset                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. Commit e push para develop      │
│    git add && commit && push        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. Integração nativa aplica         │
│    (automático via GitHub)          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 6. Testar na develop                │
│    (via MCP ou aplicação)           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 7. Merge para main (quando pronto) │
│    (integração aplica automaticamente)│
└─────────────────────────────────────┘
```

### Para Edge Functions (Deno)

```
┌─────────────────────────────────────┐
│ 1. Criar pasta                     │
│    mkdir supabase/functions/nome    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. Criar index.ts                  │
│    (código TypeScript/Deno)          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. Commit e push para develop      │
│    git add && commit && push        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. Integração nativa faz deploy    │
│    (automático via GitHub)           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. Testar na develop               │
│    (via HTTP request)               │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 6. Merge para main (quando pronto) │
│    (integração faz deploy automaticamente)│
└─────────────────────────────────────┘
```

### ⚡ Workflow Rápido (MCP + Migration)

**Quando você precisa testar rápido:**

```
1. Testar via MCP (rápido)
   ↓
2. Se funcionou, criar migration IMEDIATAMENTE
   ↓
3. Copiar código do MCP para migration
   ↓
4. Commit e push
   ↓
5. Integração aplica (substitui o que foi feito via MCP)
```

---

## ⚠️ Erros Comuns

### ❌ **Erro 1: Aplicar via MCP e esquecer de criar migration**

**Problema:**
```sql
-- Aplicado via MCP, mas não versionado
CREATE FUNCTION public.teste() ...
-- ✅ Funciona agora, mas ❌ não está no Git
-- ❌ Perdido ao fazer reset ou deploy
```

**Solução:**
- ✅ Sempre criar migration ANTES ou DEPOIS de aplicar via MCP
- ✅ Migration deve conter exatamente o que foi aplicado
- ✅ Commit e push imediatamente

### ❌ **Erro 2: Aplicar migration via MCP sem criar arquivo local**

**Problema:**
- Migration aplicada no Supabase mas arquivo não está no Git
- Outros desenvolvedores não terão a mudança
- Perdido ao fazer reset

**Solução:**
- ✅ SEMPRE criar arquivo de migration local primeiro
- ✅ Commit e push antes de aplicar (ou imediatamente depois)

### ❌ **Erro 3: Modificar função diretamente no Supabase Dashboard**

**Problema:**
- Mudanças feitas no Dashboard não são versionadas
- Perdidas ao fazer reset ou deploy
- Outros desenvolvedores não têm acesso

**Solução:**
- ✅ SEMPRE criar migration para mudanças
- ✅ Dashboard apenas para consultas/debugging
- ✅ Nunca modificar schema pelo Dashboard

### ❌ **Erro 4: Criar Edge Function sem versionar no Git**

**Problema:**
- Edge Function criada via Dashboard
- Não está no repositório Git
- Perdida ao fazer reset

**Solução:**
- ✅ SEMPRE criar arquivo local em `supabase/functions/`
- ✅ Commit e push antes de fazer deploy
- ✅ Integração nativa faz deploy automaticamente

---

## ✅ Checklist: Criar Nova Função

### Database Function (PostgreSQL)

Antes de considerar uma função "pronta":

- [ ] Arquivo de migration criado em `supabase/migrations/`
- [ ] Função escrita na migration com comentários `AIDEV-NOTE`
- [ ] Função testada via MCP (opcional, mas recomendado)
- [ ] Migration testada localmente (se possível)
- [ ] Commit e push para develop
- [ ] Verificado que integração nativa aplicou
- [ ] Função testada na develop (via `supabase.rpc()`)
- [ ] Documentação atualizada (se necessário)

### Edge Function (Deno)

Antes de considerar uma função "pronta":

- [ ] Pasta criada em `supabase/functions/nome-da-funcao/`
- [ ] Arquivo `index.ts` criado com código
- [ ] Função testada localmente (se possível)
- [ ] Commit e push para develop
- [ ] Verificado que integração nativa fez deploy
- [ ] Função testada na develop (via HTTP request)
- [ ] Documentação atualizada (se necessário)

---

## 🔍 Verificação Rápida

### Verificar se função existe no Supabase:

```sql
-- Via MCP ou SQL Editor
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'nome_da_funcao';
```

### Verificar se migration existe localmente:

```bash
# Listar migrations
ls supabase/migrations/ | grep nome_da_funcao

# Ver conteúdo
cat supabase/migrations/20251221_nome_da_funcao.sql
```

---

## 📚 Referências

- **Supabase Migrations:** https://supabase.com/docs/guides/cli/local-development#database-migrations
- **Edge Functions:** https://supabase.com/docs/guides/functions
- **Database Functions:** https://supabase.com/docs/guides/database/functions

---

## 🎯 Resumo Final

### **Regra Simples:**
> **Se vai para produção, vai para migration (ou arquivo Git).**
> 
> **Se é só teste, pode usar MCP.**

### **Fluxo Padrão:**

#### Database Functions:
1. **Criar migration** → `supabase migration new nome`
2. **Escrever função** → SQL na migration
3. **Commit e push** → Versionar no Git
4. **Integração aplica** → Automaticamente na develop
5. **Testar** → Verificar funcionamento
6. **Merge main** → Quando pronto para produção

#### Edge Functions:
1. **Criar pasta** → `supabase/functions/nome/`
2. **Escrever código** → TypeScript/Deno
3. **Commit e push** → Versionar no Git
4. **Integração faz deploy** → Automaticamente na develop
5. **Testar** → Verificar funcionamento
6. **Merge main** → Quando pronto para produção

---

## 💡 Dicas Finais

### ✅ **SEMPRE:**
- Crie arquivo de migration para Database Functions
- Crie arquivo TypeScript para Edge Functions
- Commit e push antes de considerar "pronto"
- Use MCP apenas para testes/verificação

### ❌ **NUNCA:**
- Aplique mudanças permanentes apenas via MCP
- Modifique schema pelo Dashboard
- Esqueça de versionar mudanças no Git
- Faça deploy manual se a integração nativa está configurada

---

**📌 Lembre-se:** MCP é uma ferramenta poderosa para testes e verificação, mas migrations/arquivos Git são a fonte da verdade para produção.

