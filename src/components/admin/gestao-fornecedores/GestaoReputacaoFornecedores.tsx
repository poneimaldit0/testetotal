import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Award, Image, MessageSquare, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';
import { FornecedorReputacao } from '@/types/fornecedor-reputacao';
import { ModalPortfolio } from './ModalPortfolio';
import { ModalDepoimento } from './ModalDepoimento';
import { ModalSelo } from './ModalSelo';
import { ModalDescricaoFornecedor } from './ModalDescricaoFornecedor';
import { ModalAvaliacao } from './ModalAvaliacao';

export const GestaoReputacaoFornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Profile[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorReputacao | null>(null);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState<'portfolio' | 'depoimento' | 'selo' | 'descricao' | 'avaliacao' | null>(null);

  const { toast } = useToast();
  const { buscarReputacaoFornecedor, loading: reputacaoLoading } = useFornecedorReputacao();

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tipo_usuario', 'fornecedor')
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setFornecedores((data || []) as Profile[]);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de fornecedores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selecionarFornecedor = async (fornecedor: Profile) => {
    const reputacao = await buscarReputacaoFornecedor(fornecedor.id);
    if (reputacao) {
      setFornecedorSelecionado(reputacao);
    }
  };

  const fornecedoresFiltrados = fornecedores.filter(f =>
    f.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    f.empresa?.toLowerCase().includes(filtro.toLowerCase()) ||
    f.email?.toLowerCase().includes(filtro.toLowerCase())
  );

  const atualizarReputacao = async () => {
    if (fornecedorSelecionado) {
      const reputacaoAtualizada = await buscarReputacaoFornecedor(fornecedorSelecionado.id);
      if (reputacaoAtualizada) {
        setFornecedorSelecionado(reputacaoAtualizada);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gestão de Reputação dos Fornecedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor por nome, empresa ou email..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Fornecedores */}
            <div className="space-y-3">
              <h3 className="font-medium">Fornecedores ({fornecedoresFiltrados.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {fornecedoresFiltrados.map((fornecedor) => (
                  <Card 
                    key={fornecedor.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      fornecedorSelecionado?.id === fornecedor.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => selecionarFornecedor(fornecedor)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">{fornecedor.nome}</h4>
                        <p className="text-xs text-muted-foreground">{fornecedor.empresa}</p>
                        <p className="text-xs text-muted-foreground">{fornecedor.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Detalhes do Fornecedor */}
            <div className="lg:col-span-2">
              {fornecedorSelecionado ? (
                <div className="space-y-6">
                  {/* Header com informações básicas */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{fornecedorSelecionado.nome}</CardTitle>
                          <p className="text-sm text-muted-foreground">{fornecedorSelecionado.empresa}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setModalAberto('descricao')}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Descrição
                        </Button>
                      </div>
                      {fornecedorSelecionado.descricao_fornecedor && (
                        <p className="text-sm">{fornecedorSelecionado.descricao_fornecedor}</p>
                      )}
                    </CardHeader>
                  </Card>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {fornecedorSelecionado.media_avaliacoes?.total_avaliacoes || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Avaliações</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {fornecedorSelecionado.media_avaliacoes?.nota_geral?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-xs text-muted-foreground">Nota Média</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {fornecedorSelecionado.portfolios.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Portfólio</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary">
                          {fornecedorSelecionado.selos.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Selos</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabs para gerenciar diferentes aspectos */}
                  <Tabs defaultValue="portfolio" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
                      <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
                      <TabsTrigger value="depoimentos">Depoimentos</TabsTrigger>
                      <TabsTrigger value="selos">Selos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="portfolio" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Itens do Portfólio</h3>
                        <Button
                          onClick={() => setModalAberto('portfolio')}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Item
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fornecedorSelecionado.portfolios.map((item) => (
                          <Card key={item.id}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                                  {item.imagem_url ? (
                                    <img 
                                      src={item.imagem_url} 
                                      alt={item.titulo}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Image className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm">{item.titulo}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {item.categoria}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="avaliacoes" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Avaliações</h3>
                        <Button
                          onClick={() => setModalAberto('avaliacao')}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Avaliação
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {fornecedorSelecionado.avaliacoes.map((avaliacao) => (
                          <Card key={avaliacao.id}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">{avaliacao.cliente_nome}</h4>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: 5 }, (_, i) => (
                                        <span
                                          key={i}
                                          className={`text-xs ${
                                            i < Math.floor(avaliacao.nota_geral) 
                                              ? 'text-yellow-400' 
                                              : 'text-muted-foreground'
                                          }`}
                                        >
                                          ★
                                        </span>
                                      ))}
                                    </div>
                                    <Badge variant="outline">
                                      {avaliacao.nota_geral.toFixed(1)}/5
                                    </Badge>
                                  </div>
                                </div>
                                {avaliacao.comentario && (
                                  <p className="text-sm text-muted-foreground">
                                    "{avaliacao.comentario}"
                                  </p>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                  {avaliacao.prazo && (
                                    <div>
                                      <span className="text-muted-foreground">Prazo:</span>
                                      <span className="ml-1 font-medium">{avaliacao.prazo}/5</span>
                                    </div>
                                  )}
                                  {avaliacao.qualidade && (
                                    <div>
                                      <span className="text-muted-foreground">Qualidade:</span>
                                      <span className="ml-1 font-medium">{avaliacao.qualidade}/5</span>
                                    </div>
                                  )}
                                  {avaliacao.gestao_mao_obra && (
                                    <div>
                                      <span className="text-muted-foreground">Mão de Obra:</span>
                                      <span className="ml-1 font-medium">{avaliacao.gestao_mao_obra}/5</span>
                                    </div>
                                  )}
                                  {avaliacao.gestao_materiais && (
                                    <div>
                                      <span className="text-muted-foreground">Materiais:</span>
                                      <span className="ml-1 font-medium">{avaliacao.gestao_materiais}/5</span>
                                    </div>
                                  )}
                                  {avaliacao.custo_planejado && (
                                    <div>
                                      <span className="text-muted-foreground">Custo:</span>
                                      <span className="ml-1 font-medium">{avaliacao.custo_planejado}/5</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Avaliado em: {new Date(avaliacao.data_avaliacao).toLocaleDateString()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {fornecedorSelecionado.avaliacoes.length === 0 && (
                          <Card>
                            <CardContent className="flex items-center justify-center h-32">
                              <p className="text-sm text-muted-foreground">
                                Nenhuma avaliação registrada ainda
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="depoimentos" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Depoimentos</h3>
                        <Button
                          onClick={() => setModalAberto('depoimento')}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Depoimento
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {fornecedorSelecionado.depoimentos.map((depoimento) => (
                          <Card key={depoimento.id}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">{depoimento.cliente_nome}</h4>
                                  <Badge variant={depoimento.ativo ? "default" : "secondary"}>
                                    {depoimento.ativo ? "Ativo" : "Inativo"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  "{depoimento.depoimento}"
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="selos" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Selos e Certificações</h3>
                        <Button
                          onClick={() => setModalAberto('selo')}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Conceder Selo
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fornecedorSelecionado.selos.map((selo) => (
                          <Card key={selo.id}>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Award className="h-4 w-4" style={{ color: selo.cor }} />
                                  <h4 className="font-medium text-sm">{selo.nome_selo}</h4>
                                </div>
                                {selo.descricao && (
                                  <p className="text-xs text-muted-foreground">{selo.descricao}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge style={{ backgroundColor: selo.cor }} className="text-white text-xs">
                                    {selo.icone && <span className="mr-1">{selo.icone}</span>}
                                    Ativo
                                  </Badge>
                                  {selo.data_expiracao && (
                                    <span className="text-xs text-muted-foreground">
                                      Expira: {new Date(selo.data_expiracao).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">Selecione um fornecedor</h3>
                      <p className="text-sm text-muted-foreground">
                        Clique em um fornecedor da lista para gerenciar sua reputação
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      {fornecedorSelecionado && (
        <>
          <ModalPortfolio
            open={modalAberto === 'portfolio'}
            onClose={() => setModalAberto(null)}
            fornecedorId={fornecedorSelecionado.id}
            onSuccess={atualizarReputacao}
          />
          
          <ModalDepoimento
            open={modalAberto === 'depoimento'}
            onClose={() => setModalAberto(null)}
            fornecedorId={fornecedorSelecionado.id}
            onSuccess={atualizarReputacao}
          />
          
          <ModalSelo
            open={modalAberto === 'selo'}
            onClose={() => setModalAberto(null)}
            fornecedorId={fornecedorSelecionado.id}
            onSuccess={atualizarReputacao}
          />
          
          <ModalAvaliacao
            open={modalAberto === 'avaliacao'}
            onClose={() => setModalAberto(null)}
            fornecedorId={fornecedorSelecionado.id}
            onSuccess={atualizarReputacao}
          />
          
          <ModalDescricaoFornecedor
            open={modalAberto === 'descricao'}
            onClose={() => setModalAberto(null)}
            fornecedor={fornecedorSelecionado}
            onSuccess={atualizarReputacao}
          />
        </>
      )}
    </div>
  );
};