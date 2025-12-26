/**
 * Aba: IPI
 * 
 * AIDEV-NOTE: Configurações de IPI com CST validado
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCSTReference } from '@/hooks/useCSTReference';
import type { FiscalData } from '../../types/product-form.types';

interface IPITabProps {
  fiscalData: FiscalData;
  onFiscalDataChange: (data: Partial<FiscalData>) => void;
  enabled?: boolean;
}

export function IPITab({ fiscalData, onFiscalDataChange, enabled = true }: IPITabProps) {
  // AIDEV-NOTE: Buscar CSTs IPI ativos e validados
  const { csts, isLoading: isLoadingCSTs } = useCSTReference({
    type: 'ipi',
    enabled,
  });

  // AIDEV-NOTE: Handler para mudança de CST IPI
  const handleCSTChange = (cstId: string) => {
    const selectedCST = csts.find(c => c.id === cstId);
    if (selectedCST) {
      onFiscalDataChange({ 
        cst_ipi_id: cstId,
        cst_ipi: selectedCST.code // AIDEV-NOTE: Manter código legado para compatibilidade
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="cst_ipi" className="text-sm font-medium">
          Situação tributária <span className="text-destructive">*</span>
        </Label>
        <Select
          value={fiscalData.cst_ipi_id || ''}
          onValueChange={handleCSTChange}
          disabled={isLoadingCSTs}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={isLoadingCSTs ? "Carregando..." : "Selecione o CST"} />
          </SelectTrigger>
          <SelectContent>
            {csts.map((cst) => (
              <SelectItem key={cst.id} value={cst.id}>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{cst.code}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{cst.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* AIDEV-NOTE: Campos adicionais de IPI podem ser adicionados aqui */}
      <div className="bg-muted/30 rounded-lg border border-border/30 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Outros campos de IPI serão adicionados conforme necessidade.
        </p>
      </div>
    </div>
  );
}

