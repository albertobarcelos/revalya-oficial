import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Task = {
  id: string;
  description: string;
  due_date: string;
  status: string;
};

type PendingTasksProps = {
  tasks: Task[];
};

export function PendingTasks({ tasks }: PendingTasksProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-base font-medium">Tarefas Pendentes</h3>
      </div>
      <div className="p-0 max-h-[300px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.description}</TableCell>
                <TableCell>{format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                <TableCell>{task.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
