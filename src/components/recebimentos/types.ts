export interface RecebimentosFilters {
  search: string;
  status: string | string[]; // Recebimentos.tsx uses string, AdvancedFilters uses string[]
  dateFrom: string;
  dateTo: string;
  type: string;
  page: number;
  limit: number;
  // Advanced filters
  category?: string;
  paymentFrom?: string;
  paymentTo?: string;
  minAmount?: string;
  maxAmount?: string;
  bankAccountId?: string;
  customerId?: string;
  documentId?: string;
}
