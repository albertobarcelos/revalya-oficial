/**
 * AIDEV-NOTE: Exemplo de componente usando o novo sistema multi-tenant
 * 
 * Este componente demonstra como usar o novo sistema multi-tenant
 * para listar os tenants do usuário e permitir a troca entre eles.
 */

import { useState, useEffect } from 'react';
import { useTenantContext } from '@/hooks/useTenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle } from 'lucide-react';

export function TenantSwitcher() {
  const { 
    tenant: currentTenant,
    isLoading 
  } = useTenantContext();
  
  const [loading, setLoading] = useState(false);
  
  // Componente simplificado - não precisa carregar tenants
  useEffect(() => {
    setLoading(false);
  }, []);
  
  // Mostrar estado de loading
  if (isLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary mb-4" />
        <p>Carregando tenants...</p>
      </div>
    );
  }
  
  // Mostrar tenant atual e opções de troca
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold">Gerenciador de Tenants</h2>
      
      {/* Tenant atual */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Tenant Atual</h2>
          {currentTenant ? (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>{currentTenant.name}</CardTitle>
                <CardDescription>Tenant ativo no momento</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">ID: {currentTenant.id}</p>
                <p className="text-sm text-muted-foreground">Slug: {currentTenant.slug}</p>
              </CardContent>
            </Card>
          ) : (
            <p>Nenhum tenant selecionado.</p>
          )}
        </div>
      </div>
      
      {/* Componente simplificado - funcionalidade completa será implementada depois */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Funcionalidade em desenvolvimento</h3>
        <p className="text-muted-foreground">A troca de tenants será implementada em uma próxima versão.</p>
      </div>
    </div>
  );
}

export default TenantSwitcher;
