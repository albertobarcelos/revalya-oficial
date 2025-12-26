/**
 * Select de categoria com opção de criar nova
 * 
 * AIDEV-NOTE: Componente isolado para seleção de categoria
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface CategorySelectProps {
  formData: any;
  categories: Array<{ id: string; name: string }>;
  isLoadingCategories: boolean;
  onValueChange: (value: string) => void;
  onCreateNew: () => void;
}

export function CategorySelect({
  formData,
  categories,
  isLoadingCategories,
  onValueChange,
  onCreateNew,
}: CategorySelectProps) {
  return (
    <div>
      <Label htmlFor="category" className="text-sm font-medium">
        Categoria
      </Label>
      <Select
        value={(formData as any).category_id || ''}
        onValueChange={(value) => {
          if (value === '__create_new_category__') {
            onCreateNew();
          } else {
            onValueChange(value);
          }
        }}
        disabled={isLoadingCategories}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
          <SelectItem value="__create_new_category__" className="text-primary font-medium border-t">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Criar nova categoria</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

