# 📘 Guia de Padronização Global de Fontes - Revalya

## 🎯 Objetivo

Este guia documenta o sistema de padronização global de fontes implementado no Revalya, baseado nos padrões da Omie. Todas as telas devem seguir este padrão para garantir consistência visual e facilitar manutenção futura.

---

## 📋 Classes Globais Disponíveis

### 1. `.text-body` - Texto Padrão
**Uso:** Texto geral, parágrafos, valores, descrições
- **Tamanho:** 14px
- **Fonte:** "Helvetica Neue", Helvetica, Arial, sans-serif
- **Peso:** 400 (normal)
- **Line-height:** 20px
- **Cor:** rgb(51, 51, 51)

**Quando usar:**
- Texto de corpo em tabelas
- Valores monetários
- Descrições de produtos/serviços
- Mensagens de erro/sucesso
- Texto de formulários (quando não for input)

**Exemplo:**
```tsx
<span className="text-body">R$ 1.200,00</span>
<p className="text-body text-muted-foreground">Descrição do produto</p>
```

---

### 2. `.text-heading-1` - Título Principal (H1)
**Uso:** Títulos principais de páginas, valores destacados
- **Tamanho:** 16px
- **Fonte:** "Open Sans", sans-serif
- **Peso:** 700 (bold)
- **Line-height:** 17.6px
- **Cor:** rgb(51, 51, 51)

**Quando usar:**
- Título principal da página
- Valores importantes em cards
- Títulos de seções principais
- Números destacados em dashboards

**Exemplo:**
```tsx
<h1 className="text-heading-1">Produtos</h1>
<div className="text-heading-1 font-bold">1.234</div>
```

---

### 3. `.text-heading-2` - Título Secundário (H2)
**Uso:** Subtítulos, títulos de seções
- **Tamanho:** 16px
- **Fonte:** Poppins, sans-serif
- **Peso:** 500 (medium)
- **Line-height:** 17.6px
- **Cor:** rgb(51, 51, 51)

**Quando usar:**
- Subtítulos de páginas
- Títulos de seções secundárias
- Labels de grupos de campos

**Exemplo:**
```tsx
<h2 className="text-heading-2">Configurações</h2>
```

---

### 4. `.text-heading-3` - Título Terciário (H3)
**Uso:** Títulos de subseções, valores médios
- **Tamanho:** 16px
- **Fonte:** Poppins, sans-serif
- **Peso:** 400 (normal)
- **Line-height:** 17.6px
- **Cor:** rgb(53, 50, 48)

**Quando usar:**
- Títulos de subseções
- Valores em cards de resumo
- Títulos de modais
- Mensagens de estado

**Exemplo:**
```tsx
<h3 className="text-heading-3">Nenhum produto encontrado</h3>
<div className="text-heading-3 font-bold">R$ 500,00</div>
```

---

### 5. `.text-heading-4` - Título Quaternário (H4)
**Uso:** Títulos pequenos, labels destacados
- **Tamanho:** 14px
- **Fonte:** "Open Sans", sans-serif
- **Peso:** 700 (bold)
- **Line-height:** 15.4px
- **Cor:** rgb(51, 51, 51)

**Quando usar:**
- Títulos de cards pequenos
- Labels de campos obrigatórios
- Títulos de listas

**Exemplo:**
```tsx
<h4 className="text-heading-4">Informações Básicas</h4>
```

---

### 6. `.text-input` - Inputs e Campos de Formulário
**Uso:** Texto dentro de inputs, textareas
- **Tamanho:** 14px
- **Fonte:** Poppins, sans-serif
- **Peso:** 400 (normal)
- **Line-height:** 20px
- **Cor:** rgb(120, 120, 120)

**Quando usar:**
- Aplicar diretamente em componentes Input
- Textareas
- Campos de busca

**Exemplo:**
```tsx
<Input className="text-input" placeholder="Digite aqui..." />
<Textarea className="text-input" />
```

---

### 7. `.text-select` - Selects e Dropdowns
**Uso:** Texto dentro de selects, dropdowns
- **Tamanho:** 12px
- **Fonte:** "Open Sans", sans-serif
- **Peso:** 400 (normal)
- **Cor:** rgb(75, 75, 75)

**Quando usar:**
- SelectTrigger
- SelectItem
- DropdownMenu items

**Exemplo:**
```tsx
<SelectTrigger className="text-select">
  <SelectValue />
</SelectTrigger>
```

---

### 8. `.text-table` - Tabelas
**Uso:** Cabeçalhos e células de tabelas
- **Tamanho:** 13.2px
- **Fonte:** "Open Sans", sans-serif
- **Peso:** 400 (normal)
- **Line-height:** 18.48px
- **Cor:** rgb(91, 91, 91)

**Quando usar:**
- TableHead (cabeçalhos)
- TableCell (células)
- Texto dentro de tabelas

