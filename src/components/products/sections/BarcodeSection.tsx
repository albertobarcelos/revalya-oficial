/**
 * Seção: Códigos de Barras (SKU)
 * 
 * AIDEV-NOTE: Componente para gerenciar múltiplos códigos de barras por produto
 * Formato: array de objetos { unit: string, code: string }
 * Performance: Memoizado para evitar re-renders desnecessários
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Barcode, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormSectionProps } from '../types/product-form.types';

// AIDEV-NOTE: Interface para código de barras
interface BarcodeItem {
  unit: string;
  code: string;
}

// AIDEV-NOTE: Opções de unidade (mesmas do GeneralDataSection)
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

// AIDEV-NOTE: Componente memoizado para evitar re-renders desnecessários
export const BarcodeSection = React.memo(function BarcodeSection({ formData, onChange }: FormSectionProps) {
  // AIDEV-NOTE: Parsear barcode do formData (pode ser JSONB string ou array)
  const barcodes: BarcodeItem[] = useMemo(() => {
    const barcodeValue = (formData as any).barcode;
    if (!barcodeValue) return [];
    
    // Se for string, tentar parsear como JSON
    if (typeof barcodeValue === 'string') {
      try {
        const parsed = JSON.parse(barcodeValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    
    // Se já for array, retornar diretamente
    if (Array.isArray(barcodeValue)) {
      return barcodeValue;
    }
    
    return [];
  }, [(formData as any).barcode]);

  const [autoGenerate, setAutoGenerate] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('un');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(barcodes.length > 0);

  // AIDEV-NOTE: Atualizar barcodes no formData
  const updateBarcodes = useCallback((newBarcodes: BarcodeItem[]) => {
    onChange({
      target: { 
        name: 'barcode', 
        value: newBarcodes.length > 0 ? JSON.stringify(newBarcodes) : null
      }
    } as any);
  }, [onChange]);

  // AIDEV-NOTE: Adicionar novo código de barras
  const handleAddBarcode = useCallback(() => {
    if (!barcodeInput.trim()) return;

    const newBarcode: BarcodeItem = {
      unit: selectedUnit,
      code: barcodeInput.trim(),
    };

    // AIDEV-NOTE: Verificar se código já existe
    const exists = barcodes.some(
      b => b.unit === newBarcode.unit && b.code === newBarcode.code
    );

    if (exists) {
      // AIDEV-NOTE: Código já existe, não adicionar
      return;
    }

    const updatedBarcodes = [...barcodes, newBarcode];
    updateBarcodes(updatedBarcodes);
    setBarcodeInput('');
    
    // AIDEV-NOTE: Expandir seção se estiver fechada
    if (!isExpanded) {
      setIsExpanded(true);
    }
  }, [barcodeInput, selectedUnit, barcodes, updateBarcodes, isExpanded]);

  // AIDEV-NOTE: Remover código de barras
  const handleRemoveBarcode = useCallback((index: number) => {
    const updatedBarcodes = barcodes.filter((_, i) => i !== index);
    updateBarcodes(updatedBarcodes);
  }, [barcodes, updateBarcodes]);

  // AIDEV-NOTE: Gerar código automaticamente (placeholder - implementar lógica se necessário)
  const handleAutoGenerate = useCallback((checked: boolean) => {
    setAutoGenerate(checked);
    // TODO: Implementar lógica de geração automática
  }, []);

  // AIDEV-NOTE: Obter label da unidade
  const getUnitLabel = useCallback((unit: string) => {
    return UNIT_OPTIONS.find(u => u.value === unit)?.label.split('(')[0].trim() || unit.toUpperCase();
  }, []);

  // AIDEV-NOTE: Agrupar códigos por unidade
  const barcodesByUnit = useMemo(() => {
    const grouped: Record<string, BarcodeItem[]> = {};
    barcodes.forEach(barcode => {
      if (!grouped[barcode.unit]) {
        grouped[barcode.unit] = [];
      }
      grouped[barcode.unit].push(barcode);
    });
    return grouped;
  }, [barcodes]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Códigos de barras (SKU)</h3>
        
        {/* Checkbox Gerar automaticamente */}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="auto-generate"
            checked={autoGenerate}
            onCheckedChange={handleAutoGenerate}
          />
          <Label 
            htmlFor="auto-generate" 
            className="text-sm font-medium cursor-pointer"
          >
            Gerar automaticamente
          </Label>
        </div>

        {/* Campos de entrada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gerar SKU para a unidade */}
          <div>
            <Label htmlFor="unit-for-sku" className="text-sm font-medium">
              Gerar SKU para a unidade
            </Label>
            <Select
              value={selectedUnit}
              onValueChange={setSelectedUnit}
              disabled={autoGenerate}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
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

          {/* Código de barras (SKU) */}
          <div>
            <Label htmlFor="barcode-input" className="text-sm font-medium">
              Código de barras (SKU)
            </Label>
            <div className="mt-1 relative">
              <Input
                id="barcode-input"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBarcode();
                  }
                }}
                placeholder="Digite o código de barras"
                className="pr-10"
                disabled={autoGenerate}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={handleAddBarcode}
                disabled={!barcodeInput.trim() || autoGenerate}
              >
                <Barcode className="h-4 w-4" />
              </Button>
            </div>
            {/* AIDEV-NOTE: Botão "Adicionar novo" que aparece quando há texto no input */}
            {barcodeInput.trim() && !autoGenerate && (
              <Button
                type="button"
                variant="default"
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleAddBarcode}
              >
                Adicionar novo: {barcodeInput.trim()}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Seção de códigos cadastrados */}
      {barcodes.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* AIDEV-NOTE: Header com fundo #dddaeb e cantos arredondados no topo */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ 
              backgroundColor: '#dddaeb',
              borderRadius: isExpanded ? '0.5rem 0.5rem 0 0' : '0.5rem'
            }}
          >
            <span className="text-blue-900 dark:text-blue-100">
              {isExpanded ? '▼' : '▲'} Códigos de barras (SKU) cadastrados
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-400">
              {barcodes.length} {barcodes.length === 1 ? 'código' : 'códigos'}
            </span>
          </button>
          
          {isExpanded && (
            <div className="bg-white p-4">
              {/* AIDEV-NOTE: Agrupar por unidade */}
              {Object.entries(barcodesByUnit).map(([unit, unitBarcodes], unitGroupIndex, allUnits) => (
                <div key={unit}>
                  {/* AIDEV-NOTE: Label da unidade à esquerda em negrito */}
                  <div className="text-sm font-bold text-gray-700 mb-2">
                    {getUnitLabel(unit)}
                  </div>
                  
                  {/* AIDEV-NOTE: Tags com cantos arredondados, cor #e6ebf2 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {unitBarcodes.map((barcode, unitIndex) => {
                      // AIDEV-NOTE: Encontrar o índice real no array original
                      const matchingIndices: number[] = [];
                      barcodes.forEach((b, idx) => {
                        if (b.unit === barcode.unit && b.code === barcode.code) {
                          matchingIndices.push(idx);
                        }
                      });
                      const indexToUse = matchingIndices[unitIndex] ?? matchingIndices[0] ?? 0;
                      
                      return (
                        <div
                          key={`${barcode.unit}-${barcode.code}-${unitIndex}-${indexToUse}`}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                          style={{ 
                            backgroundColor: '#e6ebf2'
                          }}
                        >
                          <span className="text-sm text-gray-700">
                            {barcode.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBarcode(indexToUse)}
                            className="hover:bg-gray-300 rounded p-0.5 transition-colors flex items-center justify-center"
                            title="Remover código"
                          >
                            <X className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* AIDEV-NOTE: Linha separadora cinza claro abaixo (exceto no último grupo) */}
                  {unitGroupIndex < allUnits.length - 1 && (
                    <div className="border-t border-gray-200 mb-4"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // AIDEV-NOTE: Comparação customizada - só re-renderiza se formData.barcode mudar
  return (
    prevProps.formData === nextProps.formData &&
    prevProps.onChange === nextProps.onChange
  );
});
