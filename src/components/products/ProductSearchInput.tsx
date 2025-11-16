/**
 * Componente de busca de produtos com autocomplete
 * 
 * AIDEV-NOTE: Componente para buscar produtos com autocomplete
 * usando Command do shadcn/ui
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSecureProducts, type Product } from '@/hooks/useSecureProducts';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductSearchInputProps {
  value?: string; // product_id
  onValueChange: (productId: string | null, product: Product | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  height?: 'default' | 'small'; // AIDEV-NOTE: 'default' = h-10 (40px), 'small' = h-[25px]
}

export function ProductSearchInput({
  value,
  onValueChange,
  placeholder = 'Buscar produto...',
  disabled = false,
  className,
  height = 'small' // AIDEV-NOTE: Padrão é 'small' (25px) para modais, mas pode ser 'default' (40px) para páginas
}: ProductSearchInputProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  // AIDEV-NOTE: Manter referência ao produto selecionado mesmo que não esteja na lista atual
  const [selectedProductCache, setSelectedProductCache] = React.useState<Product | null>(null);

  // AIDEV-NOTE: Buscar produtos com termo de busca
  const { products, isLoading } = useSecureProducts({
    searchTerm,
    limit: 50
  });

  // AIDEV-NOTE: Atualizar cache quando encontrar produto na lista
  React.useEffect(() => {
    if (value && products.length > 0) {
      const found = products.find(p => p.id === value);
      if (found) {
        setSelectedProductCache(found);
      }
    } else if (!value) {
      setSelectedProductCache(null);
    }
  }, [value, products]);

  // Produto selecionado - buscar na lista atual ou no cache
  const selectedProduct = React.useMemo(() => {
    if (!value) return null;
    const found = products.find(p => p.id === value);
    if (found) {
      return found;
    }
    // Se não encontrou na lista atual, usar o cache
    if (selectedProductCache && selectedProductCache.id === value) {
      return selectedProductCache;
    }
    return null;
  }, [value, products, selectedProductCache]);

  // Formatar exibição do produto selecionado
  const displayValue = React.useMemo(() => {
    if (!selectedProduct) return placeholder;
    
    const code = selectedProduct.code || selectedProduct.sku || '';
    const name = selectedProduct.name || '';
    
    if (code && name) {
      return `${code} - ${name}`;
    }
    return name || code || placeholder;
  }, [selectedProduct, placeholder]);

  const handleSelect = React.useCallback((productId: string) => {
    const product = products.find(p => p.id === productId) || null;
    if (product) {
      // Armazenar no cache
      setSelectedProductCache(product);
      // Sempre definir o valor quando um produto é selecionado
      onValueChange(productId, product);
      setOpen(false);
      setSearchTerm(''); // Limpar busca após seleção
    }
  }, [products, onValueChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-input text-foreground border-[0.8px] border-[#b9b9b9] focus:border-black rounded-[1.2px]",
            height === 'default' ? "h-10 px-3 py-2" : "h-[25px] px-2 py-0",
            !selectedProduct && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package className="h-3 w-3 shrink-0 opacity-50" />
            <span className="truncate text-input">{displayValue}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="border-b px-3 py-2">
          <input
            type="text"
            placeholder="Buscar por código ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : products.length > 0 ? (
            <div className="p-1">
              {products.map((product) => {
                const code = product.code || product.sku || '';
                const name = product.name || '';
                const display = code && name ? `${code} - ${name}` : name || code;
                
                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      handleSelect(product.id);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(product.id);
                    }}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === product.id && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{display}</span>
                      {product.description && (
                        <span className="text-small text-muted-foreground truncate">
                          {product.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum produto encontrado.' : 'Digite para buscar produtos...'}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