**Exemplo:**
```tsx
<TableHead className="text-table font-medium">Nome</TableHead>
<TableCell>
  <span className="text-table">{product.code}</span>
</TableCell>
```

---

### 9. `.text-label` - Labels de Formulário
**Uso:** Labels de campos, descrições de campos
- **Tamanho:** 14px
- **Fonte:** "Open Sans", sans-serif
- **Peso:** 400 (normal)
- **Line-height:** 20px

**Quando usar:**
- Labels de inputs
- Descrições de campos
- Texto explicativo acima de campos

**Exemplo:**
```tsx
<Label htmlFor="name" className="text-label">
  Nome do Produto
</Label>
```

---

### 10. `.text-small` - Textos Pequenos
**Uso:** Textos auxiliares, badges, tooltips, mensagens pequenas
- **Tamanho:** 12px
- **Fonte:** "Open Sans", sans-serif
- **Peso:** 400 (normal)
- **Line-height:** 18px

**Quando usar:**
- Texto dentro de badges
- Tooltips
- Mensagens de ajuda
- Texto secundário em cards
- Labels pequenos

**Exemplo:**
```tsx
<Badge className="text-small">Ativo</Badge>
<p className="text-small text-muted-foreground">Mensagem de ajuda</p>
<TooltipContent>
  <p className="text-small">Descrição detalhada</p>
</TooltipContent>
```

---

## 🎨 Padrões por Tipo de Componente

### Tabelas
```tsx
// Cabeçalho
<TableHead className="text-table font-medium">Nome</TableHead>

// Célula com texto normal
<TableCell>
  <span className="text-body">{product.name}</span>
</TableCell>

// Célula com código (menor)
<TableCell>
  <span className="text-table">{product.code}</span>
</TableCell>

// Célula com valor monetário
<TableCell>
  <span className="text-body text-green-600">
    {formatCurrency(product.price)}
  </span>
</TableCell>

// Badge dentro de célula
<TableCell>
  <Badge className="text-small">Ativo</Badge>
</TableCell>
```

### Formulários
```tsx
// Label
<Label htmlFor="name" className="text-label">
  Nome do Produto
</Label>

// Input
<Input 
  id="name" 
  className="text-input"
  placeholder="Digite o nome..."
/>

// Select
<Select>
  <SelectTrigger className="text-select">
    <SelectValue />
  </SelectTrigger>
</Select>

// Textarea
<Textarea 
  className="text-input"
  placeholder="Descrição..."
/>
```

### Cards e Dashboards
```tsx
// Título do card
<h3 className="text-heading-3">Resumo</h3>

// Valor destacado
<div className="text-heading-1 font-bold">R$ 1.234,56</div>

// Label pequeno
<p className="text-small text-muted-foreground">Total de vendas</p>

// Texto descritivo
<p className="text-body">Descrição do card</p>
```

### Badges e Status
```tsx
// Badge padrão
<Badge className="text-small">Ativo</Badge>

// Badge com cor customizada
<Badge 
  className="text-small bg-green-100 text-green-800"
>
  Concluído
</Badge>
```

### Modais e Dialogs
```tsx
// Título do modal
<DialogTitle className="text-heading-1">Editar Produto</DialogTitle>

// Descrição
<DialogDescription className="text-body">
  Preencha os campos abaixo
</DialogDescription>

// Conteúdo
<p className="text-body">Texto do conteúdo</p>
```

---

## ✅ Checklist para Novas Telas

Ao criar uma nova tela, verifique:

- [ ] **Títulos** usam `.text-heading-1`, `.text-heading-2`, `.text-heading-3` ou `.text-heading-4`
- [ ] **Tabelas** usam `.text-table` para cabeçalhos e células
- [ ] **Inputs** usam `.text-input`
- [ ] **Selects** usam `.text-select`
- [ ] **Labels** usam `.text-label`
- [ ] **Texto geral** usa `.text-body`
- [ ] **Badges** usam `.text-small`
- [ ] **Tooltips** usam `.text-small`
- [ ] **Nenhum** uso de `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`
- [ ] **Nenhum** uso de `text-[12px]`, `text-[14px]`, etc. (valores fixos)

---

## 🚫 O Que NÃO Fazer

### ❌ NÃO use classes Tailwind padrão de tamanho:
```tsx
// ❌ ERRADO
<span className="text-sm">Texto</span>
<span className="text-lg">Título</span>
<span className="text-xs">Pequeno</span>
```

### ❌ NÃO use valores fixos:
```tsx
// ❌ ERRADO
<span className="text-[12px]">Texto</span>
<span className="text-[14px]">Texto</span>
<span className="text-[16px]">Título</span>
```

### ✅ Use classes globais:
```tsx
// ✅ CORRETO
<span className="text-small">Texto</span>
<span className="text-body">Texto</span>
<span className="text-heading-1">Título</span>
```

