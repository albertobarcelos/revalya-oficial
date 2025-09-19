import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl text-primary">404</h1>
        <h2 className="text-3xl font-semibold">Página não encontrada</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Desculpe, a página que você está procurando não existe ou pode ter sido movida.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
          <Button 
            variant="default" 
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/meus-aplicativos')}
          >
            Ir para Meus Aplicativos
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
