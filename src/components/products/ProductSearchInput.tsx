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
}

export function ProductSearchInput({
  value,
  onValueChange,
  placeholder = 'Buscar produto...',
  disabled = false,
  className
}: ProductSearchInputProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  // AIDEV-NOTE: Buscar produtos com termo de busca
  const { products, isLoading } = useSecureProducts({
    searchTerm,
    limit: 50
  });

  // Produto selecionado
  const selectedProduct = React.useMemo(() => {
    if (!value) return null;
    return products.find(p => p.id === value) || null;
  }, [value, products]);

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

  const handleSelect = (productId: string) => {
    const product = products.find(p => p.id === productId) || null;
    onValueChange(productId === value ? null : productId, product);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedProduct && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{displayValue}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por código ou nome..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchTerm ? 'Nenhum produto encontrado.' : 'Digite para buscar produtos...'}
                </CommandEmpty>
                <CommandGroup>
                  {products.map((product) => {
                    const code = product.code || product.sku || '';
                    const name = product.name || '';
                    const display = code && name ? `${code} - ${name}` : name || code;
                    
                    return (
                      <CommandItem
                        key={product.id}
                        value={product.id}
                        onSelect={() => handleSelect(product.id)}
                        className="flex items-center gap-2"
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
                            <span className="text-[12px] text-muted-foreground truncate">
                              {product.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

