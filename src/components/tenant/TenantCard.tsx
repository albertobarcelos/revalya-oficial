/**
 * Componente de card para tenant com suporte à nova funcionalidade de one-time code
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantAccess } from "@/data/hooks/useTenantAccess";
import { Badge } from "@/components/ui/badge";

interface TenantCardProps {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
  logo?: string;
  role?: string;
}

export function TenantCard({ id, name, slug, active = true, logo, role }: TenantCardProps) {
  const { openTenantInNewTab } = useTenantAccess();
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Estilo condicional baseado no status
  const cardBorderStyle = active
    ? "border-accent/30 hover:border-accent/60"
    : "border-muted/30 opacity-60";

  // Configuração de botão baseada no status
  const buttonConfig = active
    ? {
        variant: "default" as const,
        text: "Acessar em nova aba",
        disabled: false,
      }
    : {
        variant: "outline" as const,
        text: "Tenant inativo",
        disabled: true,
      };
  
  // Manipulador para abrir tenant em nova aba
  const handleOpenTenant = async () => {
    if (!active) return;
    
    setIsLoading(true);
    try {
      await openTenantInNewTab(id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card 
      className={`overflow-hidden border transition-colors ${cardBorderStyle}`}
    >
      <CardHeader className="bg-gradient-to-b from-purple-600/20 to-purple-800/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {logo ? (
              <img 
                src={logo}
                alt={`Logo ${name}`}
                className="h-8 w-8 rounded-md object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/20">
                <Building2 className="h-4 w-4 text-accent-foreground" />
              </div>
            )}
            
            {!active && (
              <Badge variant="outline" className="ml-2 border-muted/50 text-muted-foreground">
                Inativo
              </Badge>
            )}
          </div>
          
          {role && (
            <Badge variant="outline" className="border-accent/30 text-accent-foreground">
              {role}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="text-muted-foreground">{slug}</CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        <ul className="space-y-1">
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            Dashboard completo
          </li>
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            Gerenciamento de cobranças
          </li>
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            Contratos e clientes
          </li>
        </ul>
      </CardContent>
      
      <CardFooter className="flex justify-end border-t border-muted/20 pt-4">
        <Button
          variant={buttonConfig.variant}
          onClick={handleOpenTenant}
          disabled={buttonConfig.disabled || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Abrindo...
            </>
          ) : (
            <>
              {active ? (
                <ExternalLink className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {buttonConfig.text}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
