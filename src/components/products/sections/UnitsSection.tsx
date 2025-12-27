/**
 * Seção: Unidades e Códigos GTIN
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FormSectionProps } from '../types/product-form.types';

const UNIT_OPTIONS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'm2', label: 'Metro Quadrado (m²)' },
  { value: 'm3', label: 'Metro Cúbico (m³)' },
];

export function UnitsSection({ formData, onChange }: FormSectionProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="principal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="principal">Unidade principal</TabsTrigger>
          <TabsTrigger value="embalagens">Caixas, pacotes ou embalagens</TabsTrigger>
        </TabsList>
        
        {/* AIDEV-NOTE: Manter todas as abas montadas, alternar visibilidade via CSS (estilo SPA) */}
        <TabsContent value="principal" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="unit_of_measure" className="text-sm font-medium">
              Unidade de medida
            </Label>
            <Select
              value={formData.unit_of_measure || ''}
              onValueChange={(value) => onChange({
                target: { name: 'unit_of_measure', value }
              } as any)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
        
        <TabsContent value="embalagens" className="mt-4">
          <p className="text-sm text-muted-foreground">
            Funcionalidade de embalagens em desenvolvimento
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

