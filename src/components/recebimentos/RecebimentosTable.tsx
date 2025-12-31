import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge } from './StatusBadge';
import { formatCpfCnpj, formatDate } from '@/lib/utils';
import type { FinanceEntry } from '@/services/financeEntriesService';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';

interface RecebimentosTableProps {
  recebimentos: FinanceEntry[];
  bankLabelById: Map<string, string>;
  selectingEntryId: string | null;
  setSelectingEntryId: (id: string | null) => void;
  bankAccounts: Array<{ id: string; label: string }>;
  bankAccountsLoading: boolean;
  onAssociateBankAccount: (entryId: string, bankAccountId: string) => void;
  onMarkAsPaid: (entryId: string) => void;
  onEdit?: (entry: FinanceEntry) => void;
  formatCurrency: (value: number) => string;
}

/**
 * Tabela de listagem e ações de recebimentos.
 */
export function RecebimentosTable({
  recebimentos,
  bankLabelById,
  selectingEntryId,
  setSelectingEntryId,
  bankAccounts,
  bankAccountsLoading,
  onAssociateBankAccount,
  onMarkAsPaid,
  onEdit,
  formatCurrency
}: RecebimentosTableProps) {
  const { currentTenant } = useTenantAccessGuard();

  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>CPF/CNPJ</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Conta</TableHead>
          <TableHead>Data Pagamento</TableHead>
          <TableHead className="w-[160px] min-w-[160px]">Valor</TableHead>
          <TableHead className="w-[160px] min-w-[160px]">Valor Líquido</TableHead>
          <TableHead className="w-[160px] min-w-[160px]">Taxas</TableHead>
          <TableHead className="text-right w-[60px] min-w-[60px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <AnimatePresence initial={false}>
          {recebimentos.map((entry) => (
            <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TableCell>{entry.customer?.name || '-'}</TableCell>
              <TableCell>{entry.customer?.company || '-'}</TableCell>
              <TableCell>{formatCpfCnpj(entry.customer?.cpf_cnpj)}</TableCell>
              <TableCell className="font-medium">{entry.description}</TableCell>
              <TableCell>
                {formatDate(entry.due_date)}
              </TableCell>
              <TableCell>
                <StatusBadge status={entry.status} />
              </TableCell>
              <TableCell>
                {entry.bank_account_id ? (
                  bankLabelById.get(String(entry.bank_account_id)) || '-'
                ) : (
                  selectingEntryId === entry.id ? (
                    <Select onValueChange={(value) => onAssociateBankAccount(entry.id, value)}>
                      <SelectTrigger className="h-9 w-[220px]">
                        <SelectValue placeholder={bankAccountsLoading ? 'Carregando...' : 'Selecione a conta'} />
                      </SelectTrigger>
                      <SelectContent className="w-[300px] max-h-[300px]">
                        {bankAccounts.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setSelectingEntryId(entry.id)} disabled={bankAccountsLoading}>
                      Associar Conta
                    </Button>
                  )
                )}
              </TableCell>
              <TableCell>
                {formatDate(entry.payment_date)}
              </TableCell>
              <TableCell>{formatCurrency(entry.amount || 0)}</TableCell>
              <TableCell>{formatCurrency(entry.charge?.net_value ?? entry.amount ?? 0)}</TableCell>
              <TableCell>{formatCurrency((entry.amount ?? 0) - (entry.charge?.net_value ?? entry.amount ?? 0))}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {entry.status === 'PENDING' && (
              <Button size="sm" variant="outline" onClick={() => onMarkAsPaid(entry.id)}>
                Marcar como Pago
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onEdit?.(entry)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
            </motion.tr>
          ))}
        </AnimatePresence>
      </TableBody>
    </Table>
  );
}

