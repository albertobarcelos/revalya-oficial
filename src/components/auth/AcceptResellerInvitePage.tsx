import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient'; // Cliente Supabase direto
import { Loader2, AlertTriangle, CheckCircle, LogIn } from 'lucide-react';

type ValidationResult = {
  valid: boolean;
  email?: string;
  resellerId?: string;
  error?: string;
};

export default function AcceptResellerInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSupabase(); // Verifica a sessão do usuário

  const [token, setToken] = useState<string | null>(null);
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'accepting' | 'accepted' | 'error'>('idle');
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setErrorMessage('Token de convite não encontrado na URL.');
      setValidationState('invalid');
      return;
    }
    setToken(tokenFromUrl);
    setValidationState('validating');

    const validateToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('validate-reseller-invite-token', {
          // A função pode pegar da query string se for GET, mas podemos enviar no body se preferirmos
          // Aqui vamos assumir que a função pode pegar da URL ou adaptar para enviar no body
          // Para simplificar, vamos chamar com GET implícito (sem body) ou adaptar a função para aceitar POST
          // --- Chamada via GET (implícito se a função usar new URL(req.url)) ---
          // Ou, se a função esperar POST:
          // method: 'POST',
          // body: { token: tokenFromUrl }
          // --- Vamos tentar sem body, assumindo que a função pega da URL ---
        });

        // Se a função esperar GET com token na query:
        // A chamada invoke por padrão é POST, precisamos forçar GET se for o caso
        // Ou melhor: Acessar a URL diretamente:
        
        // Chamada via fetch para endpoint da função (mais controle sobre método)
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-reseller-invite-token?token=${tokenFromUrl}`;
        const response = await fetch(functionUrl, {
            method: 'GET', // Ou POST se a função esperar assim
            headers: {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                // Authorization header não é necessário para a função de validação com anon key
            }
        });

        const result: ValidationResult = await response.json();

        if (!response.ok) {
            console.error('Validation Error:', result.error || `Status: ${response.status}`);
            setErrorMessage(result.error || 'Erro ao validar o token.');
            setValidationState('invalid');
        } else if (result.valid) {
            setValidationData(result);
            setValidationState('valid');
        } else {
            setErrorMessage(result.error || 'Token inválido ou expirado.');
            setValidationState('invalid');
        }

      } catch (err: any) {
        console.error('Failed to validate token:', err);
        setErrorMessage('Ocorreu um erro inesperado ao verificar o convite.');
        setValidationState('error');
      }
    };

    validateToken();
  }, [searchParams]);

  const handleAcceptInvite = async () => {
    if (!token || !session || validationState !== 'valid') {
      toast({ title: "Erro", description: "Não é possível aceitar o convite agora.", variant: "destructive" });
      return;
    }

    setValidationState('accepting');
    setErrorMessage(null);

    try {
      const { error } = await supabase.functions.invoke('accept-reseller-invite', {
        method: 'POST',
        body: { token: token },
        // O JWT do usuário logado será enviado automaticamente no header Authorization
      });

      if (error) {
         // Tenta extrair a mensagem de erro da resposta da função
         let specificError = "Não foi possível aceitar o convite.";
         if (error.context && error.context.json) {
             specificError = error.context.json.error || specificError;
         } else if (error.message) {
             specificError = error.message;
         }
         throw new Error(specificError);
      }

      setValidationState('accepted');
      toast({ title: "Convite Aceito!", description: "Você foi adicionado ao revendedor com sucesso." });
      // Redirecionar para o dashboard ou página relevante após um pequeno delay
      setTimeout(() => navigate('/admin/dashboard'), 2000); // Ajuste a rota de destino

    } catch (err: any) {
      console.error('Failed to accept invite:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao tentar aceitar o convite.');
      setValidationState('error'); // Volta para um estado de erro
      toast({ title: "Erro ao aceitar convite", description: err.message || 'Tente novamente.', variant: "destructive" });
    }
  };

  const renderContent = () => {
    if (validationState === 'idle' || validationState === 'validating' || sessionLoading) {
      return (
        <div className="flex flex-col items-center justify-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando convite...</p>
        </div>
      );
    }

    if (validationState === 'invalid' || validationState === 'error') {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-lg font-medium text-destructive">Convite Inválido</p>
          <p className="text-muted-foreground">{errorMessage || 'Este link de convite não é válido ou já expirou. Entre em contato com quem o convidou.'}</p>
          <Button variant="outline" onClick={() => navigate('/')}>Voltar para Home</Button>
        </div>
      );
    }

    if (validationState === 'accepted') {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
          <p className="text-lg font-medium">Convite Aceito!</p>
          <p className="text-muted-foreground">Você foi adicionado com sucesso. Redirecionando...</p>
        </div>
      );
    }

    // Se chegou aqui, o token é válido (validationState === 'valid' ou 'accepting')
    if (!session) {
      // Usuário não está logado
      return (
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Você foi convidado para se juntar a um revendedor!</p>
          <p className="text-muted-foreground">
            Para aceitar o convite para <span className="font-semibold">{validationData?.email}</span>, por favor, faça login ou crie uma conta.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild>
               {/* Redireciona para login, passando o token para ser tratado após o login */}
              <Link to={`/login?redirect=/accept-reseller-invite?token=${token}`}> 
                <LogIn className="mr-2 h-4 w-4" /> Fazer Login para Aceitar
              </Link>
            </Button>
            {/* Opcional: Link para Cadastro */}
             <Button variant="outline" asChild>
               {/* Redireciona para cadastro, passando o token */}
               <Link to={`/signup?redirect=/accept-reseller-invite?token=${token}`}> 
                  Criar Conta para Aceitar
               </Link>
             </Button>
          </div>
        </div>
      );
    } else {
      // Usuário está logado
      // Verificar se o email logado corresponde ao email do convite (opcional, mas recomendado)
      if (validationData?.email && session.user.email?.toLowerCase() !== validationData.email.toLowerCase()) {
        return (
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <p className="text-lg font-medium">Email Incompatível</p>
            <p className="text-muted-foreground">
              Você está logado como <span className="font-semibold">{session.user.email}</span>, mas este convite foi enviado para <span className="font-semibold">{validationData.email}</span>.
              Por favor, faça login com a conta correta para aceitar.
            </p>
            <Button variant="outline" onClick={async () => {
                 await supabase.auth.signOut();
                 // Força recarregamento ou navegação para limpar estado
                 navigate(`/login?redirect=/accept-reseller-invite?token=${token}`); 
            }}>Fazer Logout</Button>
          </div>
        );
      }

      // Usuário logado com o email correto (ou não estamos verificando email)
      return (
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Confirmar Convite</p>
          <p className="text-muted-foreground">
            Você (<span className="font-semibold">{session.user.email}</span>) foi convidado para acessar um revendedor.
          </p>
          <Button 
            onClick={handleAcceptInvite}
            disabled={validationState === 'accepting'}
          >
            {validationState === 'accepting' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aceitando...
            ) : (
              'Aceitar Convite'
            )}
          </Button>
          {errorMessage && (
             <p className="text-sm text-destructive mt-2">{errorMessage}</p>
          )}
        </div>
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Aceitar Convite de Revendedor</CardTitle>
          {/* <CardDescription className="text-center">...</CardDescription> */}
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
