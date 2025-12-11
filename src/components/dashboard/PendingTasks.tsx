import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Task = {
  id: string;
  title?: string;
  description?: string;
  due_date?: string;
  status: string;
  created_at?: string;
};

type PendingTasksProps = {
  tasks: Task[];
};

/**
 * Formata o status da tarefa para português
 */
function formatTaskStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'in_progress':
      return 'Em andamento';
    case 'completed':
      return 'Concluída';
    default:
      return status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  }
}

export function PendingTasks({ tasks }: PendingTasksProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-base font-medium text-foreground">Tarefas Pendentes</h3>
      </div>
      <div className="p-0 max-h-[300px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="text-foreground">{task.title || task.description || '-'}</TableCell>
                <TableCell>{task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</TableCell>
                <TableCell className={`font-medium ${styleForTaskStatus(task.status)}`}>
                  {formatTaskStatus(task.status)}
                </TableCell>
                <TableCell className="text-right">{task.created_at ? new Date(task.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function styleForTaskStatus(status: string) {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'in_progress':
      return 'text-warning';
    case 'pending':
      return 'text-warning';
    default:
      return 'text-foreground';
  }
}
