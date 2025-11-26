import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Contract } from '@/types';

type RecentContractsProps = {
  contracts: Contract[];
};

function formatRecentContractStatus(status: string): string {
  switch (status) {
    case 'RAFT':
      return 'Rascunho';
    case 'ACTIVE':
      return 'Ativo';
    case 'SUSPENDED':
      return 'Suspenso';
    default:
      return status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  }
}

export function RecentContracts({ contracts }: RecentContractsProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-base font-medium text-foreground">Contratos Recentes</h3>
      </div>
      <div className="p-0 max-h-[300px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground">Cliente</TableHead>
              <TableHead className="text-foreground">Valor</TableHead>
              <TableHead className="text-foreground">Início</TableHead>
              <TableHead className="text-foreground">Status</TableHead>
              <TableHead className="text-right text-foreground">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="text-foreground font-medium">{contract.customers?.name || 'N/A'}</TableCell>
                <TableCell className={`font-medium ${styleForContractStatus(contract.status).amount}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.total_amount || 0)}
                </TableCell>
                {/* AIDEV-NOTE: Corrigido timezone - usar parseISO */}
                <TableCell className="text-foreground">{format(parseISO(contract.initial_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                <TableCell className={`font-medium ${styleForContractStatus(contract.status).status}`}>
                  {formatRecentContractStatus(contract.status)}
                </TableCell>
                <TableCell className="text-right text-foreground">{contract.created_at ? new Date(contract.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function styleForContractStatus(status: string) {
  switch (status) {
    case 'ACTIVE':
      return { status: 'text-success', amount: 'text-success' };
    case 'PENDING':
      return { status: 'text-warning', amount: 'text-warning' };
    case 'SUSPENDED':
    case 'EXPIRED':
      return { status: 'text-danger', amount: 'text-danger' };
    default:
      return { status: 'text-foreground', amount: 'text-foreground' };
  }
}
