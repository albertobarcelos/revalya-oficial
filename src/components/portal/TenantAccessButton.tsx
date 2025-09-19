import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { TenantSessionManager } from '@/lib/TenantSessionManager';
import { useAuth } from '@/hooks/useAuth';

interface TenantAccessButtonProps {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  className?: string;
  children?: React.ReactNode;
}

export function TenantAccessButton({ 
  tenantId, 
  tenantSlug, 
  tenantName, 
  className = '',
  children 
}: TenantAccessButtonProps) {
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleAccessTenant = async () => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    setIsCreatingSession(true);
    setError(null);

    try {
      // Criar sessão de tenant usando o TenantSessionManager
      const session = await TenantSessionManager.createTenantSession(
        tenantId,
        tenantSlug,
        user.id,
        user.email || ''
      );

      if (session) {
        // Abrir nova aba com URL limpa
        const tenantUrl = `${window.location.origin}/${tenantSlug}`;
        window.open(tenantUrl, '_blank');
      } else {
        throw new Error('Falha ao criar sessão do tenant');
      }
    } catch (err) {
      console.error('Erro ao acessar tenant:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAccessTenant}
        disabled={isCreatingSession}
        className={`w-full ${className}`}
      >
        {isCreatingSession ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Abrindo...
          </>
        ) : (
          <>
            {children || (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Acessar {tenantName}
              </>
            )}
          </>
        )}
      </Button>
      
      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
