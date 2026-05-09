import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, CheckCircle, ArrowRight, Star, TrendingUp } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/c483ce15-6db9-4eca-8544-1eeb29c9b346.png" 
                alt="Reforma100 Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Acessar Sistema
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 via-white to-orange-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-secondary mb-6">
              Conecte-se com os melhores <span className="text-primary">fornecedores</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              A plataforma que conecta administradores e fornecedores de forma eficiente, 
              facilitando a gestão de orçamentos e projetos com qualidade e agilidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-primary text-primary hover:bg-primary hover:text-white px-8 py-3"
              >
                Saiba Mais
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center bg-white/80 backdrop-blur-sm border-green-100 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="bg-primary/10 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-xl text-secondary">Para Administradores</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Cadastre demandas de clientes e encontre os melhores fornecedores para seus projetos.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/80 backdrop-blur-sm border-orange-100 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="bg-accent/10 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                  <Users className="h-10 w-10 text-accent" />
                </div>
                <CardTitle className="text-xl text-secondary">Para Fornecedores</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Encontre oportunidades de negócio e se conecte diretamente com administradores.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="bg-secondary/10 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                  <TrendingUp className="h-10 w-10 text-secondary" />
                </div>
                <CardTitle className="text-xl text-secondary">Resultados Garantidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Gestão eficiente com máximo de 3 fornecedores por orçamento para garantir qualidade.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-secondary mb-4">Como funciona</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Um processo simples e eficiente para conectar administradores e fornecedores
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary rounded-full p-4 w-20 h-20 mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h4 className="font-semibold text-secondary mb-2">Cadastro de Demanda</h4>
              <p className="text-gray-600 text-sm">
                Administradores cadastram as necessidades dos clientes
              </p>
            </div>

            <div className="text-center">
              <div className="bg-accent rounded-full p-4 w-20 h-20 mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h4 className="font-semibold text-secondary mb-2">Visualização</h4>
              <p className="text-gray-600 text-sm">
                Fornecedores visualizam orçamentos abertos e disponíveis
              </p>
            </div>

            <div className="text-center">
              <div className="bg-secondary rounded-full p-4 w-20 h-20 mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h4 className="font-semibold text-secondary mb-2">Inscrição</h4>
              <p className="text-gray-600 text-sm">
                Máximo de 3 fornecedores se inscrevem por orçamento
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-600 rounded-full p-4 w-20 h-20 mx-auto mb-4">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h4 className="font-semibold text-secondary mb-2">Conexão</h4>
              <p className="text-gray-600 text-sm">
                Dados de contato liberados após fechamento do orçamento
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl font-bold text-secondary mb-6">
                Por que escolher o Reforma100?
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-secondary">Processo Controlado</h4>
                    <p className="text-gray-600">Limite de 3 fornecedores por orçamento garante qualidade e agilidade</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-secondary">Conexão Direta</h4>
                    <p className="text-gray-600">Eliminamos intermediários, conectando diretamente quem precisa com quem pode fornecer</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-secondary">Gestão Inteligente</h4>
                    <p className="text-gray-600">Sistema completo de controle de acessos e estatísticas para administradores</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-secondary">Segurança de Dados</h4>
                    <p className="text-gray-600">Informações de contato liberadas apenas após fechamento do orçamento</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 text-center">
                    <Star className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="font-bold text-2xl text-secondary">500+</p>
                    <p className="text-sm text-gray-600">Orçamentos</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-bold text-2xl text-secondary">1000+</p>
                    <p className="text-sm text-gray-600">Fornecedores</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <Building2 className="h-8 w-8 text-secondary mx-auto mb-2" />
                    <p className="font-bold text-2xl text-secondary">200+</p>
                    <p className="text-sm text-gray-600">Administradores</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-2xl text-secondary">95%</p>
                    <p className="text-sm text-gray-600">Satisfação</p>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h3 className="text-3xl font-bold text-white mb-4">
            Pronto para começar?
          </h3>
          <p className="text-xl text-white/90 mb-8">
            Junte-se à plataforma que está revolucionando a conexão entre administradores e fornecedores
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-white text-primary hover:bg-gray-100 px-8 py-3"
          >
            Quero fazer parte
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/lovable-uploads/c483ce15-6db9-4eca-8544-1eeb29c9b346.png" 
                  alt="Reforma100 Logo" 
                  className="h-8 w-auto object-contain"
                />
                <div>
                  <h4 className="text-xl font-bold">Reforma100</h4>
                  <p className="text-sm text-gray-300">Sistema de Orçamentos</p>
                </div>
              </div>
              <p className="text-gray-300">
                Conectando administradores e fornecedores com eficiência e qualidade.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Links Úteis</h5>
              <ul className="space-y-2 text-gray-300">
                <li>Como funciona</li>
                <li>Para Administradores</li>
                <li>Para Fornecedores</li>
                <li>Suporte</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Contato</h5>
              <ul className="space-y-2 text-gray-300">
                <li>contato@reforma100.com.br</li>
                <li>(11) 9999-9999</li>
                <li>São Paulo, SP</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 Reforma100. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
