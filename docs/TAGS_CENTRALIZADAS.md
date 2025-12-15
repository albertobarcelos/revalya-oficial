# 📋 Sistema de Tags Centralizado

## 🎯 Visão Geral

O sistema de tags de mensagem foi centralizado em um único arquivo (`src/utils/messageTags.ts`) para garantir consistência, facilitar manutenção e evitar duplicação de código.

## 📁 Arquivo Central

**Localização:** `src/utils/messageTags.ts`

Este arquivo é a **única fonte de verdade** para todas as tags disponíveis no sistema.

## 🔧 Estrutura

### TagDefinition Interface

```typescript
interface TagDefinition {
  key: string;           // Chave única (ex: 'CLIENTE_NOME')
  value: string;          // Valor da tag (ex: '{cliente.nome}')
  label: string;          // Label amigável (ex: 'Nome do Cliente')
  category: 'cliente' | 'cobranca' | 'dias' | 'empresa';
  color?: string;         // Cor para badges
  description?: string;   // Descrição da tag
}
```

### TAG_DEFINITIONS

Array com todas as definições de tags, na ordem que serão exibidas na UI.

## 🛠️ Funções Utilitárias

### Para Componentes UI

- **`getTagsForTagSelector()`** - Retorna tags no formato para `TagSelector` (BulkMessageDialog)
- **`getTagsForSelect()`** - Retorna tags no formato para `Select` (SendMessageModal)

### Para Validação

- **`isValidTag(tagValue: string)`** - Verifica se uma tag existe
- **`validateMessageTags(message: string)`** - Valida todas as tags de uma mensagem
- **`extractTagsFromMessage(message: string)`** - Extrai todas as tags de uma mensagem

### Para Busca

- **`getTagByValue(value: string)`** - Busca tag pelo valor (ex: '{cliente.nome}')
- **`getTagByKey(key: string)`** - Busca tag pela chave (ex: 'CLIENTE_NOME')
- **`getTagsByCategory(category)`** - Filtra tags por categoria

### Compatibilidade

- **`AVAILABLE_TAGS`** - Objeto exportado para compatibilidade com código legado

## 📦 Componentes Atualizados

### ✅ Usando Arquivo Centralizado

1. **BulkMessageDialog** - `getTagsForTagSelector()`
2. **SendMessageModal** - `getTagsForSelect()`
3. **TemplateDialog** - `AVAILABLE_TAGS` (via re-export)
4. **TagsDialog** - `TAG_DEFINITIONS` e `getTagsByCategory()`
5. **Templates.tsx** - `extractTagsFromMessage()`
6. **Integrations.tsx** - `extractTagsFromMessage()`

## ➕ Como Adicionar uma Nova Tag

1. Abra `src/utils/messageTags.ts`
2. Adicione a tag no array `TAG_DEFINITIONS`:

```typescript
{
  key: 'NOVA_TAG',
  value: '{nova.tag}',
  label: 'Nova Tag',
  category: 'cobranca', // ou 'cliente', 'dias', 'empresa'
  color: '#ff0000',
  description: 'Descrição da nova tag'
}
```

3. **Pronto!** A tag estará automaticamente disponível em:
   - Tela de templates
   - Envio manual de mensagens
   - Diálogo de tags disponíveis
   - Validação de mensagens

## ⚠️ Importante

- **NUNCA** defina tags diretamente nos componentes
- **SEMPRE** use o arquivo centralizado
- **SEMPRE** atualize `messageUtils.ts` e a edge function ao adicionar novas tags
- A ordem das tags em `TAG_DEFINITIONS` define a ordem de exibição na UI

## 🔍 Tags Disponíveis

### Cliente (4 tags)
- `{cliente.nome}` - Nome do Cliente
- `{cliente.email}` - Email
- `{cliente.cpf}` - CPF/CNPJ
- `{cliente.telefone}` - Telefone

### Cobrança (7 tags)
- `{cobranca.valor}` - Valor da Cobrança
- `{cobranca.vencimento}` - Data de Vencimento
- `{cobranca.descricao}` - Descrição
- `{cobranca.codigoBarras}` - Código de Barras
- `{cobranca.pix_copia_cola}` - PIX Copia e Cola
- `{cobranca.link}` - Link Pagamento
- `{cobranca.link_boleto}` - Link Boleto

### Dias (2 tags)
- `{dias.ateVencimento}` - Dias até Vencimento
- `{dias.aposVencimento}` - Dias após Vencimento

### Empresa (1 tag)
- `{empresa.nome}` - Nome da Empresa

**Total: 14 tags**

## 🎨 Benefícios

1. ✅ **Single Source of Truth** - Uma única fonte para todas as tags
2. ✅ **Manutenção Simplificada** - Alterações em um único lugar
3. ✅ **Consistência Garantida** - Todos os componentes usam as mesmas tags
4. ✅ **Type Safety** - TypeScript garante tipos corretos
5. ✅ **Extensibilidade** - Fácil adicionar novas tags ou funcionalidades
6. ✅ **Validação** - Funções para validar tags em mensagens
7. ✅ **Documentação** - Descrições e categorias para cada tag

## 📚 Exemplos de Uso

### Em um Componente

```typescript
import { getTagsForTagSelector } from '@/utils/messageTags';

const availableTags = getTagsForTagSelector();
```

### Validar Mensagem

```typescript
import { validateMessageTags } from '@/utils/messageTags';

const { valid, invalidTags } = validateMessageTags(message);
if (!valid) {
  console.error('Tags inválidas:', invalidTags);
}
```

### Extrair Tags

```typescript
import { extractTagsFromMessage } from '@/utils/messageTags';

const tags = extractTagsFromMessage(message);
// Retorna: ['{cliente.nome}', '{cobranca.valor}', ...]
```

## 🔄 Migração de Código Legado

Se encontrar código usando tags hardcoded:

**Antes:**
```typescript
const tags = [
  { id: "{cliente.nome}", name: "Nome do Cliente" },
  // ...
];
```

**Depois:**
```typescript
import { getTagsForTagSelector } from '@/utils/messageTags';
const tags = getTagsForTagSelector();
```

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar suporte para tags na edge function usando o mesmo arquivo
- [ ] Criar documentação automática das tags
- [ ] Adicionar testes unitários para validação de tags
- [ ] Criar preview de tags em tempo real
- [ ] Adicionar sugestão automática de tags ao digitar

