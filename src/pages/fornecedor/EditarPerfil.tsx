import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { UploadLogo } from '@/components/fornecedor/perfil/UploadLogo';
import { PortfolioManager } from '@/components/fornecedor/perfil/PortfolioManager';
import { DepoimentosManager } from '@/components/fornecedor/perfil/DepoimentosManager';
import { NotificacaoRevisao } from '@/components/fornecedor/NotificacaoRevisao';
import { Loader2, ExternalLink } from 'lucide-react';

export const EditarPerfil = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { reputacao, buscarReputacaoFornecedor, atualizarPerfilCompleto } = useFornecedorReputacao();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    empresa: '',
    telefone: '',
    email: '',
    whatsapp: '',
    site_url: '',
    endereco: '',
    descricao_fornecedor: '',
    logo_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        empresa: profile.empresa || '',
        telefone: profile.telefone || '',
        email: profile.email || '',
        whatsapp: profile.whatsapp || '',
        site_url: profile.site_url || '',
        endereco: profile.endereco || '',
        descricao_fornecedor: profile.descricao_fornecedor || '',
        logo_url: profile.logo_url || ''
      });
      
      if (profile.id) {
        buscarReputacaoFornecedor(profile.id);
      }
    }
  }, [profile, buscarReputacaoFornecedor]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBasicInfo = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      // Salvar apenas campos básicos
      const basicInfoData = {
        nome: formData.nome,
        empresa: formData.empresa,
        telefone: formData.telefone,
        whatsapp: formData.whatsapp,
        site_url: formData.site_url,
        endereco: formData.endereco,
      };

      await atualizarPerfilCompleto(profile.id, basicInfoData);
      
      // Recarregar dados do perfil
      if (profile.id) {
        await buscarReputacaoFornecedor(profile.id);
      }
      
      toast({
        title: "Informações atualizadas!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLogoDescricao = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      // Salvar apenas descrição
      const logoDescricaoData = {
        descricao_fornecedor: formData.descricao_fornecedor,
      };

      await atualizarPerfilCompleto(profile.id, logoDescricaoData);
      
      // Recarregar dados do perfil
      if (profile.id) {
        await buscarReputacaoFornecedor(profile.id);
      }
      
      toast({
        title: "Descrição atualizada!",
        description: "A descrição da empresa foi salva com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar descrição:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (url: string) => {
    setFormData(prev => ({ ...prev, logo_url: url }));
  };

  const handleLogoSaved = async () => {
    // Recarregar perfil após logo ser salvo
    if (profile?.id) {
      await buscarReputacaoFornecedor(profile.id);
      setFormData(prev => ({ ...prev, logo_url: profile.logo_url || '' }));
    }
  };

  const visualizarPerfilPublico = () => {
    if (profile?.id) {
      window.open(`/fornecedor/${profile.id}`, '_blank');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações e portfólio profissional
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={visualizarPerfilPublico}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ver Perfil Público
        </Button>
      </div>

      <Tabs defaultValue="basico" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revisoes">Revisões</TabsTrigger>
          <TabsTrigger value="basico">Informações Básicas</TabsTrigger>
          <TabsTrigger value="logo">Logo & Descrição</TabsTrigger>
          <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
          <TabsTrigger value="depoimentos">Depoimentos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revisoes">
          <Card>
            <CardHeader>
              <CardTitle>Revisões de Propostas</CardTitle>
              <CardDescription>
                Gerencie as solicitações de revisão dos seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificacaoRevisao />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basico">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Atualize seus dados de contato e informações da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input
                    id="empresa"
                    value={formData.empresa}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    placeholder="Nome da sua empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site_url">Website</Label>
                  <Input
                    id="site_url"
                    value={formData.site_url}
                    onChange={(e) => handleInputChange('site_url', e.target.value)}
                    placeholder="https://www.suaempresa.com.br"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder="Endereço completo da sua empresa"
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleSaveBasicInfo} 
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Informações Básicas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo da Empresa</CardTitle>
                <CardDescription>
                  Faça upload do logo da sua empresa. Recomendamos imagens quadradas de até 2MB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <UploadLogo
                    currentLogoUrl={formData.logo_url}
                    onLogoUpload={handleLogoUpload}
                    onLogoSaved={handleLogoSaved}
                    fornecedorId={profile?.id || ''}
                  />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Descrição da Empresa</CardTitle>
                <CardDescription>
                  Conte sobre sua empresa, experiência e diferenciais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={formData.descricao_fornecedor}
                  onChange={(e) => handleInputChange('descricao_fornecedor', e.target.value)}
                  placeholder="Descreva sua empresa, experiência, especialidades e diferenciais..."
                  rows={6}
                  className="min-h-32"
                />
                
                <Button 
                  onClick={handleSaveLogoDescricao} 
                  disabled={loading}
                  className="w-full md:w-auto"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Descrição
                </Button>
                <p className="text-xs text-muted-foreground">
                  O logo é salvo automaticamente após o upload
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio">
          <Card>
            <CardHeader>
              <CardTitle>Portfólio</CardTitle>
              <CardDescription>
                Gerencie os projetos do seu portfólio com fotos e documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PortfolioManager 
                fornecedorId={profile?.id || ''}
                portfolios={reputacao?.portfolios || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depoimentos">
          <Card>
            <CardHeader>
              <CardTitle>Depoimentos</CardTitle>
              <CardDescription>
                Gerencie os depoimentos de seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DepoimentosManager 
                fornecedorId={profile?.id || ''}
                depoimentos={reputacao?.depoimentos || []}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};