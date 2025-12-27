import { PayableRow } from '@/services/financialPayablesService';

export interface EditPayableModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: any | null;
  onSave: (variables: { id: string; patch: any }) => void;
  currentTenantId?: string;
  onAddLaunchPatch?: (variables: { id: string; patch: any }) => void;
  readOnly?: boolean;
  onSwitchEntry?: (entry: PayableRow) => void;
}

export interface SimulationItem {
  parcela: string;
  vencimento: string;
  previsao: string;
  valor: number;
  situacao: string;
  // AIDEV-NOTE: Adicionando campos opcionais para customização manual
  customAmount?: number;
  customDueDate?: string;
  customCustomerId?: string;
  customDocumentId?: string;
  customEntryNumber?: string;
  customCategoryId?: string;
  customBankAccountId?: string;
}

export interface LaunchItem {
  amount: number;
  date: string;
  typeId: string;
  description: string;
}

export type TabType = 'dados' | 'repeticoes' | 'lancamentos' | 'historico';
export type RecurrencePeriod = 'WEEKLY' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL';
export type WeekendRule = 'KEEP' | 'ANTICIPATE' | 'POSTPONE';
