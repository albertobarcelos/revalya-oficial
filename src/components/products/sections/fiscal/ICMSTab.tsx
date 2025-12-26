/**
 * Aba: ICMS
 * 
 * AIDEV-NOTE: Configurações de ICMS com CST validado
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCSTReference } from '@/hooks/useCSTReference';
import type { FiscalData } from '../../types/product-form.types';

interface ICMSTabProps {
  fiscalData: FiscalData;
  onFiscalDataChange: (data: Partial<FiscalData>) => void;
  enabled?: boolean;
}

export function ICMSTab({ fiscalData, onFiscalDataChange, enabled = true }: ICMSTabProps) {
  // AIDEV-NOTE: Buscar CSTs ICMS ativos e validados
  const { csts, isLoading: isLoadingCSTs } = useCSTReference({
    type: 'icms',
    enabled,
  });

  // AIDEV-NOTE: Handler para mudança de CST ICMS
  const handleCSTChange = (cstId: string) => {
    const selectedCST = csts.find(c => c.id === cstId);
    if (selectedCST) {
      onFiscalDataChange({ 
        cst_icms_id: cstId,
        cst_icms: selectedCST.code // AIDEV-NOTE: Manter código legado para compatibilidade
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="cst_icms" className="text-sm font-medium">
          Situação tributária (CST) <span className="text-destructive">*</span>
        </Label>
        <Select
          value={fiscalData.cst_icms_id || ''}
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

      {/* AIDEV-NOTE: Campos adicionais de ICMS podem ser adicionados aqui */}
      <div className="bg-muted/30 rounded-lg border border-border/30 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Outros campos de ICMS serão adicionados conforme necessidade.
        </p>
      </div>
    </div>
  );
}

