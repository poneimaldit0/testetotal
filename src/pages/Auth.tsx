import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Limpar timestamp de atividade anterior para evitar conflito com timeout
      localStorage.removeItem('last_activity_timestamp');
      
      const { error } = await signIn(email, password);
      
      // Resetar loading ANTES de navegar para UX mais fluida
      setIsLoading(false);

      if (error) {
        toast({
          title: "Erro ao realizar login",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel...",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-[440px] shadow-2xl border-0 bg-white">
        <CardHeader className="text-center space-y-4 px-10 pt-10 pb-6">
          <div className="mx-auto mb-2">
            <img 
              src="/reforma100-logo-new.png" 
              alt="Reforma100" 
              className="h-20 w-auto mx-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-secondary">
            Acesso ao Sistema
          </CardTitle>
          <p className="text-[#6B7280] text-sm">
            Entre com suas credenciais para acessar o sistema
          </p>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#374151]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 px-4 border-[#E5E7EB] focus-visible:ring-[#22C55E] focus-visible:border-[#22C55E] placeholder:text-[#9CA3AF]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#374151]">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 px-4 pr-12 border-[#E5E7EB] focus-visible:ring-[#22C55E] focus-visible:border-[#22C55E] placeholder:text-[#9CA3AF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full h-12 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium rounded-lg transition-colors mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="text-center mt-4">
              <a
                href="/esqueci-senha"
                className="text-sm text-[#22C55E] hover:text-[#16A34A] transition-colors font-medium"
              >
                Esqueci minha senha
              </a>
            </div>
          </form>

          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#E5E7EB]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-[#9CA3AF] font-medium">
                  Não possui conta?
                </span>
              </div>
            </div>
            <a
              href="/cadastro-fornecedor"
              className="inline-block mt-4 text-[#22C55E] hover:text-[#16A34A] font-medium text-sm transition-colors"
            >
              Cadastrar-se como Fornecedor
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
