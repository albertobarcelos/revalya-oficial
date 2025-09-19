import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { tokenManager } from '@/lib/tokenManager';

const Invoices: React.FC = () => {
  const tenant = tokenManager.getCurrentTenant();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Faturas</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Tenant:</span>
          <span className="font-medium">{tenant?.slug || 'Desconhecido'}</span>
        </div>
      </div>

      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Página em construção</AlertTitle>
        <AlertDescription>
          Esta é uma página de exemplo para demonstração do sistema multi-tenant por aba.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas Pendentes</CardTitle>
              <CardDescription>Lista de todas as faturas pendentes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="p-4">
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">
                      Dados de faturas aparecerão aqui quando o sistema estiver completamente implementado.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Invoices;
