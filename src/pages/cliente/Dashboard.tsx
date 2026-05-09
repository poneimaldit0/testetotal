import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Building, 
  Phone, 
  Settings, 
  LogOut,
  User,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  Package,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CronogramaObra } from '@/components/cliente/CronogramaObra';
import { DiarioObraCliente } from '@/components/cliente/DiarioObraCliente';
import { MedicoesObra } from '@/components/cliente/MedicoesObra';
import { SolicitarMateriais } from '@/components/cliente/SolicitarMateriais';
import { NotificacoesCliente } from '@/components/cliente/NotificacoesCliente';

interface DashboardCliente {
  cliente: {
    nome: string;
    email: string;
    telefone: string;
    status: string;
  };
  contrato: {
    id?: string;
    fornecedor_nome: string;
    fornecedor_empresa: string;
    valor_contrato: number;
    status_assinatura: string;
  };
  projeto: {
    categoria: string;
    local: string;
    necessidade: string;
  };
}

const ClienteDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cronograma');

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['cliente-dashboard', user?.id],
    queryFn: async () => {
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select(`
          nome,
          email,
          telefone,
          status,
          contratos (
            id,
            valor_contrato,
            status_assinatura,
            profiles!fornecedor_id (
              nome,
              empresa
            )
          ),
          orcamentos (
            categorias,
            local,
            necessidade
          )
        `)
        .eq('auth_user_id', user?.id)
        .single();

      if (clienteError) {
        console.error('Erro ao buscar dados do cliente:', clienteError);
        throw clienteError;
      }

        return {
        cliente: {
          nome: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone,
          status: cliente.status
        },
        contrato: {
          id: cliente.contratos[0]?.id,
          fornecedor_nome: cliente.contratos[0]?.profiles?.nome || 'N/A',
          fornecedor_empresa: cliente.contratos[0]?.profiles?.empresa || 'N/A',
          valor_contrato: cliente.contratos[0]?.valor_contrato || 0,
          status_assinatura: cliente.contratos[0]?.status_assinatura || 'aguardando'
        },
        projeto: {
          categoria: cliente.orcamentos[0]?.categorias?.join(', ') || 'N/A',
          local: cliente.orcamentos[0]?.local || 'N/A',
          necessidade: cliente.orcamentos[0]?.necessidade || 'N/A'
        }
      } as DashboardCliente;
    },
    enabled: !!user?.id
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const alterarSenha = () => {
    navigate('/set-password');
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'aguardando': { label: 'Aguardando Assinatura', variant: 'secondary' as const },
      'cliente_assinou': { label: 'Aguardando Fornecedor', variant: 'default' as const },
      'fornecedor_assinou': { label: 'Aguardando Cliente', variant: 'default' as const },
      'finalizado': { label: 'Contrato Finalizado', variant: 'default' as const },
      'cancelado': { label: 'Cancelado', variant: 'destructive' as const }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sua área...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erro ao carregar dados</h1>
          <p className="text-gray-600 mb-4">
            Ocorreu um problema ao carregar suas informações. Tente novamente ou entre em contato conosco.
          </p>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
            <Button onClick={() => navigate('/auth')}>Voltar ao Login</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Dados não encontrados</h1>
          <p className="text-gray-600 mb-4">
            Não conseguimos encontrar seus dados de cliente. Verifique se seu cadastro foi finalizado ou entre em contato conosco.
          </p>
          <Button onClick={() => navigate('/auth')}>Voltar ao Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reforma100</h1>
                <p className="text-sm text-gray-500">Área do Cliente</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={alterarSenha}>
                <Settings className="h-4 w-4 mr-1" />
                Alterar Senha
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Boas-vindas */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Olá, {dashboardData.cliente.nome}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            Bem-vindo à sua área exclusiva. Aqui você pode acompanhar todos os detalhes do seu projeto de reforma.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Suas Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nome</p>
                <p className="font-medium">{dashboardData.cliente.nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{dashboardData.cliente.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telefone</p>
                <p className="font-medium">{dashboardData.cliente.telefone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant="default">Ativo</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes do Projeto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Seu Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Categoria</p>
                <p className="font-medium">{dashboardData.projeto.categoria}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Local</p>
                <p className="font-medium">{dashboardData.projeto.local}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Necessidade</p>
                <p className="font-medium text-sm">{dashboardData.projeto.necessidade}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Contrato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Fornecedor</p>
                <p className="font-medium">
                  {dashboardData.contrato.fornecedor_empresa || dashboardData.contrato.fornecedor_nome}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor do Contrato</p>
                <p className="font-bold text-lg text-primary">
                  {formatarValor(dashboardData.contrato.valor_contrato)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={getStatusBadge(dashboardData.contrato.status_assinatura).variant}>
                  {getStatusBadge(dashboardData.contrato.status_assinatura).label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funcionalidades em Abas */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Acompanhe seu Projeto</CardTitle>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {dashboardData.contrato.status_assinatura === 'finalizado' ? 'Contrato Ativo' : 'Aguardando Contrato'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="cronograma" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Cronograma</span>
                  </TabsTrigger>
                  <TabsTrigger value="diario" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Diário</span>
                  </TabsTrigger>
                  <TabsTrigger value="medicoes" className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Medições</span>
                  </TabsTrigger>
                  <TabsTrigger value="materiais" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Materiais</span>
                  </TabsTrigger>
                  <TabsTrigger value="notificacoes" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="hidden sm:inline">Notificações</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cronograma" className="mt-6">
                  <CronogramaObra contratoId={dashboardData.contrato.id} />
                </TabsContent>

                <TabsContent value="diario" className="mt-6">
                  <DiarioObraCliente contratoId={dashboardData.contrato.id} />
                </TabsContent>

                <TabsContent value="medicoes" className="mt-6">
                  <MedicoesObra contratoId={dashboardData.contrato.id} />
                </TabsContent>

                <TabsContent value="materiais" className="mt-6">
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Gestão de Materiais</p>
                    <p className="text-sm">Em breve você poderá solicitar e acompanhar materiais extras</p>
                  </div>
                </TabsContent>

                <TabsContent value="notificacoes" className="mt-6">
                  <NotificacoesCliente />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Suporte */}
        <div className="mt-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Phone className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold text-primary">Precisa de ajuda?</h3>
                  <p className="text-sm text-gray-600">
                    Nossa equipe está pronta para te atender. Entre em contato conosco a qualquer momento.
                  </p>
                </div>
                <Button variant="outline" className="ml-auto">
                  Falar com Suporte
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClienteDashboard;