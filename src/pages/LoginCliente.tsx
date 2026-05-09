import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { User, Eye, EyeOff, Shield, Home, FileText, MessageSquare } from 'lucide-react';

const LoginCliente = () => {
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

      if (error) {
        toast({
          title: "Erro ao realizar login",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bem-vindo à sua área exclusiva!",
          description: "Acesso realizado com sucesso",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Seção informativa - lado esquerdo */}
        <div className="hidden lg:block space-y-6 p-8">
          <div className="text-center space-y-4">
            <div className="bg-blue-600 rounded-full p-4 w-fit mx-auto">
              <User className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              Área Exclusiva do Cliente
            </h1>
            <p className="text-gray-600 text-lg">
              Acompanhe seu projeto de reforma com total transparência e controle
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="bg-green-100 p-2 rounded-lg">
                <Home className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Acompanhe seu Projeto</h3>
                <p className="text-sm text-gray-600">Veja o progresso da obra em tempo real, cronograma e etapas concluídas</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="bg-blue-100 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Comunicação Direta</h3>
                <p className="text-sm text-gray-600">Chat direto com seu fornecedor para esclarecer dúvidas e acompanhar</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Documentos e Contratos</h3>
                <p className="text-sm text-gray-600">Acesse todos os documentos, medições e comprovantes da obra</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de login - lado direito */}
        <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="bg-blue-600 rounded-full p-4 w-fit mx-auto">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-800">
              Área do Cliente
            </CardTitle>
            <p className="text-gray-600">
              Use as credenciais enviadas por email para acessar sua área exclusiva
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base border-2 border-gray-200 focus:border-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha temporária"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base border-2 border-gray-200 focus:border-blue-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Acessar Minha Área'}
              </Button>
            </form>

            <div className="pt-4 border-t border-gray-200">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Primeira vez?</strong> Você será solicitado a criar uma nova senha após o primeiro acesso por segurança.
                </p>
              </div>
            </div>

            <div className="text-center pt-2 space-y-2">
              <p className="text-sm text-gray-500">
                Problemas para acessar?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  onClick={() => {
                    toast({
                      title: "Ajuda",
                      description: "Verifique o email enviado com suas credenciais ou entre em contato conosco.",
                    });
                  }}
                >
                  Clique aqui
                </button>
              </p>
              <p className="text-sm">
                <a
                  href="/esqueci-senha"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Esqueci minha senha
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginCliente;