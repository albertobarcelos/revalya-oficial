/**
 * Aba: Reforma Tributária
 * 
 * AIDEV-NOTE: Campos relacionados à reforma tributária (IBS, CBS, etc.)
 */

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { FiscalData } from '../../types/product-form.types';

interface TaxReformTabProps {
  fiscalData: FiscalData;
  onFiscalDataChange: (data: Partial<FiscalData>) => void;
  enabled?: boolean;
}

export function TaxReformTab({ fiscalData, onFiscalDataChange, enabled = true }: TaxReformTabProps) {
  return (
    <div className="space-y-6">
      {/* AIDEV-NOTE: Aviso importante sobre reforma tributária */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Importante! Em 2026, somente as empresas enquadradas no regime normal de tributação (CRT = 3) 
          deverão preencher os campos relacionados à reforma tributária.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cst_ibs_cbs" className="text-sm font-medium">
            Situação Tributária (CST) do IBS e CBS
          </Label>
          <Select
            value={fiscalData.cst_ibs_cbs || ''}
            onValueChange={(value) => onFiscalDataChange({ cst_ibs_cbs: value })}
            disabled={!enabled}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {/* AIDEV-NOTE: CSTs de reforma tributária serão adicionados quando disponíveis */}
              <SelectItem value="placeholder" disabled>
                Em breve...
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="cclass_trib" className="text-sm font-medium">
            Classificação Tributária (cClassTrib)
          </Label>
          <Select
            value={fiscalData.cclass_trib || ''}
            onValueChange={(value) => onFiscalDataChange({ cclass_trib: value })}
            disabled={!enabled}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {/* AIDEV-NOTE: Classificações tributárias serão adicionadas quando disponíveis */}
              <SelectItem value="placeholder" disabled>
                Em breve...
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

