/**
 * Componente que exibe o status de autenticação usando Zustand
 * 
 * Este componente demonstra como usar o Zustand para acessar o estado global
 * de autenticação de forma eficiente, evitando re-renderizações desnecessárias.
 */

import { useAuthStore } from '@/store/authStore';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function AuthStatusIndicator() {
  // Usando seletores específicos para evitar re-renderizações desnecessárias
  const isAuthenticated = useAuthStore(state => !!state.user);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const userEmail = useAuthStore(state => state.user?.email);
  
  if (isLoading) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertTitle className="text-blue-800">Verificando autenticação</AlertTitle>
        <AlertDescription className="text-blue-700">
          Aguarde enquanto verificamos seu status de autenticação...
        </AlertDescription>
      </Alert>
    );
  }
  
  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Erro de autenticação</AlertTitle>
        <AlertDescription className="text-red-700">
          {error}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (isAuthenticated) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Autenticado via Zustand</AlertTitle>
        <AlertDescription className="text-green-700">
          Você está autenticado como {userEmail}.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="bg-yellow-50 border-yellow-200">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Não autenticado</AlertTitle>
      <AlertDescription className="text-yellow-700">
        Você não está autenticado. Faça login para acessar o sistema.
      </AlertDescription>
    </Alert>
  );
}
