# ✅ Atualização dos Templates Padrão

## 🎯 Problema Identificado

Ao criar um novo tenant, a função `create_default_templates()` criava templates padrão usando tags antigas que não estavam alinhadas com o arquivo centralizado `messageTags.ts`.

## 🔍 Tags Encontradas na Função Original

### ❌ Tags Antigas (Incorretas)
- `{cobranca.linkPagamento}` - **Tag não existe mais**

### ✅ Tags Corretas (Mantidas)
- `{cliente.nome}` ✅
- `{cobranca.valor}` ✅
- `{cobranca.vencimento}` ✅

## 🔧 Correção Aplicada

### Migration Criada
**Arquivo:** `supabase/migrations/20251215161709_update_default_templates_tags.sql`

### Mudanças Realizadas

1. **Substituição de Tag:**
   - ❌ `{cobranca.linkPagamento}` → ✅ `{cobranca.link}`

2. **Adição de Campos Obrigatórios:**
   - `days_offset` - Dias antes/depois do vencimento
   - `is_before_due` - Se é antes ou depois do vencimento
   - `active` - Status do template
   - `tags` - Array com as tags usadas no template

3. **Templates Atualizados:**
   - ✅ **7 DIAS PARA VENCER** - Tags: `{cliente.nome}`, `{cobranca.valor}`, `{cobranca.vencimento}`, `{cobranca.link}`
   - ✅ **3 DIAS PARA VENCER** - Tags: `{cliente.nome}`, `{cobranca.valor}`, `{cobranca.link}`
   - ✅ **1 DIA PARA VENCER** - Tags: `{cliente.nome}`, `{cobranca.valor}`, `{cobranca.link}`
   - ✅ **VENCE HOJE** - Tags: `{cliente.nome}`, `{cobranca.valor}`, `{cobranca.link}`
   - ✅ **BOLETO VENCIDO** - Tags: `{cliente.nome}`, `{cobranca.valor}`, `{cobranca.vencimento}`, `{cobranca.link}`

## 📋 Tags Usadas nos Templates Padrão

Todos os templates agora usam apenas tags do arquivo centralizado:

### Tags de Cliente
- `{cliente.nome}` - Nome do cliente

### Tags de Cobrança
- `{cobranca.valor}` - Valor da cobrança
- `{cobranca.vencimento}` - Data de vencimento
- `{cobranca.link}` - Link para pagamento

## ✅ Status

- [x] Função `create_default_templates()` atualizada
- [x] Migration aplicada no Supabase
- [x] Tags alinhadas com `messageTags.ts`
- [x] Campos obrigatórios adicionados
- [x] Array de tags preenchido corretamente

## 🔄 Próximos Passos (Opcional)

Se você quiser atualizar templates existentes de tenants já criados, pode executar:

```sql
-- AIDEV-NOTE: Atualizar templates existentes que usam {cobranca.linkPagamento}
UPDATE notification_templates
SET message = REPLACE(message, '{cobranca.linkPagamento}', '{cobranca.link}')
WHERE message LIKE '%{cobranca.linkPagamento}%';
```

## 📝 Notas Importantes

1. **Novos Tenants:** Templates criados a partir de agora já usarão as tags corretas
2. **Tenants Existentes:** Templates existentes continuarão funcionando, mas podem ter tags antigas
3. **Compatibilidade:** A edge function ainda processa `{cobranca.linkPagamento}` por compatibilidade, mas é recomendado usar `{cobranca.link}`

## 🎉 Resultado

Agora, quando um novo tenant é criado, os templates padrão são criados usando **apenas tags do arquivo centralizado** `messageTags.ts`, garantindo consistência em todo o sistema.

