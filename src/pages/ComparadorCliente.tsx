import React, { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useComparacaoSegura } from '@/hooks/useComparacaoSegura';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { useClienteActions } from '@/hooks/useClienteActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ReputacaoFornecedor } from '@/components/fornecedor/ReputacaoFornecedor';
import { AceitarPropostaModal } from '@/components/cliente/AceitarPropostaModal';
import { SolicitarRevisaoModal } from '@/components/cliente/SolicitarRevisaoModal';
import { SuccessModal } from '@/components/cliente/SuccessModal';
import { PropostaComparacao } from '@/types/comparacao';
import { FornecedorReputacao } from '@/types/fornecedor-reputacao';
import { DadosCadastroCliente, SolicitarRevisaoData } from '@/types/cliente';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Wifi, WifiOff, Star, Award, Eye, CheckCircle2, FileEdit } from 'lucide-react';


const ComparadorCliente = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { data, loading, error, refetch } = useComparacaoSegura(token);
  
  // Debug específico para o problema reportado
  console.log(`🔍 [ComparadorCliente] Estado atual:`, {
    token: token?.substring(0, 8) + '...',
    loading,
    error,
    data_exists: !!data,
    propostas_length: data?.propostas?.length || 0,
    orcamento_id: data?.orcamento?.id
  });
  
  if (data?.orcamento?.id === '06a5513a-5923-4ae7-a389-5e2f99f5c1ef') {
    console.log(`🎯 [ComparadorCliente] DEBUG ORÇAMENTO ESPECÍFICO:`, {
      orcamento_id: data.orcamento.id,
      total_propostas: data.propostas.length,
      propostas_resumo: data.propostas.map(p => ({
        fornecedor: p.fornecedor.nome,
        email: p.fornecedor.email,
        status: p.proposta.status,
        valor: p.proposta.valor_total_estimado
      }))
    });
  }
  const { buscarReputacaoFornecedor } = useFornecedorReputacao();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [reputacoes, setReputacoes] = useState<Record<string, FornecedorReputacao>>({});
  const [loadingReputacoes, setLoadingReputacoes] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);
  
  // Estados para os modais
  const [propostaSelecionada, setPropostaSelecionada] = useState<PropostaComparacao | null>(null);
  const [modalAceitar, setModalAceitar] = useState(false);
  const [modalRevisao, setModalRevisao] = useState(false);
  const [modalSucesso, setModalSucesso] = useState(false);
  const [credenciaisCliente, setCredenciaisCliente] = useState<{email: string, senha_temporaria: string} | null>(null);
  
  // Hook para ações do cliente
  const { aceitarProposta, solicitarRevisao, loading: loadingActions } = useClienteActions();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const carregarReputacoes = async () => {
      if (!data?.propostas?.length) return;
      
      setLoadingReputacoes(true);
      const reputacoesCarregadas: Record<string, FornecedorReputacao> = {};
      
      try {
        const promises = data.propostas.map(async (proposta) => {
          try {
            const reputacao = await buscarReputacaoFornecedor(proposta.fornecedor.id);
            if (reputacao) {
              return { fornecedorId: proposta.fornecedor.id, reputacao };
            }
          } catch (error) {
            console.error('❌ [ComparadorCliente] Erro ao carregar reputação:', proposta.fornecedor.empresa, error);
          }
          return null;
        });

        const resultados = await Promise.all(promises);
        
        resultados.forEach((resultado) => {
          if (resultado) {
            reputacoesCarregadas[resultado.fornecedorId] = resultado.reputacao;
          }
        });
        
        setReputacoes(reputacoesCarregadas);
      } catch (error) {
        console.error('Erro geral ao carregar reputações:', error);
      } finally {
        setLoadingReputacoes(false);
      }
    };

    carregarReputacoes();
  }, [data?.propostas?.length]);

  if (!token) {
    return <Navigate to="/404" replace />;
  }

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarFormaPagamentoResumo = (formasPagamento: any) => {
    if (!formasPagamento) return 'Não informado';
    
    if (typeof formasPagamento === 'string') {
      return formasPagamento;
    }
    
    if (!Array.isArray(formasPagamento) || formasPagamento.length === 0) {
      return 'Não informado';
    }
    
    // Mostrar até 2 opções principais
    const opcoes = formasPagamento.slice(0, 2).map((forma) => {
      switch (forma.tipo) {
        case 'a_vista':
          return `À Vista${forma.desconto_porcentagem ? ` (-${forma.desconto_porcentagem}%)` : ''}`;
        case 'entrada_medicoes':
          return `Entrada ${forma.entrada_porcentagem || 0}% + Medições`;
        case 'medicoes':
          return `Medições ${forma.frequencia_medicoes || ''}`.trim();
        case 'boletos':
          return `${forma.boletos_quantidade || 1} boleto${(forma.boletos_quantidade || 1) > 1 ? 's' : ''}`;
        case 'cartao':
          return `Cartão ${forma.cartao_parcelas || 1}x`;
        case 'personalizado':
          return forma.texto_personalizado || 'Personalizado';
        default:
          return 'Outro';
      }
    });
    
    let resultado = opcoes.join(' ou ');
    if (formasPagamento.length > 2) {
      resultado += ` (+${formasPagamento.length - 2} opções)`;
    }
    
    return resultado;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'finalizada': return 'bg-green-500';
      case 'pendente_revisao': return 'bg-orange-500';
      case 'em_revisao': return 'bg-yellow-500';
      case 'rascunho': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'finalizada': return 'Finalizada';
      case 'pendente_revisao': return 'Aguardando Revisão';
      case 'em_revisao': return 'Em Revisão';
      case 'enviado': return 'Enviada';
      case 'rascunho': return 'Rascunho';
      default: return 'Desconhecido';
    }
  };

  const getStatusBadge = (proposta: PropostaComparacao) => {
    const status = proposta.proposta.status;
    const baseClass = `${getStatusColor(status)} text-white border-none text-xs`;
    
    // Verificar se foi revisada usando a nova propriedade foi_revisada
    const foiRevisada = proposta.proposta.foi_revisada;
    
    if (foiRevisada) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={baseClass}>
            {getStatusText(status)}
          </Badge>
          <Badge variant="outline" className="bg-orange-500 text-white border-none text-xs">
            Revisada
          </Badge>
        </div>
      );
    }
    
    return (
      <Badge variant="outline" className={baseClass}>
        {getStatusText(status)}
      </Badge>
    );
  };

  const prepararItensParaComparacao = () => {
    if (!data?.propostas.length) return {};

    const todasCategorias: Record<string, any> = {};

    // Coletar todos os itens únicos de todas as propostas
    data.propostas.forEach((proposta) => {
      Object.entries(proposta.proposta.categorias || {}).forEach(([categoria, categoriaData]) => {
        if (!todasCategorias[categoria]) {
          todasCategorias[categoria] = {
            itens: new Map(),
            subtotalPorProposta: {}
          };
        }

        categoriaData.itens.forEach((item: any) => {
          // Usar apenas o nome como chave única para melhor compatibilidade
          const chaveItem = item.nome;
          
          if (!todasCategorias[categoria].itens.has(chaveItem)) {
            todasCategorias[categoria].itens.set(chaveItem, {
              id: item.id,
              nome: item.nome,
              descricao: item.descricao || '', // Garantir que sempre tenha uma descrição (mesmo que vazia)
              ordem: item.ordem,
              item_extra: item.item_extra === true,
              chave: chaveItem
            });
          }
        });

        todasCategorias[categoria].subtotalPorProposta[proposta.id] = categoriaData.subtotal;
      });
    });

    return todasCategorias;
  };

  const buscarRespostaItem = (proposta: PropostaComparacao, chaveItem: string) => {    
    for (const categoria of Object.values(proposta.proposta.categorias || {})) {
      // Buscar apenas pelo nome (mais simples e efetivo)
      const item = categoria.itens.find(item => item.nome === chaveItem);
      if (item) {
        return item;
      }
    }
    
    // Fallback: buscar ignorando case sensitivity
    for (const categoria of Object.values(proposta.proposta.categorias || {})) {
      const item = categoria.itens.find(item => 
        item.nome.toLowerCase() === chaveItem.toLowerCase()
      );
      if (item) {
        return item;
      }
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    const isConnectionError = error.includes('conectividade') || error.includes('connection') || error.includes('redefinida');
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              {isConnectionError && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refetch}
                  className="ml-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Status de conectividade */}
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span>Conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span>Sem conexão</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.propostas.length) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertDescription>
              Nenhuma proposta disponível para comparação. As propostas aparecem aqui quando os fornecedores finalizam suas ofertas.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const categoriasComparaveis = prepararItensParaComparacao();
  const propostas = data.propostas;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Comparação de Propostas</h1>
          <p className="text-muted-foreground">
            {data.orcamento.necessidade} - {data.orcamento.local}
          </p>
          
          {/* Status de conectividade */}
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Offline</span>
                </>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refetch}
              className="h-8 px-3"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Resumo Executivo */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Executivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{propostas.length}</div>
                <div className="text-sm text-muted-foreground">Propostas</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatarValor(Math.min(...propostas.map(p => p.proposta.valor_total_estimado || 0)))}
                </div>
                <div className="text-sm text-muted-foreground">Menor Valor</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {formatarValor(Math.max(...propostas.map(p => p.proposta.valor_total_estimado || 0)))}
                </div>
                <div className="text-sm text-muted-foreground">Maior Valor</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatarValor(propostas.reduce((acc, p) => acc + (p.proposta.valor_total_estimado || 0), 0) / propostas.length)}
                </div>
                <div className="text-sm text-muted-foreground">Valor Médio</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção Dedicada de Reputação dos Fornecedores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Reputação dos Fornecedores
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare a experiência e credibilidade de cada fornecedor
            </p>
          </CardHeader>
          <CardContent>
            {loadingReputacoes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {propostas.map((proposta) => (
                  <Card key={proposta.id} className="border-dashed">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {propostas.map(proposta => {
                  const reputacao = reputacoes[proposta.fornecedor.id];
                  const melhorAvaliado = reputacao && (reputacao.media_avaliacoes?.total_avaliacoes || 0) > 0;
                  const mediaGeral = reputacao?.media_avaliacoes?.nota_geral || 0;
                  const isDestaque = mediaGeral >= 4.5 && (reputacao?.media_avaliacoes?.total_avaliacoes || 0) >= 3;
                  
                  return (
                    <Card 
                      key={proposta.id} 
                      className={`relative transition-all hover:shadow-md ${
                        isDestaque ? 'ring-2 ring-primary ring-opacity-50 bg-primary/5' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header do fornecedor */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold text-foreground">
                                {proposta.fornecedor.empresa}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {proposta.fornecedor.nome}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isDestaque && (
                                <Badge variant="default" className="text-xs bg-primary text-primary-foreground">
                                  Destaque
                                </Badge>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground max-w-[120px] leading-tight">
                                  Ver detalhes do fornecedor
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFornecedorSelecionado(
                                    fornecedorSelecionado === proposta.fornecedor.id ? null : proposta.fornecedor.id
                                  )}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Valor da proposta */}
                          <div className="text-lg font-bold text-primary bg-primary/10 rounded-lg p-2 text-center">
                            {formatarValor(proposta.proposta.valor_total_estimado || 0)}
                          </div>
                          
                          {/* Reputação detalhada */}
                          {reputacao ? (
                            <ReputacaoFornecedor reputacao={reputacao} compacto />
                          ) : (
                            <div className="text-center py-4">
                              <div className="text-sm text-muted-foreground">
                                Sem informações de reputação disponíveis
                              </div>
                            </div>
                          )}
                          
                          {/* Badge de status da proposta com indicador de revisão */}
                          <div className="flex flex-wrap justify-center gap-1">
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(proposta.proposta.status)} text-white border-none`}
                            >
                              {getStatusText(proposta.proposta.status)}
                            </Badge>
                            {proposta.proposta.foi_revisada && (
                              <Badge variant="outline" className="bg-orange-500 text-white border-none text-xs">
                                Revisada
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Reputação Detalhada */}
        {fornecedorSelecionado && reputacoes[fornecedorSelecionado] && (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reputação Detalhada</CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => setFornecedorSelecionado(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ReputacaoFornecedor reputacao={reputacoes[fornecedorSelecionado]} />
            </CardContent>
          </Card>
        )}

        {/* Tabela de Comparação */}
        <Card>
          <CardHeader>
            <CardTitle>Comparação Detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Item</TableHead>
                    {propostas.map(proposta => {
                      const reputacao = reputacoes[proposta.fornecedor.id];
                      const mediaGeral = reputacao?.media_avaliacoes?.nota_geral || 0;
                      const totalAvaliacoes = reputacao?.media_avaliacoes?.total_avaliacoes || 0;
                      
                      return (
                        <TableHead key={proposta.id} className="text-center min-w-[180px]">
                          <div className="space-y-2">
                            <div className="font-semibold">{proposta.fornecedor.empresa}</div>
                            <div className="text-sm text-muted-foreground">{proposta.fornecedor.nome}</div>
                            
                            {/* Informações de reputação */}
                            {reputacao && totalAvaliacoes > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">
                                    {mediaGeral.toFixed(1)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({totalAvaliacoes})
                                  </span>
                                </div>
                                
                                {/* Mini indicadores */}
                                <div className="flex justify-center gap-1 text-xs">
                                  {reputacao.portfolios.length > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {reputacao.portfolios.length} proj.
                                    </Badge>
                                  )}
                                  {reputacao.selos.length > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      {reputacao.selos.length} selos
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Sem avaliações
                              </div>
                            )}
                            
                            {getStatusBadge(proposta)}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(categoriasComparaveis).map(([categoria, categoriaData]) => (
                    <React.Fragment key={categoria}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={propostas.length + 1} className="font-semibold text-primary">
                          {categoria.toUpperCase()}
                        </TableCell>
                      </TableRow>
                      {Array.from(categoriaData.itens.values())
                        .sort((a: any, b: any) => a.ordem - b.ordem)
                        .map((item: any) => (
                          <TableRow key={item.chave} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="border-r">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{item.nome}</div>
                                  {item.item_extra && (
                                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                                      ITEM EXTRA
                                    </Badge>
                                  )}
                                </div>
                                {item.descricao && (
                                  <div className="text-sm text-muted-foreground">{item.descricao}</div>
                                )}
                              </div>
                            </TableCell>
                            {propostas.map((proposta, index) => {
                              const resposta = buscarRespostaItem(proposta, item.chave);
                              return (
                                <TableCell 
                                  key={proposta.id} 
                                  className={`text-center border-r ${index % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}
                                >
                                  {resposta ? (
                                    <div className="space-y-1 p-2">
                                      <Badge 
                                        variant={resposta.incluido ? "default" : "secondary"}
                                        className={resposta.incluido ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                                      >
                                        {resposta.incluido ? "✓ Incluído" : "✗ Não incluído"}
                                      </Badge>
                                      {resposta.incluido && resposta.valor_estimado > 0 && (
                                        <div className="text-sm font-semibold text-primary">
                                          {formatarValor(resposta.valor_estimado)}
                                        </div>
                                      )}
                                      {resposta.observacoes && (
                                        <div className="text-xs text-muted-foreground italic">
                                          "{resposta.observacoes}"
                                        </div>
                                      )}
                                      {resposta.ambientes && resposta.ambientes.length > 0 && (
                                        <div className="text-xs text-blue-600">
                                          {resposta.ambientes.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      Não avaliado
                                    </Badge>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      <TableRow className="bg-muted/30">
                        <TableCell className="font-semibold">Subtotal {categoria}</TableCell>
                        {propostas.map(proposta => (
                          <TableCell key={proposta.id} className="text-center font-semibold">
                            {formatarValor(categoriaData.subtotalPorProposta[proposta.id] || 0)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </React.Fragment>
                  ))}
                  <TableRow className="bg-primary/10">
                    <TableCell className="font-bold text-lg">TOTAL GERAL</TableCell>
                    {propostas.map(proposta => (
                      <TableCell key={proposta.id} className="text-center font-bold text-lg">
                        {formatarValor(proposta.proposta.valor_total_estimado || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow className="bg-blue-50/50">
                    <TableCell className="font-semibold text-blue-800">FORMA DE PAGAMENTO</TableCell>
                    {propostas.map(proposta => (
                      <TableCell key={proposta.id} className="text-center">
                        <div className="text-sm text-blue-800">
                          {formatarFormaPagamentoResumo(proposta.proposta.forma_pagamento)}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cards ReformaCash e ReformaCred */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
          {/* Card ReformaCash */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xl text-primary">ReformaCash</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <p className="text-sm">Já incluso nas propostas, sem custos extras para você</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🔒</span>
                <p className="text-sm">Proteção financeira em cada etapa</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">📦</span>
                <p className="text-sm">Garantia de entrega da sua obra</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🛠️</span>
                <p className="text-sm">Fornecedores credenciados em qualidade e segurança</p>
              </div>
            </CardContent>
          </Card>

          {/* Card ReformaCred */}
          <Card className="border-2 border-blue-500 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-xl text-blue-700">ReformaCred</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <p className="text-sm">Uma opção extra para você, trazendo mais fôlego para o seu caixa: parcele sua obra em até 75x</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">📉</span>
                <p className="text-sm">Taxa de juros abaixo da Selic</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🚀</span>
                <p className="text-sm">Transforme seu projeto em realidade sem comprometer o orçamento</p>
              </div>
              
              <p className="text-xs text-muted-foreground italic mt-4 pt-3 border-t">
                *Consulte com seu concierge as condições.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações dos Fornecedores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propostas.map(proposta => (
            <Card key={proposta.id}>
              <CardHeader>
                <CardTitle className="text-lg">{proposta.fornecedor.empresa}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Responsável:</strong> {proposta.fornecedor.nome}</p>
                <p><strong>Email:</strong> {proposta.fornecedor.email}</p>
                <p><strong>Telefone:</strong> {proposta.fornecedor.telefone}</p>
                <p><strong>Candidatura:</strong> {formatDistanceToNow(new Date(proposta.data_candidatura), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}</p>
                <div className="pt-2 border-t">
                  <p className="text-2xl font-bold text-primary">
                    {formatarValor(proposta.proposta.valor_total_estimado || 0)}
                  </p>
                </div>
                 {proposta.proposta.observacoes && (
                   <div className="pt-2 border-t">
                     <p className="text-sm text-muted-foreground">
                       <strong>Observações:</strong> {proposta.proposta.observacoes}
                     </p>
                   </div>
                 )}
                  {proposta.proposta.forma_pagamento && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Forma de Pagamento:</strong> 
                        {typeof proposta.proposta.forma_pagamento === 'string' ? (
                          proposta.proposta.forma_pagamento
                        ) : Array.isArray(proposta.proposta.forma_pagamento) && proposta.proposta.forma_pagamento.length > 0 ? (
                          <div className="ml-1 space-y-1">
                            {proposta.proposta.forma_pagamento.map((forma, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium">Opção {idx + 1}:</span>{' '}
                                {forma.tipo === 'a_vista' && 
                                  `À Vista${forma.desconto_porcentagem ? ` com ${forma.desconto_porcentagem}% de desconto` : ''}`}
                                {forma.tipo === 'entrada_medicoes' && 
                                  `Entrada de ${forma.entrada_porcentagem || 0}% + Medições ${forma.frequencia_medicoes || 'conforme execução'}`}
                                {forma.tipo === 'medicoes' && 
                                  `Medições ${forma.frequencia_medicoes || 'conforme execução'}`}
                                {forma.tipo === 'boletos' && 
                                  `${forma.boletos_quantidade || 1} boleto${(forma.boletos_quantidade || 1) > 1 ? 's' : ''}`}
                                {forma.tipo === 'cartao' && 
                                  `Cartão em ${forma.cartao_parcelas || 1}x`}
                                {forma.tipo === 'personalizado' && 
                                  forma.texto_personalizado}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="ml-1 text-muted-foreground">Não informado</span>
                        )}
                      </p>
                     </div>
                   )}
                   
                   {/* Botões de Ação - Posicionados no final do card */}
                   <div className="pt-4 mt-4 border-t">
                     <div className="flex gap-2">
                       <Button
                         size="sm"
                         className="flex-1"
                         onClick={() => {
                           setPropostaSelecionada(proposta);
                           setModalAceitar(true);
                         }}
                       >
                         <CheckCircle2 className="h-4 w-4 mr-1" />
                         Aceitar
                       </Button>
                       <Button
                         size="sm"
                         variant="outline"
                         className="flex-1"
                         onClick={() => {
                           setPropostaSelecionada(proposta);
                           setModalRevisao(true);
                         }}
                       >
                         <FileEdit className="h-4 w-4 mr-1" />
                         Revisar
                       </Button>
                     </div>
                   </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer com informações do acesso */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Este link foi acessado {data.token_info.total_acessos} vez(es) • 
            Expira em {formatDistanceToNow(new Date(data.token_info.expires_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        </div>

        {/* Modals */}
        {propostaSelecionada && (
          <>
            <AceitarPropostaModal
              open={modalAceitar}
              onOpenChange={setModalAceitar}
              proposta={propostaSelecionada}
              onAceitar={async (dados) => {
                const resultado = await aceitarProposta(dados, propostaSelecionada.id, data?.orcamento.id || '');
                if (resultado.success && resultado.credenciais) {
                  setCredenciaisCliente(resultado.credenciais);
                  setModalAceitar(false);
                  setModalSucesso(true);
                }
              }}
              loading={loadingActions}
            />
            <SolicitarRevisaoModal
              open={modalRevisao}
              onOpenChange={setModalRevisao}
              proposta={propostaSelecionada}
              onSolicitar={(dados) => solicitarRevisao(dados, token || '')}
              loading={loadingActions}
            />
          </>
        )}
        
        {/* Modal de sucesso com credenciais */}
        {credenciaisCliente && (
          <SuccessModal
            open={modalSucesso}
            onOpenChange={setModalSucesso}
            credenciais={credenciaisCliente}
            nomeCliente={credenciaisCliente.email || 'Cliente'}
          />
        )}
      </div>
    </div>
  );
};

export default ComparadorCliente;