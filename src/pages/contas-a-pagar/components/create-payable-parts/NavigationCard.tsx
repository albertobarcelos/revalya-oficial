import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, RefreshCw, DollarSign, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabType, PayableFormPayload } from './types';
import { PayableRow } from '@/services/financialPayablesService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NavigationCardProps {
  tab: TabType;
  setTab: (tab: TabType) => void;
  createdEntry?: PayableRow;
}

export const NavigationCard: React.FC<NavigationCardProps> = ({ tab, setTab, createdEntry }) => {
  const getNavButtonClass = (isActive: boolean) => cn(
    "w-full justify-start font-medium transition-all h-10 rounded-md gap-2",
    isActive 
      ? "bg-background border-2 border-primary text-primary shadow-sm" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
  );

  return (
    <div className="col-span-3 space-y-6">
      <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-4 flex flex-row items-center gap-2 space-y-0">
          <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">Navegação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="ghost" 
            className={getNavButtonClass(tab === 'dados')}
            onClick={() => setTab('dados')}
          >
            <FileText className="h-4 w-4" />
            Dados gerais
          </Button>
          <Button 
            variant="ghost" 
            className={getNavButtonClass(tab === 'repeticoes')}
            onClick={() => setTab('repeticoes')}
          >
            <RefreshCw className="h-4 w-4" />
            Repetições
          </Button>
          <Button 
            variant="ghost" 
            className={getNavButtonClass(tab === 'lancamentos')}
            onClick={() => setTab('lancamentos')}
            disabled={!createdEntry}
          >
            <DollarSign className="h-4 w-4" />
            Lançamentos
          </Button>
          <Button 
            variant="ghost" 
            className={getNavButtonClass(tab === 'historico')}
            onClick={() => setTab('historico')}
            disabled={!createdEntry}
          >
            <History className="h-4 w-4" />
            Histórico
          </Button>
        </CardContent>
      </Card>

      {createdEntry && (
        <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm">
          <CardHeader className="pb-4 flex flex-row items-center gap-2 space-y-0">
              <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold text-foreground">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Número</span>
                <span className="font-medium">{createdEntry.entry_number}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Vencimento</span>
                <span className="font-medium">{createdEntry.due_date ? format(new Date(createdEntry.due_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Valor Bruto</span>
                <span className="font-medium">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(createdEntry.gross_amount || createdEntry.net_amount || 0)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center font-medium">
                <span>Saldo</span>
                <span className="text-primary">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Math.max((createdEntry.net_amount || 0) - (createdEntry.paid_amount || 0), 0))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
