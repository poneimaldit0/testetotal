import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Lock, ArrowRight, Eye, Building, Calendar, Package, User, ClipboardList, CheckCircle, Star, CreditCard, Shield, Sparkles } from 'lucide-react';
import { useCodigosAcesso } from '@/hooks/useCodigosAcesso';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { ReputacaoFornecedor } from '@/components/fornecedor/ReputacaoFornecedor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PropostaComCodigo } from '@/types/acessoPropostas';

// Função para calcular parcelas do ReformaCred
const calcularParcelasReformaCred = (valorTotal: number) => {
  if (valorTotal <= 50000) {
    const numeroParcelas = 60;
    const valorParcela = (valorTotal * 2.2896) / numeroParcelas;
    return { parcelas: numeroParcelas, valorParcela };
  } else {
    const numeroParcelas = 75;
    const valorParcela = (valorTotal * 1.90425) / numeroParcelas;
    return { parcelas: numeroParcelas, valorParcela };
  }
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

export const AcessoProposta = () => {
  const [codigoOrcamento, setCodigoOrcamento] = useState('');
  const [codigoFornecedor, setCodigoFornecedor] = useState('');
  const [proposta, setProposta] = useState<PropostaComCodigo | null>(null);
  const [validando, setValidando] = useState(false);
  const [codigosPreenchidos, setCodigosPreenchidos] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [debug, setDebug] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { buscarPropostaPorCodigos } = useCodigosAcesso();
  
  // Hook para reputação do fornecedor
  const { 
    reputacao, 
    loading: loadingReputacao,
    buscarReputacaoFornecedor 
  } = useFornecedorReputacao();

  useEffect(() => {
    // Auto-preencher códigos da URL se disponíveis
    const codigoOrc = searchParams.get('codigo_orcamento');
    const codigoForn = searchParams.get('codigo_fornecedor');
    
    if (codigoOrc && codigoForn) {
      setCodigoOrcamento(codigoOrc);
      setCodigoFornecedor(codigoForn);
      setCodigosPreenchidos(true);
      // Não auto-validar mais - deixar usuário confirmar
    }
  }, [searchParams]);

  const handleValidarCodigos = async (codOrcamento?: string, codFornecedor?: string) => {
    const codOrc = codOrcamento || codigoOrcamento;
    const codForn = codFornecedor || codigoFornecedor;
    
    if (!codOrc || !codForn) {
      setErro('Códigos de orçamento e fornecedor são obrigatórios');
      return;
    }

    console.log('🔍 Iniciando validação dos códigos:', { codOrc, codForn });
    setValidando(true);
    setErro('');

    // Timeout de 15 segundos para evitar travamento
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na validação')), 15000);
    });

    try {
      const resultado = await Promise.race([
        buscarPropostaPorCodigos(codOrc, codForn),
        timeoutPromise
      ]);
      
      console.log('✅ Resultado da busca:', resultado);
      
      if (resultado) {
        setProposta(resultado as any);
        console.log('✅ Proposta carregada com sucesso');
        
        // Buscar reputação do fornecedor após carregar a proposta
        if ((resultado as any).candidatura?.fornecedor_id) {
          console.log('🔍 Buscando reputação do fornecedor...');
          await buscarReputacaoFornecedor((resultado as any).candidatura.fornecedor_id);
        }
      } else {
        console.log('❌ Nenhuma proposta encontrada');
        setErro('Códigos inválidos ou proposta não encontrada. Verifique os códigos e tente novamente.');
      }
    } catch (error: any) {
      console.error('❌ Erro na validação:', error);
      
      if (error.message === 'Timeout na validação') {
        setErro('A validação está demorando mais que o esperado. Tente novamente.');
      } else {
        setErro(`Erro ao validar códigos: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setValidando(false);
      console.log('🏁 Validação finalizada');
    }
  };

  const formatarCategoria = (categorias: string[]) => {
    return categorias.join(', ');
  };

  if (proposta) {
    const { orcamento, candidatura, proposta: detalheProposta, codigo_info } = proposta;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background/50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card className="shadow-xl border-border/50">
            <CardHeader className="space-y-1 pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground">
                  Detalhes da Proposta
                </CardTitle>
                <Badge variant="secondary" className="px-3 py-1">
                  Visualizações: {codigo_info?.visualizacoes || 0}
                </Badge>
              </div>
              <CardDescription className="text-muted-foreground">
                Proposta de {candidatura.empresa} para o orçamento solicitado
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Sobre o Fornecedor */}
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Star className="mr-2 h-5 w-5 text-primary" />
                Sobre o Fornecedor
              </CardTitle>
              <CardDescription>
                Conheça a reputação, experiência e qualificações de {candidatura.empresa}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReputacao ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">Carregando informações do fornecedor...</span>
                </div>
              ) : reputacao ? (
                <ReputacaoFornecedor 
                  reputacao={reputacao} 
                  compacto={false}
                />
              ) : (
                <div className="text-center py-8">
                  <div className="bg-muted/30 rounded-lg p-6">
                    <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Informações de reputação não disponíveis
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Este fornecedor ainda não possui avaliações, portfólio ou certificações cadastradas.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalhamento por Categoria */}
          {(() => {
            const categoriasComItens = Object.entries(detalheProposta.categorias || {})
              .filter(([categoria, dados]) => dados.itens.some(item => item.incluido));
            
            if (categoriasComItens.length === 0) {
              return (
                <Card className="shadow-lg border-border/50">
                  <CardContent className="py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Nenhum serviço incluído na proposta
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Esta proposta ainda não possui itens selecionados.
                    </p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card className="shadow-lg border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <Package className="mr-2 h-5 w-5 text-primary" />
                    Detalhamento por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {categoriasComItens.map(([categoria, dados]) => {
                    const itensIncluidos = dados.itens.filter(item => item.incluido);
                    
                    return (
                      <div key={categoria} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-foreground">{categoria}</h3>
                          <Badge variant="outline" className="font-semibold">
                            Subtotal: {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(itensIncluidos.reduce((sum, item) => sum + item.valor_estimado, 0))}
                          </Badge>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full table-fixed">
                            <colgroup>
                              <col className="w-[40%]" />
                              <col className="w-[15%]" />
                              <col className="w-[25%]" />
                              <col className="w-[20%]" />
                            </colgroup>
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Serviço</th>
                                <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Valor</th>
                                <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Ambientes</th>
                                <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Observações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itensIncluidos.map((item) => (
                                <tr key={item.id} className="border-b border-border/30">
                                  <td className="py-3 px-2 align-top">
                                    <div className="break-words">
                                      <p className="font-medium text-foreground leading-tight">{item.nome}</p>
                                      {item.descricao && (
                                        <p className="text-sm text-muted-foreground mt-1 leading-tight">{item.descricao}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-2 text-right font-medium align-top">
                                    <span className="text-foreground text-sm">
                                      {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      }).format(item.valor_estimado)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 align-top">
                                    {item.ambientes && item.ambientes.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 max-w-full">
                                        {item.ambientes.slice(0, 3).map((ambiente, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs whitespace-nowrap">
                                            {ambiente}
                                          </Badge>
                                        ))}
                                        {item.ambientes.length > 3 && (
                                          <Badge variant="secondary" className="text-xs">
                                            +{item.ambientes.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-2 align-top">
                                    {item.observacoes ? (
                                      <span className="text-sm text-muted-foreground break-words leading-tight">{item.observacoes}</span>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })()}

          {/* Resumo da Proposta */}
          <Card className="shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <ClipboardList className="mr-2 h-5 w-5 text-primary" />
                Resumo da Proposta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Valor Total */}
              <div>
                <p className="text-base text-muted-foreground mb-1">
                  Valor total da proposta
                </p>
                <p className="text-4xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(detalheProposta.valor_total_estimado || 0)}
                </p>
              </div>

              {/* Condições de Pagamento */}
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <p className="text-base">
                  <span className="font-medium">Condições de Pagamento:</span>{' '}
                  {detalheProposta.forma_pagamento && Array.isArray(detalheProposta.forma_pagamento) && detalheProposta.forma_pagamento.length > 0
                    ? formatarFormaPagamentoResumo(detalheProposta.forma_pagamento)
                    : 'À Vista'
                  }
                </p>
              </div>

              {/* Grid com 2 Cards Grandes */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Verde - ReformaCash */}
                <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all">
                  <CardContent className="p-3 text-center flex flex-col justify-between h-full">
                    <div className="mb-1">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white mb-1">
                        <Shield className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-green-700 mb-3">
                      ReformaCash
                    </h3>
                    
                    <div className="space-y-2 flex-grow flex flex-col justify-evenly">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-green-600 text-base">✅</span>
                        <p className="text-sm text-gray-700">Sem custos extras para você</p>
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-yellow-600 text-base">💰</span>
                        <p className="text-sm text-gray-700">Proteção financeira em cada etapa</p>
                      </div>
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-orange-600 text-base">📦</span>
                        <p className="text-sm text-gray-700">Garantia de entrega da sua obra</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card Amarelo - ReformaCred */}
                <Card className="border-2 border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 hover:shadow-xl transition-all">
                  <CardContent className="p-3 text-center">
                    <div className="mb-1">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500 text-white mb-1">
                        <CreditCard className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-yellow-700 mb-1.5">
                      Parcelar com<br />ReformaCred*
                    </h3>
                    
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-700">
                        Parcele em até
                      </p>
                      <p className="text-xl font-bold text-yellow-700">
                        {calcularParcelasReformaCred(detalheProposta.valor_total_estimado).parcelas}x
                      </p>
                      <p className="text-[10px] text-gray-600">de</p>
                      <p className="text-lg font-bold text-green-600">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(calcularParcelasReformaCred(detalheProposta.valor_total_estimado).valorParcela)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Nota sobre ReformaCash */}
              <div className="p-4 bg-blue-50/80 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                  <span className="text-blue-500">💡</span>
                  <span>
                    Todos os pagamentos já incluem o <span className="font-semibold text-green-600">ReformaCash</span>: 
                    o meio de pagamento seguro da Reforma100, que garante que seu dinheiro só é liberado ao 
                    fornecedor conforme a evolução da obra.
                  </span>
                </p>
              </div>

              {/* Nota sobre condições de crédito */}
              <p className="text-xs text-gray-500 italic text-center">
                *Condições podem variar sujeito a análise de crédito
              </p>
              
              {/* Observações Gerais */}
              {detalheProposta.observacoes_gerais && (
                <div className="p-4 bg-card/30 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2 text-sm">Observações Gerais:</h4>
                  <p className="text-sm text-muted-foreground">{detalheProposta.observacoes_gerais}</p>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Footer */}
          <Card className="shadow-lg border-border/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Esta é a proposta detalhada do fornecedor. Todas as informações técnicas e valores estão especificados acima.
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                >
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Lock className="h-6 w-6" />
            Acesso à Proposta
          </CardTitle>
          <CardDescription>
            {codigosPreenchidos 
              ? "Seus códigos foram preenchidos automaticamente. Confirme para acessar sua proposta."
              : "Digite os códigos recebidos para acessar sua proposta"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {codigosPreenchidos && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Códigos Pré-preenchidos</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Os códigos foram preenchidos automaticamente através do link recebido.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo-orcamento">
                Código do Orçamento
                {codigosPreenchidos && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Pré-preenchido
                  </Badge>
                )}
              </Label>
              <Input
                id="codigo-orcamento"
                placeholder="Ex: F1FC5B72"
                value={codigoOrcamento}
                onChange={(e) => setCodigoOrcamento(e.target.value.toUpperCase())}
                className={`font-mono text-center text-lg ${
                  codigosPreenchidos ? 'bg-primary/5 border-primary/30' : ''
                }`}
                maxLength={8}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="codigo-fornecedor">
                Código do Fornecedor
                {codigosPreenchidos && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Pré-preenchido
                  </Badge>
                )}
              </Label>
              <Input
                id="codigo-fornecedor"
                placeholder="Ex: FORN001"
                value={codigoFornecedor}
                onChange={(e) => setCodigoFornecedor(e.target.value.toUpperCase())}
                className={`font-mono text-center text-lg ${
                  codigosPreenchidos ? 'bg-primary/5 border-primary/30' : ''
                }`}
                maxLength={8}
              />
            </div>
          </div>
          
          <Separator />
          
          <Button 
            onClick={() => handleValidarCodigos()}
            disabled={!codigoOrcamento || !codigoFornecedor || validando}
            className="w-full"
            variant={codigosPreenchidos ? "default" : "default"}
          >
            {validando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Validando códigos...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                {codigosPreenchidos ? "Acessar Minha Proposta" : "Acessar Proposta"}
              </>
            )}
          </Button>

          {erro && (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">{erro}</p>
              </div>
              
              <Button
                variant="outline"
                onClick={() => handleValidarCodigos()}
                className="w-full"
                size="sm"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>
          )}

          {(erro || process.env.NODE_ENV === 'development') && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDebug(!debug)}
                className="text-xs"
              >
                {debug ? 'Ocultar' : 'Mostrar'} Debug
              </Button>
            </div>
          )}

          {debug && (
            <div className="p-3 bg-muted/50 border rounded-md text-xs space-y-2">
              <p><strong>Informações de Debug:</strong></p>
              <p>• Código Orçamento: "{codigoOrcamento}"</p>
              <p>• Código Fornecedor: "{codigoFornecedor}"</p>
              <p>• Códigos preenchidos automaticamente: {codigosPreenchidos ? 'Sim' : 'Não'}</p>
              <p>• Estado validação: {validando ? 'Validando...' : 'Parado'}</p>
              <p>• URL atual: {window.location.href}</p>
            </div>
          )}
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Não possui os códigos?</p>
            <p>Entre em contato com o fornecedor que enviou a proposta.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};