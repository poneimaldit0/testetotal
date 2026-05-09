import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CadastroOrcamento } from '@/components/admin/CadastroOrcamento';
import { ListaOrcamentos } from '@/components/admin/ListaOrcamentos';
import { ListaOrcamentosAbertos } from '@/components/fornecedor/ListaOrcamentosAbertos';
import { MeusOrcamentos } from '@/components/fornecedor/MeusOrcamentos';
import { OrcamentoProvider, useOrcamento } from '@/context/OrcamentoContext';
import { Users, UserCheck, Building2, FileText, Hammer } from 'lucide-react';
import { GerenciamentoUsuarios } from '@/components/admin/GerenciamentoUsuarios';

const DashboardStats = () => {
  const { orcamentos, obterOrcamentosAbertos, obterOrcamentosFechados } = useOrcamento();
  const orcamentosAbertos = obterOrcamentosAbertos();
  const orcamentosFechados = obterOrcamentosFechados();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="goodref-card">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{orcamentos.length}</p>
              <p className="text-sm text-muted-foreground">Total de Orçamentos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="goodref-card">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{orcamentosAbertos.length}</p>
              <p className="text-sm text-muted-foreground">Orçamentos Abertos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="goodref-card">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold">{orcamentosFechados.length}</p>
              <p className="text-sm text-muted-foreground">Orçamentos Fechados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="goodref-card">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-secondary" />
            <div>
              <p className="text-2xl font-bold">
                {orcamentos.reduce((total, orc) => total + orc.quantidadeEmpresas, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total de Inscrições</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const IndexContent = () => {
  const [userType, setUserType] = useState<'admin' | 'fornecedor' | null>(null);

  if (!userType) {
    return (
      <div className="min-h-screen goodref-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl goodref-card">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Hammer className="h-12 w-12 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold text-secondary">
                  GoodRef
                </CardTitle>
                <p className="text-sm text-primary font-medium">Sistema de Gestão de Orçamentos</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground mt-2">
              Conectando administradores e fornecedores de forma eficiente
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setUserType('admin')}
                className="h-32 flex flex-col items-center justify-center space-y-2 text-lg goodref-button-secondary"
                variant="outline"
              >
                <Building2 className="h-12 w-12" />
                <span>Acesso Administrador</span>
                <span className="text-sm opacity-75">Cadastrar e gerenciar orçamentos</span>
              </Button>

              <Button
                onClick={() => setUserType('fornecedor')}
                className="h-32 flex flex-col items-center justify-center space-y-2 text-lg goodref-button-primary"
                variant="outline"
              >
                <Users className="h-12 w-12" />
                <span>Acesso Fornecedor</span>
                <span className="text-sm opacity-75">Visualizar e se inscrever em orçamentos</span>
              </Button>
            </div>

            <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-primary mb-2">Como funciona:</h3>
              <ul className="text-sm text-primary/80 space-y-1">
                <li>• Administradores cadastram demandas de clientes</li>
                <li>• Fornecedores visualizam orçamentos abertos</li>
                <li>• Máximo de 3 fornecedores por orçamento</li>
                <li>• Dados de contato liberados após fechamento</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2">
                <Hammer className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-secondary">GoodRef</h1>
                  <p className="text-xs text-primary">Sistema de Orçamentos</p>
                </div>
              </div>
              <Badge variant={userType === 'admin' ? 'default' : 'secondary'} className="goodref-button-primary">
                {userType === 'admin' ? 'Administrador' : 'Fornecedor'}
              </Badge>
            </div>
            <Button
              onClick={() => setUserType(null)}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Trocar Perfil
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardStats />

        {userType === 'admin' ? (
          <Tabs defaultValue="lista" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-primary/10">
              <TabsTrigger value="lista" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Gerenciar Orçamentos
              </TabsTrigger>
              <TabsTrigger value="cadastro" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Cadastrar Novo
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Gerenciar Usuários
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="lista">
              <ListaOrcamentos />
            </TabsContent>
            
            <TabsContent value="cadastro">
              <CadastroOrcamento />
            </TabsContent>
            
            <TabsContent value="usuarios">
              <GerenciamentoUsuarios />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="disponiveis" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-primary/10">
              <TabsTrigger value="disponiveis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Orçamentos Disponíveis
              </TabsTrigger>
              <TabsTrigger value="meus" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Meus Orçamentos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="disponiveis">
              <ListaOrcamentosAbertos />
            </TabsContent>
            
            <TabsContent value="meus">
              <MeusOrcamentos />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <OrcamentoProvider>
      <IndexContent />
    </OrcamentoProvider>
  );
};

export default Index;
