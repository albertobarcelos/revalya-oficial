# 📋 Plano de Correção - Paginação de Contratos

## 🔍 Problema Identificado

**Sintoma:**
- Ao clicar em "próxima", a página ainda mostra página 1
- Ao clicar novamente, aí sim vai para página 2
- Ao dar refresh, volta para página 1

**Causa Raiz:**
1. **Sincronização de Estado**: O estado `currentPage` não está sincronizado com a URL, então ao dar refresh, volta para página 1
2. **Cache do React Query**: O `staleTime` de 10 minutos pode estar retornando dados em cache mesmo quando a query key muda
3. **useEffect Conflitante**: O `useEffect` nas linhas 57-72 do `ContractList.tsx` pode estar resetando a página incorretamente
4. **Query Key**: A query key inclui `JSON.stringify(filters)`, mas pode haver problemas de serialização

## 🎯 Solução Proposta

### 1. Sincronizar Página com URL (Prioridade: ALTA)
- Usar `useSearchParams` para ler/escrever página na URL
- Exemplo: `?page=2&limit=10`
- Garantir que refresh mantenha a página atual

### 2. Corrigir Query Key (Prioridade: ALTA)
- Separar `page` e `limit` da query key principal
- Usar query key mais específica: `['contracts', tenantId, page, limit, status, search]`
- Garantir que mudança de página invalide cache anterior

### 3. Ajustar Configuração do React Query (Prioridade: MÉDIA)
- Reduzir `staleTime` para paginação (ou usar `staleTime: 0` para queries de paginação)
- Garantir que `refetchOnMount: true` quando página muda
- Usar `keepPreviousData: false` para evitar dados antigos

### 4. Remover/Corrigir useEffect Conflitante (Prioridade: ALTA)
- O `useEffect` nas linhas 57-72 está validando página, mas pode estar causando loops
- Remover validação automática ou torná-la mais específica

### 5. Adicionar Loading State Durante Mudança de Página (Prioridade: BAIXA)
- Mostrar indicador de loading quando página está mudando
- Melhorar UX durante transição

## 📝 Implementação Detalhada

### Arquivo 1: `src/components/contracts/ContractList.tsx`

**Mudanças:**
1. Adicionar `useSearchParams` para sincronizar página com URL
2. Remover validação automática do `useEffect` (linhas 57-72) ou torná-la mais específica
3. Atualizar `onPageChange` para também atualizar URL
4. Ler página inicial da URL ao montar componente

**Código:**
```typescript
// Adicionar no início do componente
const [searchParams, setSearchParams] = useSearchParams();

// Ler página inicial da URL
const initialPage = useMemo(() => {
  const pageFromUrl = parseInt(searchParams.get('page') || '1', 10);
  return isNaN(pageFromUrl) || pageFromUrl < 1 ? 1 : pageFromUrl;
}, [searchParams]);

// Usar initialPage no useState
const [currentPage, setCurrentPage] = useState(initialPage);

// Atualizar URL quando página muda
const handlePageChange = useCallback((newPage: number) => {
  const validPage = Math.max(1, Math.min(newPage, pagination?.totalPages || 1));
  setCurrentPage(validPage);
  
  // Atualizar URL
  const newSearchParams = new URLSearchParams(searchParams);
  newSearchParams.set('page', validPage.toString());
  setSearchParams(newSearchParams, { replace: true });
}, [pagination, searchParams, setSearchParams]);

// Remover ou simplificar useEffect de validação
```

### Arquivo 2: `src/hooks/useContracts.ts`

**Mudanças:**
1. Ajustar query key para ser mais específica
2. Reduzir `staleTime` para queries de paginação
3. Garantir que mudança de página force refetch

**Código:**
```typescript
// Ajustar query key
const query = useSecureTenantQuery(
  ['contracts', currentTenant?.id, filters.page, filters.limit, filters.status, filters.search],
  async (supabase, tenantId) => {
    // ... código existente
  },
  {
    staleTime: 0, // Sempre refetch para paginação
    refetchOnMount: true,
  }
);
```

### Arquivo 3: `src/hooks/templates/useSecureTenantQuery.ts`

**Mudanças:**
1. Adicionar opção para desabilitar cache em queries de paginação
2. Permitir `keepPreviousData: false` por padrão

**Código:**
```typescript
// Adicionar opção
options?: {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  keepPreviousData?: boolean; // Nova opção
}

// Usar no useQuery
return useQuery({
  // ... código existente
  keepPreviousData: options?.keepPreviousData ?? false,
});
```

## ✅ Checklist de Implementação

- [ ] 1. Adicionar sincronização de página com URL em `ContractList.tsx`
- [ ] 2. Corrigir query key em `useContracts.ts`
- [ ] 3. Ajustar configuração do React Query para paginação
- [ ] 4. Remover/Corrigir useEffect conflitante
- [ ] 5. Testar paginação completa:
  - [ ] Clicar em "próxima" → deve ir para página 2 imediatamente
  - [ ] Clicar em "anterior" → deve voltar para página 1
  - [ ] Dar refresh → deve manter página atual
  - [ ] Mudar filtros → deve resetar para página 1
  - [ ] Mudar itemsPerPage → deve resetar para página 1

## 🧪 Testes a Realizar

1. **Teste de Navegação:**
   - Navegar entre páginas e verificar se dados mudam corretamente
   - Verificar se URL é atualizada

2. **Teste de Refresh:**
   - Ir para página 2
   - Dar refresh (F5)
   - Verificar se permanece na página 2

3. **Teste de Filtros:**
   - Ir para página 3
   - Aplicar filtro de status
   - Verificar se volta para página 1

4. **Teste de Performance:**
   - Verificar se não há múltiplas queries sendo executadas
   - Verificar se cache está funcionando corretamente

## 📊 Impacto Esperado

- ✅ Paginação funcionando corretamente
- ✅ URL sincronizada com estado
- ✅ Refresh mantém página atual
- ✅ Melhor UX com feedback imediato
- ✅ Sem loops infinitos ou re-renders desnecessários

---

**Data de Criação:** Janeiro 2025  
**Prioridade:** ALTA  
**Estimativa:** 2-3 horas

