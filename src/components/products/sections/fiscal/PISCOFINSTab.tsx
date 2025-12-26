/**
 * Aba: PIS/COFINS
 * 
 * AIDEV-NOTE: Configurações de PIS/COFINS com CSTs validados
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCSTReference } from '@/hooks/useCSTReference';
import { Switch } from '@/components/ui/switch';
import type { FiscalData } from '../../types/product-form.types';

interface PISCOFINSTabProps {
  fiscalData: FiscalData;
  onFiscalDataChange: (data: Partial<FiscalData>) => void;
  enabled?: boolean;
}

export function PISCOFINSTab({ fiscalData, onFiscalDataChange, enabled = true }: PISCOFINSTabProps) {
  // AIDEV-NOTE: Buscar CSTs PIS/COFINS ativos e validados
  const { csts, isLoading: isLoadingCSTs } = useCSTReference({
    type: 'pis_cofins',
    enabled,
  });

  // AIDEV-NOTE: Filtrar CSTs por aplicação (PIS, COFINS ou ambos)
  const pisCSTs = csts.filter(c => c.applies_to === 'pis' || c.applies_to === 'both');
  const cofinsCSTs = csts.filter(c => c.applies_to === 'cofins' || c.applies_to === 'both');

  // AIDEV-NOTE: Handler para mudança de CST PIS
  const handlePISChange = (cstId: string) => {
    const selectedCST = pisCSTs.find(c => c.id === cstId);
    if (selectedCST) {
      onFiscalDataChange({ 
        cst_pis_id: cstId,
        cst_pis: selectedCST.code // AIDEV-NOTE: Manter código legado para compatibilidade
      });
    }
  };

  // AIDEV-NOTE: Handler para mudança de CST COFINS
  const handleCOFINSChange = (cstId: string) => {
    const selectedCST = cofinsCSTs.find(c => c.id === cstId);
    if (selectedCST) {
      onFiscalDataChange({ 
        cst_cofins_id: cstId,
        cst_cofins: selectedCST.code // AIDEV-NOTE: Manter código legado para compatibilidade
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* PIS / COFINS de saída */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">PIS / COFINS de saída</h3>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="use_default_pis_cofins" 
            checked={fiscalData.use_default_pis_cofins || false}
            onCheckedChange={(checked) => onFiscalDataChange({ use_default_pis_cofins: checked })}
          />
          <Label htmlFor="use_default_pis_cofins" className="text-sm font-normal">
            Utilizar a configuração padrão da minha empresa
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="cst_pis" className="text-sm font-medium">
              Situação tributária <span className="text-destructive">*</span>
            </Label>
            <Select
              value={fiscalData.cst_pis_id || ''}
              onValueChange={handlePISChange}
              disabled={isLoadingCSTs || fiscalData.use_default_pis_cofins}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={isLoadingCSTs ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {pisCSTs.map((cst) => (
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

          <div>
            <Label htmlFor="aliquota_pis" className="text-sm font-medium">
              Alíquota PIS
            </Label>
            <Input
              id="aliquota_pis"
              type="number"
              step="0.01"
              value={fiscalData.aliquota_pis || ''}
              onChange={(e) => onFiscalDataChange({ aliquota_pis: e.target.value })}
              placeholder="0,00 %"
              className="mt-1"
              disabled={fiscalData.use_default_pis_cofins}
            />
          </div>

          <div>
            <Label htmlFor="aliquota_cofins" className="text-sm font-medium">
              Alíquota Cofins
            </Label>
            <Input
              id="aliquota_cofins"
              type="number"
              step="0.01"
              value={fiscalData.aliquota_cofins || ''}
              onChange={(e) => onFiscalDataChange({ aliquota_cofins: e.target.value })}
              placeholder="0,00 %"
              className="mt-1"
              disabled={fiscalData.use_default_pis_cofins}
            />
          </div>
        </div>
      </div>

      {/* PIS / COFINS de entrada */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">PIS / COFINS de entrada</h3>
        
        <div>
          <Label htmlFor="cst_cofins" className="text-sm font-medium">
            Situação tributária
          </Label>
          <Select
            value={fiscalData.cst_cofins_id || ''}
            onValueChange={handleCOFINSChange}
            disabled={isLoadingCSTs}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={isLoadingCSTs ? "Carregando..." : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {cofinsCSTs.map((cst) => (
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
      </div>
    </div>
  );
}