---

## 📝 Exemplos Práticos

### Exemplo 1: Lista de Produtos
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="text-table font-medium">Nome</TableHead>
      <TableHead className="text-table font-medium">Código</TableHead>
      <TableHead className="text-table font-medium">Valor</TableHead>
      <TableHead className="text-table font-medium">Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>
        <span className="text-body">{product.name}</span>
      </TableCell>
      <TableCell>
        <span className="text-table">{product.code}</span>
      </TableCell>
      <TableCell>
        <span className="text-body text-green-600">
          {formatCurrency(product.price)}
        </span>
      </TableCell>
      <TableCell>
        <Badge className="text-small">Ativo</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Exemplo 2: Formulário
```tsx
<div className="space-y-2">
  <Label htmlFor="name" className="text-label">
    Nome do Produto
  </Label>
  <Input 
    id="name"
    className="text-input"
    placeholder="Digite o nome..."
  />
  
  <Label htmlFor="category" className="text-label">
    Categoria
  </Label>
  <Select>
    <SelectTrigger className="text-select">
      <SelectValue />
    </SelectTrigger>
  </Select>
</div>
```

### Exemplo 3: Card de Dashboard
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-heading-3">Total de Vendas</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-heading-1 font-bold text-green-600">
      R$ 12.345,67
    </div>
    <p className="text-small text-muted-foreground mt-2">
      Aumento de 15% em relação ao mês anterior
    </p>
  </CardContent>
</Card>
```

---

## 🔧 Como Alterar Tamanhos Globalmente

Para alterar os tamanhos de fonte em todo o sistema, edite apenas o arquivo `src/index.css`:

```css
@layer base {
  .text-body {
    font-size: 14px; /* Altere aqui para mudar todos os textos */
  }
  
  .text-heading-1 {
    font-size: 16px; /* Altere aqui para mudar todos os títulos H1 */
  }
  
  .text-small {
    font-size: 12px; /* Altere aqui para mudar todos os textos pequenos */
  }
  
  /* ... outras classes ... */
}
```

**Importante:** Após alterar, todos os componentes que usam essas classes serão atualizados automaticamente!

---

## 📊 Tabela de Referência Rápida

| Classe | Tamanho | Uso Principal | Fonte |
|--------|---------|--------------|-------|
| `.text-body` | 14px | Texto geral, valores | Helvetica Neue |
| `.text-heading-1` | 16px | Títulos principais | Open Sans (bold) |
| `.text-heading-2` | 16px | Subtítulos | Poppins (medium) |
| `.text-heading-3` | 16px | Títulos terciários | Poppins (normal) |
| `.text-heading-4` | 14px | Títulos pequenos | Open Sans (bold) |
| `.text-input` | 14px | Inputs, textareas | Poppins |
| `.text-select` | 12px | Selects, dropdowns | Open Sans |
| `.text-table` | 13.2px | Tabelas | Open Sans |
| `.text-label` | 14px | Labels de formulário | Open Sans |
| `.text-small` | 12px | Badges, tooltips | Open Sans |

---

## 🎯 Regra de Ouro

> **SEMPRE use as classes globais. NUNCA use valores fixos ou classes Tailwind padrão de tamanho.**

Isso garante:
- ✅ Consistência visual em todo o sistema
- ✅ Facilidade de manutenção (altere uma vez, atualize tudo)
- ✅ Padronização com o design da Omie
- ✅ Código mais limpo e organizado

---

## 📚 Arquivos de Referência

- **Classes globais definidas em:** `src/index.css` (linhas 240-307)
- **Configuração Tailwind:** `tailwind.config.ts`
- **Exemplos de uso:**
  - `src/pages/products/index.tsx` - Lista de produtos
  - `src/pages/services/index.tsx` - Lista de serviços
  - `src/components/products/EditProductDialog.tsx` - Formulário de edição

---

## ❓ Dúvidas Frequentes

### Q: Posso combinar classes globais com outras classes?
**R:** Sim! Você pode combinar com classes de cor, peso, etc:
```tsx
<span className="text-body text-green-600 font-semibold">
  R$ 1.200,00
</span>
```

### Q: E se eu precisar de um tamanho que não existe?
**R:** Primeiro, verifique se alguma classe existente não atende. Se realmente precisar de um novo tamanho, adicione uma nova classe global em `src/index.css` e documente aqui.

### Q: Posso usar `font-bold`, `font-semibold`, etc.?
**R:** Sim! As classes globais definem o tamanho e fonte base. Você pode adicionar classes de peso (`font-bold`, `font-medium`, etc.) conforme necessário.

### Q: E as cores?
**R:** As classes globais definem apenas tamanho, fonte e line-height. Use classes Tailwind padrão para cores (`text-green-600`, `text-muted-foreground`, etc.).

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0  
**Mantido por:** Equipe de Desenvolvimento Revalya

