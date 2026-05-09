
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmailConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Verificar se há tokens na URL (confirmação via email)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        console.log('Parâmetros da URL:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

        if (accessToken && refreshToken && type === 'signup') {
          // Confirmar o usuário usando os tokens da URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          console.log('Resultado setSession:', { data, error });

          if (error) {
            throw error;
          }

          if (data.user) {
            console.log('Usuário confirmado com sucesso:', data.user);
            setStatus('success');
            setMessage('Email confirmado com sucesso!');
            
            toast({
              title: "Email confirmado!",
              description: "Agora você pode definir sua senha.",
            });

            // Redirecionar para definir senha após 2 segundos
            setTimeout(() => {
              navigate('/set-password', { replace: true });
            }, 2000);
          }
        } else {
          // Se não há tokens na URL, verificar se o usuário já está logado
          const { data: sessionData } = await supabase.auth.getSession();
          console.log('Sessão atual:', sessionData);

          if (sessionData.session?.user) {
            // Usuário já está logado, redirecionar para definir senha
            console.log('Usuário já logado, redirecionando para definir senha');
            navigate('/set-password', { replace: true });
          } else {
            // Não há tokens válidos nem sessão ativa
            setStatus('error');
            setMessage('Link de confirmação inválido ou expirado.');
            
            toast({
              title: "Link inválido",
              description: "O link de confirmação está inválido ou expirou. Solicite um novo email de confirmação.",
              variant: "destructive",
            });
          }
        }
      } catch (error: any) {
        console.error('Erro na confirmação:', error);
        setStatus('error');
        
        if (error.message.includes('expired')) {
          setMessage('Link de confirmação expirado. Solicite um novo email.');
        } else if (error.message.includes('invalid')) {
          setMessage('Link de confirmação inválido. Verifique se você clicou no link correto.');
        } else {
          setMessage('Erro ao confirmar email: ' + error.message);
        }

        toast({
          title: "Erro na confirmação",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    confirmEmail();
  }, [searchParams, navigate, toast]);

  const handleResendEmail = () => {
    // Redirecionar para a página de cadastro para reenviar email
    navigate('/auth?resend=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-secondary">
            Confirmação de Email
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-gray-600">Confirmando seu email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="text-green-600 font-medium">{message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Redirecionando para definir sua senha...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <p className="text-red-600 font-medium">{message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Verifique se você clicou no link mais recente do seu email.
                </p>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={handleResendEmail}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Reenviar Email de Confirmação
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  Voltar ao Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmation;
