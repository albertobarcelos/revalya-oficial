import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Contract } from '@/types';

type RecentContractsProps = {
  contracts: Contract[];
};

export function RecentContracts({ contracts }: RecentContractsProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-base font-medium">Contratos Recentes</h3>
      </div>
      <div className="p-0 max-h-[300px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell>{contract.customer?.name || 'N/A'}</TableCell>
                <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.amount || 0)}</TableCell>
                {/* AIDEV-NOTE: Corrigido timezone - usar parseISO */}
                <TableCell>{format(parseISO(contract.initial_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                <TableCell>{contract.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
