import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { formatCpfCnpj, formatDate } from '@/lib/utils';
import type { FinanceEntry } from '@/services/financeEntriesService';

interface RecebimentosByCustomerProps {
  recebimentos: FinanceEntry[];
  formatCurrency: (value: number) => string;
  onEdit: (entry: FinanceEntry) => void;
}

interface CustomerGroup {
  customerId: string;
  customerName: string;
  count: number;
  lastEntryDate: string | null;
  totalAmount: number;
  entries: FinanceEntry[];
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL'; // Simplificado para exibição
}

export function RecebimentosByCustomer({ recebimentos, formatCurrency, onEdit }: RecebimentosByCustomerProps) {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const groupedData = useMemo(() => {
    const groups: Record<string, CustomerGroup> = {};

    recebimentos.forEach(entry => {
      const customerId = entry.customer_id || 'unknown';
      const customerName = entry.customer?.name || 'Cliente Desconhecido';
      
      if (!groups[customerId]) {
        groups[customerId] = {
          customerId,
          customerName,
          count: 0,
          lastEntryDate: null,
          totalAmount: 0,
          entries: [],
          status: 'PENDING' 
        };
      }

      groups[customerId].count += 1;
      groups[customerId].totalAmount += Number(entry.amount || 0);
      groups[customerId].entries.push(entry);

      // Atualizar data mais recente
      if (entry.due_date) {
        if (!groups[customerId].lastEntryDate || new Date(entry.due_date) > new Date(groups[customerId].lastEntryDate!)) {
          groups[customerId].lastEntryDate = entry.due_date;
        }
      }
    });

    return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [recebimentos]);

  const toggleExpand = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  // Helper para determinar status geral do cliente (exemplo simples)
  const getCustomerStatus = (entries: FinanceEntry[]) => {
    const hasOverdue = entries.some(e => e.status === 'OVERDUE');
    if (hasOverdue) return <span className="text-destructive font-medium">Em atraso</span>;
    
    const allPaid = entries.every(e => e.status === 'PAID' || e.status === 'RECEIVED');
    if (allPaid) return <span className="text-success font-medium">Em dia</span>;

    return <span className="text-yellow-600 font-medium">Pendente</span>;
  };

  return (
    <div className="space-y-4">
      {groupedData.map((group) => (
        <Card key={group.customerId} className="overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpand(group.customerId)}
            >
              <div className="flex-1">
                <h3 className="text-lg font-bold">{group.customerName}</h3>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-2">
                  <span>{group.count} recebimento{group.count !== 1 ? 's' : ''}</span>
                  {group.lastEntryDate && (
                    <>
                      <span>•</span>
                      <span>Último em {formatDate(group.lastEntryDate)}</span>
                    </>
                  )}
                </div>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-primary mt-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(group.customerId);
                  }}
                >
                  Ver detalhes <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${expandedCustomers.has(group.customerId) ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold">{formatCurrency(group.totalAmount)}</div>
                <div className="text-sm">
                  {getCustomerStatus(group.entries)}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedCustomers.has(group.customerId) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t bg-muted/20"
                >
                  <div className="p-4 space-y-2">
                    {group.entries.map(entry => (
                      <div 
                        key={entry.id} 
                        className="flex justify-between items-center text-sm p-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => onEdit(entry)}
                      >
                        <div className="flex flex-col">
            <span className="font-medium">{entry.description}</span>
            <span className="text-xs text-muted-foreground">
              Vence em {formatDate(entry.due_date)}
            </span>
          </div>
                        <div className="flex items-center gap-4">
                          <StatusBadge status={entry.status} />
                          <span className="font-medium w-[100px] text-right">
                            {formatCurrency(Number(entry.amount))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
