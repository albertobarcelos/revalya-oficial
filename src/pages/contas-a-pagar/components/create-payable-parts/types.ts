import { PayableInsert, PayableRow } from '@/services/financialPayablesService';

export type PayableFormPayload = Omit<PayableInsert, 'tenant_id'>;

export interface CreatePayableModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (payload: PayableFormPayload) => void;
  onSaveAndAddAnother: (payload: PayableFormPayload) => void;
  onGenerateRecurrences?: (payload: PayableFormPayload) => Promise<any>;
  currentTenantId?: string;
}

export interface SimulationItem {
  parcela: string;
  vencimento: string;
  previsao: string;
  valor: number;
  situacao: string;
}

export type TabType = 'dados' | 'repeticoes' | 'lancamentos' | 'historico';
export type RecurrencePeriod = 'WEEKLY' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL';
export type WeekendRule = 'KEEP' | 'ANTICIPATE' | 'POSTPONE';
