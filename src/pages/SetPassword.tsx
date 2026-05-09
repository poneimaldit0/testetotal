
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Lock } from 'lucide-react';

const SetPassword = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Se não há usuário logado, redirecionar para login
    if (!user) {
      navigate('/auth', { replace: true });
    }
  }, [user, navigate]);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (password.length < minLength) {
      return 'A senha deve ter pelo menos 8 caracteres';
    }
    if (!hasUpperCase) {
      return 'A senha deve ter pelo menos uma letra maiúscula';
    }
    if (!hasLowerCase) {
      return 'A senha deve ter pelo menos uma letra minúscula';
    }
    if (!hasNumbers) {
      return 'A senha deve ter pelo menos um número';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validar senha
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Senha inválida",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    // Verificar se as senhas coincidem
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Atualizar a senha do usuário
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Senha definida com sucesso!",
        description: "Sua conta está pronta para uso.",
      });

      // Redirecionar para o dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Erro ao definir senha:', error);
      toast({
        title: "Erro ao definir senha",
        description: error.message || 'Erro inesperado',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null; // O useEffect já fará o redirecionamento
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="bg-primary rounded-full p-3 w-fit mx-auto">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-secondary">
            Definir Senha
          </CardTitle>
          <p className="text-gray-600 text-sm">
            Olá, {user.email}! Defina uma senha segura para sua conta.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite novamente sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-1">
                Requisitos da senha:
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Pelo menos 8 caracteres</li>
                <li>• Uma letra maiúscula</li>
                <li>• Uma letra minúscula</li>
                <li>• Um número</li>
              </ul>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Definindo senha...' : 'Definir Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPassword;
