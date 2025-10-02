# PaginationControls Component

## Descrição

O `PaginationControls` é um componente reutilizável de paginação que oferece controles completos de navegação, seleção de itens por página e informações de status. Foi desenvolvido para ser modular e altamente customizável.

## Características

- ✅ Navegação por páginas (anterior/próximo)
- ✅ Paginação numerada com elipses inteligentes
- ✅ Seletor de itens por página
- ✅ Texto de status com total de itens
- ✅ Totalmente responsivo
- ✅ Acessibilidade completa
- ✅ Integração com Shadcn/UI

## Hook usePaginationState

### Uso Básico

```tsx
import { usePaginationState } from '@/components/ui/pagination-controls';

const MyComponent = () => {
  const pagination = usePaginationState(10); // 10 itens por página

  return (
    <div>
      {/* Seu conteúdo aqui */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalItems={totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={pagination.setCurrentPage}
        onItemsPerPageChange={pagination.setItemsPerPage}
      />
    </div>
  );
};
```

### Métodos Disponíveis

- `setCurrentPage(page: number)` - Define a página atual
- `setItemsPerPage(items: number)` - Define itens por página
- `resetToFirstPage()` - Volta para a primeira página

## Componente PaginationControls

### Props Obrigatórias

| Prop | Tipo | Descrição |
|------|------|-----------|
| `currentPage` | `number` | Página atual (1-indexed) |
| `totalItems` | `number` | Total de itens disponíveis |
| `itemsPerPage` | `number` | Itens por página |
| `onPageChange` | `(page: number) => void` | Callback para mudança de página |
| `onItemsPerPageChange` | `(items: number) => void` | Callback para mudança de itens por página |

### Props Opcionais

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `itemsPerPageOptions` | `number[]` | `[10, 20, 50, 100]` | Opções do seletor de itens |
| `showStatusText` | `boolean` | `true` | Exibir texto de status |
| `showNumberedPagination` | `boolean` | `true` | Exibir paginação numerada |
| `className` | `string` | `""` | Classes CSS adicionais |

## Exemplos de Uso

### Exemplo Básico

```tsx
import { PaginationControls, usePaginationState } from '@/components/ui/pagination-controls';

const ProductList = () => {
  const pagination = usePaginationState(20);
  const { data: products, total } = useProducts({
    page: pagination.currentPage,
    limit: pagination.itemsPerPage
  });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      <PaginationControls
        currentPage={pagination.currentPage}
        totalItems={total}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={pagination.setCurrentPage}
        onItemsPerPageChange={pagination.setItemsPerPage}
      />
    </div>
  );
};
```

### Exemplo com Customização

```tsx
<PaginationControls
  currentPage={currentPage}
  totalItems={500}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={setItemsPerPage}
  itemsPerPageOptions={[5, 15, 25, 50]}
  showStatusText={false}
  showNumberedPagination={true}
  className="mt-8 border-t pt-4"
/>
```

### Exemplo com Busca

```tsx
const ClientsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const pagination = usePaginationState(10);
  
  const { data: clients, total } = useClients({
    search: searchTerm,
    page: pagination.currentPage,
    limit: pagination.itemsPerPage
  });

  // Reset para primeira página quando buscar
  useEffect(() => {
    pagination.resetToFirstPage();
  }, [searchTerm]);

  return (
    <div>
      <SearchInput 
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar clientes..."
      />
      
      <ClientsTable clients={clients} />
      
      <PaginationControls
        currentPage={pagination.currentPage}
        totalItems={total}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={pagination.setCurrentPage}
        onItemsPerPageChange={pagination.setItemsPerPage}
      />
    </div>
  );
};
```

## Funcionalidades Avançadas

### Paginação Numerada Inteligente

O componente automaticamente calcula e exibe:
- Páginas próximas à atual
- Elipses quando há muitas páginas
- Links para primeira e última página
- Máximo de 7 páginas visíveis por vez

### Responsividade

- Em telas pequenas: apenas botões anterior/próximo
- Em telas médias: paginação numerada simplificada
- Em telas grandes: paginação completa com todas as opções

### Acessibilidade

- Navegação por teclado completa
- Labels ARIA apropriados
- Estados de foco visíveis
- Suporte a leitores de tela

## Integração com APIs

```tsx
// Exemplo com React Query
const useClientsWithPagination = (searchTerm: string) => {
  const pagination = usePaginationState(10);
  
  const query = useQuery({
    queryKey: ['clients', searchTerm, pagination.currentPage, pagination.itemsPerPage],
    queryFn: () => fetchClients({
      search: searchTerm,
      page: pagination.currentPage,
      limit: pagination.itemsPerPage
    })
  });

  return {
    ...query,
    pagination,
    totalItems: query.data?.total || 0
  };
};
```

## Estilização

O componente usa classes do Tailwind CSS e é totalmente compatível com o tema do Shadcn/UI. Você pode customizar a aparência através da prop `className` ou modificando as classes internas.

## Dependências

- React 18+
- Tailwind CSS
- Shadcn/UI components:
  - Button
  - Select
  - SelectContent
  - SelectItem
  - SelectTrigger
  - SelectValue
- Lucide React icons:
  - ChevronLeft
  - ChevronRight

## Notas de Implementação

- O componente é otimizado para performance com `useMemo` e `useCallback`
- Suporta SSR (Server-Side Rendering)
- Totalmente tipado com TypeScript
- Segue as melhores práticas de acessibilidade
- Compatível com React Strict Mode