import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ApropriacaoDetalhe {
  id: string;
  tipo: 'conta_receber' | 'conta_pagar';
  descricao: string;
  categoria: string;
  subcategoria_apropriada: string;
  confianca: 'alta' | 'media' | 'baixa';
  padroes_encontrados: string[];
  pessoa_nome: string;
  pessoa_email?: string;
  pessoa_telefone?: string;
  valor_original: number;
  data_vencimento: string;
  status: string;
  observacoes?: string;
}

interface ContaSemMatch {
  id: string;
  tipo: 'conta_receber' | 'conta_pagar';
  descricao: string;
  categoria: string;
}

interface ResultadoAnalise {
  total_analisadas: number;
  apropriadas_com_sucesso: number;
  sem_match: number;
  detalhes: ApropriacaoDetalhe[];
  sem_match_lista: ContaSemMatch[];
}

export function ApropriacaoAutomaticaReview() {
  const { toast } = useToast();
  const [analisando, setAnalisando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [filtroConfianca, setFiltroConfianca] = useState<'todas' | 'alta' | 'media'>('todas');
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [modoSelecao, setModoSelecao] = useState<'todos' | 'individual'>('todos');

  const analisarApropriacoes = async () => {
    setAnalisando(true);
    try {
      const { data, error } = await supabase.functions.invoke('apropriar-subcategorias-automatico', {
        body: { modo: 'dry_run', tipo: 'todas' }
      });

      if (error) throw error;

      if (data.sucesso) {
        setResultado(data.resultado);
        toast({
          title: "Análise concluída",
          description: `${data.resultado.apropriadas_com_sucesso} contas podem ser apropriadas automaticamente`,
        });
      } else {
        throw new Error(data.erro || 'Erro ao analisar apropriações');
      }
    } catch (error: any) {
      console.error('Erro ao analisar apropriações:', error);
      toast({
        title: "Erro ao analisar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalisando(false);
    }
  };

  const executarApropriacoes = async () => {
    const idsParaApropriar = modoSelecao === 'todos' 
      ? [] 
      : Array.from(itensSelecionados);

    if (modoSelecao === 'individual' && idsParaApropriar.length === 0) {
      toast({
        title: "Nenhuma conta selecionada",
        description: "Selecione ao menos uma conta para apropriar",
        variant: "destructive",
      });
      return;
    }

    setExecutando(true);
    try {
      const { data, error } = await supabase.functions.invoke('apropriar-subcategorias-automatico', {
        body: { 
          modo: 'executar', 
          tipo: 'todas',
          ids_selecionados: idsParaApropriar
        }
      });

      if (error) throw error;

      if (data.sucesso) {
        const qtd = modoSelecao === 'individual' ? idsParaApropriar.length : data.resultado.apropriadas_com_sucesso;
        toast({
          title: "Apropriações executadas",
          description: `${qtd} contas foram apropriadas com sucesso`,
        });
        setResultado(null);
        setItensSelecionados(new Set());
        // Recarregar a página para atualizar os dados
        window.location.reload();
      } else {
        throw new Error(data.erro || 'Erro ao executar apropriações');
      }
    } catch (error: any) {
      console.error('Erro ao executar apropriações:', error);
      toast({
        title: "Erro ao executar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExecutando(false);
    }
  };

  const toggleSelecao = (id: string) => {
    setItensSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  };

  const selecionarTodos = () => {
    setItensSelecionados(new Set(detalhesFiltrados.map(d => d.id)));
  };

  const desselecionarTodos = () => {
    setItensSelecionados(new Set());
  };

  const getConfiancaBadge = (confianca: string) => {
    switch (confianca) {
      case 'alta':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Alta Confiança</Badge>;
      case 'media':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Média Confiança</Badge>;
      case 'baixa':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Baixa Confiança</Badge>;
      default:
        return null;
    }
  };

  const detalhesFiltrados = resultado?.detalhes.filter(d => {
    if (filtroConfianca === 'todas') return true;
    return d.confianca === filtroConfianca;
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Apropriação Automática Inteligente
            </CardTitle>
            <CardDescription>
              Sistema inteligente que analisa padrões e apropria subcategorias automaticamente
            </CardDescription>
          </div>
          <Button
            onClick={analisarApropriacoes}
            disabled={analisando}
            className="gap-2"
          >
            {analisando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analisar Apropriações
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {resultado && (
        <CardContent className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{resultado.total_analisadas}</p>
                  <p className="text-sm text-muted-foreground">Contas Analisadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{resultado.apropriadas_com_sucesso}</p>
                  <p className="text-sm text-muted-foreground">Podem ser Apropriadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{resultado.sem_match}</p>
                  <p className="text-sm text-muted-foreground">Precisam Revisão Manual</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerta de confirmação */}
          {resultado.apropriadas_com_sucesso > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {resultado.apropriadas_com_sucesso} contas estão prontas para apropriação automática.
                  Revise os detalhes abaixo e confirme.
                </span>
                <Button
                  onClick={executarApropriacoes}
                  disabled={executando}
                  className="ml-4 gap-2"
                >
                  {executando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Executar Apropriações
                    </>
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs com detalhes */}
          <Tabs defaultValue="apropriacoes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="apropriacoes">
                Apropriações Sugeridas ({resultado.apropriadas_com_sucesso})
              </TabsTrigger>
              <TabsTrigger value="sem-match">
                Sem Match ({resultado.sem_match})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="apropriacoes" className="space-y-4">
              {/* Controles de Seleção */}
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <Button
                    variant={modoSelecao === 'todos' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setModoSelecao('todos');
                      setItensSelecionados(new Set());
                    }}
                  >
                    Apropriar Todas
                  </Button>
                  <Button
                    variant={modoSelecao === 'individual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModoSelecao('individual')}
                  >
                    Seleção Individual
                  </Button>
                </div>

                {modoSelecao === 'individual' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {itensSelecionados.size} de {detalhesFiltrados.length} selecionadas
                    </span>
                    <Button variant="outline" size="sm" onClick={selecionarTodos}>
                      Selecionar Todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={desselecionarTodos}>
                      Desmarcar Todas
                    </Button>
                  </div>
                )}
              </div>

              {/* Filtro de confiança */}
              <div className="flex gap-2">
                <Button
                  variant={filtroConfianca === 'todas' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroConfianca('todas')}
                >
                  Todas ({resultado.detalhes.length})
                </Button>
                <Button
                  variant={filtroConfianca === 'alta' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroConfianca('alta')}
                >
                  Alta Confiança ({resultado.detalhes.filter(d => d.confianca === 'alta').length})
                </Button>
                <Button
                  variant={filtroConfianca === 'media' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroConfianca('media')}
                >
                  Média Confiança ({resultado.detalhes.filter(d => d.confianca === 'media').length})
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {modoSelecao === 'individual' && <TableHead className="w-12">✓</TableHead>}
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente/Fornecedor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Subcategoria Sugerida</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead>Padrões</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalhesFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={modoSelecao === 'individual' ? 10 : 9} className="text-center text-muted-foreground">
                          Nenhuma apropriação com esse nível de confiança
                        </TableCell>
                      </TableRow>
                    ) : (
                      detalhesFiltrados.map((detalhe) => (
                        <TableRow key={detalhe.id}>
                          {modoSelecao === 'individual' && (
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={itensSelecionados.has(detalhe.id)}
                                onChange={() => toggleSelecao(detalhe.id)}
                                disabled={executando}
                                className="h-4 w-4 rounded border-input cursor-pointer disabled:opacity-50"
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="outline">
                              {detalhe.tipo === 'conta_receber' ? 'A Receber' : 'A Pagar'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-sm truncate" title={detalhe.pessoa_nome}>
                                {detalhe.pessoa_nome}
                              </span>
                              {detalhe.pessoa_email && (
                                <span className="text-xs text-muted-foreground truncate" title={detalhe.pessoa_email}>
                                  {detalhe.pessoa_email}
                                </span>
                              )}
                              {detalhe.pessoa_telefone && (
                                <span className="text-xs text-muted-foreground">
                                  {detalhe.pessoa_telefone}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm truncate" title={detalhe.descricao}>
                                {detalhe.descricao}
                              </span>
                              {detalhe.observacoes && (
                                <span className="text-xs text-muted-foreground italic truncate" title={detalhe.observacoes}>
                                  {detalhe.observacoes}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(detalhe.valor_original)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(detalhe.data_vencimento).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{detalhe.categoria}</TableCell>
                          <TableCell className="font-medium text-primary">
                            {detalhe.subcategoria_apropriada}
                          </TableCell>
                          <TableCell>{getConfiancaBadge(detalhe.confianca)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {detalhe.padroes_encontrados.slice(0, 2).map((padrao, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {padrao}
                                </Badge>
                              ))}
                              {detalhe.padroes_encontrados.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{detalhe.padroes_encontrados.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="sem-match" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Essas contas não puderam ser apropriadas automaticamente e precisam de revisão manual.
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.sem_match_lista.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2 py-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                            <p>Todas as contas puderam ser apropriadas automaticamente!</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      resultado.sem_match_lista.map((conta) => (
                        <TableRow key={conta.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {conta.tipo === 'conta_receber' ? 'A Receber' : 'A Pagar'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate" title={conta.descricao}>
                            {conta.descricao}
                          </TableCell>
                          <TableCell>{conta.categoria}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
