/**
 * Select de marca com opção de criar nova
 * 
 * AIDEV-NOTE: Componente isolado para seleção de marca
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface BrandSelectProps {
  formData: any;
  brands: Array<{ id: string; name: string }>;
  isLoadingBrands: boolean;
  brandsError?: Error | string | null | undefined;
  onValueChange: (value: string) => void;
  onCreateNew: () => void;
}

export function BrandSelect({
  formData,
  brands,
  isLoadingBrands,
  brandsError,
  onValueChange,
  onCreateNew,
}: BrandSelectProps) {
  return (
    <div>
      <Label htmlFor="brand" className="text-sm font-medium">
        Marca
      </Label>
      <Select
        value={(formData as any).brand_id || (formData as any).brand || undefined}
        onValueChange={(value) => {
          if (value === '__create_new__') {
            onCreateNew();
          } else {
            onValueChange(value);
          }
        }}
        disabled={isLoadingBrands}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {isLoadingBrands ? (
            <div className="p-2 text-sm text-muted-foreground">Carregando marcas...</div>
          ) : brandsError ? (
            <div className="p-2 text-sm text-destructive">Erro ao carregar marcas</div>
          ) : brands && brands.length > 0 ? (
            <>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
              <SelectItem value="__create_new__" className="text-primary font-medium border-t">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Criar nova marca</span>
                </div>
              </SelectItem>
            </>
          ) : (
            <>
              <div className="p-2 text-sm text-muted-foreground">Nenhuma marca cadastrada</div>
              <SelectItem value="__create_new__" className="text-primary font-medium border-t">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Criar nova marca</span>
                </div>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

