/**
 * Componente de feedback visual para o status da conexão
 * 
 * Este componente:
 * - Mostra indicador visual do status de conexão
 * - Exibe brevemente mensagens de sucesso ao reconectar
 * - Mostra mensagens de erro ao perder conexão
 * - Indica tentativas de reconexão em andamento
 * 
 * @module ConnectionStatusIndicator
 */

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface ConnectionStatus {
  online: boolean;
  lastChecked: Date | null;
  reconnectAttempts: number;
}

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

/**
 * Componente visual para indicar status de conexão
 */
export function ConnectionStatusIndicator({ status }: ConnectionStatusProps) {
  const [visible, setVisible] = useState(false);
  const [transitionClass, setTransitionClass] = useState('opacity-0');
  const [wasOffline, setWasOffline] = useState(false);
  
  useEffect(() => {
    let timeoutRef: ReturnType<typeof setTimeout> | undefined;
    
    // Quando muda para offline, mostrar imediatamente
    if (!status.online) {
      setVisible(true);
      setWasOffline(true);
      setTransitionClass('opacity-100');
    } 
    // Quando volta a ficar online e estava offline antes
    else if (wasOffline) {
      setVisible(true);
      setTransitionClass('opacity-100');
      
      // Mostrar brevemente e depois esconder
      timeoutRef = setTimeout(() => {
        setTransitionClass('opacity-0');
        
        // Após a animação, esconder completamente
        setTimeout(() => {
          setVisible(false);
          setWasOffline(false);
        }, 300); // Duração da transição
        
      }, 3000); // Mostrar por 3 segundos
    }
    
    // Cleanup function
    return () => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
    };
  }, [status.online, wasOffline]);
  
  if (!visible) {
    return null;
  }
  
  const variant = status.online ? "success" : "destructive";
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-opacity duration-300 ${transitionClass}`}>
      <Alert variant={variant}>
        <div className="flex items-center">
          {status.online ? (
            <Wifi className="h-4 w-4 mr-2" />
          ) : status.reconnectAttempts > 0 ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <WifiOff className="h-4 w-4 mr-2" />
          )}
          <div>
            <AlertTitle>
              {status.online ? "Conectado" : "Sem conexão"}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {status.online
                ? "Sua conexão foi restaurada."
                : `Tentando reconectar... (${status.reconnectAttempts})`}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}
