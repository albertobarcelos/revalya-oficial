export interface PayablesFilters {
  search: string;
  status: string[];
  dateFrom: string;
  dateTo: string;
  issueFrom?: string;
  issueTo?: string;
  paymentFrom?: string;
  paymentTo?: string;
  minAmount?: string;
  maxAmount?: string;
  category?: string;
  paymentMethod?: string;
  documentId?: string;
  storeId?: string;
  supplier?: string;
  reversalFrom?: string;
  reversalTo?: string;
  page: number;
}
