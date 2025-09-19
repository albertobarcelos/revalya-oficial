import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { tokenManager } from '@/lib/tokenManager';

const Customers: React.FC = () => {
  const tenant = tokenManager.getCurrentTenant();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
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

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Todos os clientes</TabsTrigger>
          <TabsTrigger value="active">Clientes ativos</TabsTrigger>
          <TabsTrigger value="inactive">Clientes inativos</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Lista de todos os clientes do tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="p-4">
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">
                      Dados de clientes aparecerão aqui quando o sistema estiver completamente implementado.
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

export default Customers;
