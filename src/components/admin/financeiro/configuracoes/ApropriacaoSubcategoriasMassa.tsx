import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  ArrowRight, 
  Search, 
  Filter,
  CheckSquare2,
  Square,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useConfiguracaoFinanceira } from '@/hooks/useConfiguracaoFinanceira';
import { SubcategoriaSelector } from '../SubcategoriaSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RegistroFinanceiro {
  id: string;
  descricao: string;
  valor_original: number;
  data_vencimento: string;
  status: string;
  categoria_id: string;
  categoria?: {
    id: string;
    nome: string;
    tipo: string;
  };
  cliente_nome?: string;
  fornecedor_nome?: string;
}

export function ApropriacaoSubcategoriasMassa() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const [contasReceber, setContasReceber] = useState<RegistroFinanceiro[]>([]);
  const [contasPagar, setContasPagar] = useState<RegistroFinanceiro[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('all');
  const [subcategoriaSelecionada, setSubcategoriaSelecionada] = useState<string>('');
  const [categoriaSelecionadaParaApropriacao, setCategoriaSelecionadaParaApropriacao] = useState<string>('');
  const [registrosSelecionados, setRegistrosSelecionados] = useState<string[]>([]);
  const [tipoAtivo, setTipoAtivo] = useState<'receber' | 'pagar'>('receber');
  const [busca, setBusca] = useState('');
  
  const {
    loading,
    buscarRegistrosSemSubcategoria,
    buscarCategorias,
    apropriarSubcategoriasMassa
  } = useConfiguracaoFinanceira();

  const [categorias, setCategorias] = useState<any[]>([]);

  const carregarDados = async () => {
    const [registros, categoriasData] = await Promise.all([
      buscarRegistrosSemSubcategoria(),
      buscarCategorias()
    ]);
    
    setContasReceber(registros.contasReceber);
    setContasPagar(registros.contasPagar);
    setCategorias(categoriasData);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const registrosAtivos = tipoAtivo === 'receber' ? contasReceber : contasPagar;
  
  const registrosFiltrados = registrosAtivos.filter(registro => {
    const matchBusca = registro.descricao.toLowerCase().includes(busca.toLowerCase()) ||
                      (registro.cliente_nome?.toLowerCase().includes(busca.toLowerCase())) ||
                      (registro.fornecedor_nome?.toLowerCase().includes(busca.toLowerCase()));
    
    const matchCategoria = categoriaSelecionada === 'all' || registro.categoria_id === categoriaSelecionada;
    
    return matchBusca && matchCategoria;
  });

  const handleSelecionarTodos = () => {
    if (registrosSelecionados.length === registrosFiltrados.length) {
      setRegistrosSelecionados([]);
    } else {
      setRegistrosSelecionados(registrosFiltrados.map(r => r.id));
    }
  };

  const handleSelecionarRegistro = (id: string, selecionado: boolean) => {
    if (selecionado) {
      setRegistrosSelecionados([...registrosSelecionados, id]);
    } else {
      setRegistrosSelecionados(registrosSelecionados.filter(sid => sid !== id));
    }
  };

  const handleApropriar = async () => {
    const categoriaFinal = categoriaParaUsar;
    
    if (!subcategoriaSelecionada || !categoriaFinal || registrosSelecionados.length === 0 || categoriaRegistrosSelecionados === 'mixed') {
      return;
    }

    const sucesso = await apropriarSubcategoriasMassa({
      tipo: tipoAtivo === 'receber' ? 'conta_receber' : 'conta_pagar',
      ids: registrosSelecionados,
      categoria_id: categoriaFinal,
      subcategoria_id: subcategoriaSelecionada
    });

    if (sucesso) {
      await carregarDados();
      setRegistrosSelecionados([]);
      setSubcategoriaSelecionada('');
      setCategoriaSelecionadaParaApropriacao('');
    }
  };

  // Detectar categoria dos registros selecionados
  const categoriaRegistrosSelecionados = useMemo(() => {
    if (registrosSelecionados.length === 0) return null;
    
    const categorias = registrosSelecionados.map(id => {
      const registro = registrosAtivos.find(r => r.id === id);
      return registro?.categoria_id;
    }).filter(Boolean);
    
    if (categorias.length === 0) return null;
    
    // Verificar se todos os registros têm a mesma categoria
    const categoriasUnicas = [...new Set(categorias)];
    if (categoriasUnicas.length === 1) {
      return categoriasUnicas[0];
    }
    
    return 'mixed'; // Categorias diferentes
  }, [registrosSelecionados, registrosAtivos]);

  // Categoria a ser usada para apropriação
  const categoriaParaUsar = useMemo(() => {
    // Se os registros já têm categoria, usar a detectada
    if (categoriaRegistrosSelecionados && categoriaRegistrosSelecionados !== 'mixed') {
      return categoriaRegistrosSelecionados;
    }
    
    // Se os registros não têm categoria mas usuário selecionou manualmente
    if (!categoriaRegistrosSelecionados && categoriaSelecionadaParaApropriacao) {
      return categoriaSelecionadaParaApropriacao;
    }
    
    return null;
  }, [categoriaRegistrosSelecionados, categoriaSelecionadaParaApropriacao]);

  const nomeCategoriaSelecionados = useMemo(() => {
    if (!categoriaRegistrosSelecionados || categoriaRegistrosSelecionados === 'mixed') return null;
    
    const categoria = categorias.find(c => c.id === categoriaRegistrosSelecionados);
    return categoria?.nome;
  }, [categoriaRegistrosSelecionados, categorias]);

  // Limpar subcategoria quando seleção muda ou quando mudar para "Todas as categorias"
  useEffect(() => {
    if (categoriaSelecionada === 'all') {
      setSubcategoriaSelecionada('');
    }
  }, [categoriaSelecionada]);

  useEffect(() => {
    if (categoriaRegistrosSelecionados === 'mixed' || !categoriaRegistrosSelecionados) {
      setSubcategoriaSelecionada('');
    }
  }, [categoriaRegistrosSelecionados]);

  const totalSelecionados = registrosSelecionados.length;
  const valorTotalSelecionados = registrosFiltrados
    .filter(r => registrosSelecionados.includes(r.id))
    .reduce((acc, r) => acc + r.valor_original, 0);

  const estatisticas = {
    receber: {
      total: contasReceber.length,
      valor: contasReceber.reduce((acc, r) => acc + r.valor_original, 0)
    },
    pagar: {
      total: contasPagar.length,
      valor: contasPagar.reduce((acc, r) => acc + r.valor_original, 0)
    }
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Contas a Receber</p>
                  <p className="text-xs text-muted-foreground">Sem subcategoria</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{estatisticas.receber.total}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(estatisticas.receber.valor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Contas a Pagar</p>
                  <p className="text-xs text-muted-foreground">Sem subcategoria</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">{estatisticas.pagar.total}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(estatisticas.pagar.valor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tipoAtivo} onValueChange={(value) => setTipoAtivo(value as 'receber' | 'pagar')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receber" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Contas a Receber ({estatisticas.receber.total})
          </TabsTrigger>
          <TabsTrigger value="pagar" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Contas a Pagar ({estatisticas.pagar.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tipoAtivo} className="space-y-4">
          {/* Filtros e Busca */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="busca">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="busca"
                      placeholder="Buscar por descrição ou nome..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="w-full lg:w-64">
                  <Label>Filtrar por Categoria</Label>
                  <Select value={categoriaSelecionada} onValueChange={setCategoriaSelecionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categorias
                        .filter(cat => cat.tipo === (tipoAtivo === 'receber' ? 'receita' : 'despesa'))
                        .map(categoria => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Painel de Apropriação */}
          {totalSelecionados > 0 && (
            <Card className="border-primary">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Apropriação em Massa</h3>
                    <p className="text-sm text-muted-foreground">
                      {totalSelecionados} registro(s) selecionado(s) - {formatCurrency(valorTotalSelecionados)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {totalSelecionados} selecionado(s)
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    {!categoriaRegistrosSelecionados ? (
                      <div className="space-y-3">
                        <div className="p-3 border rounded-md bg-yellow-50 border-yellow-200 text-yellow-800 text-sm">
                          <div className="font-medium">⚠️ Registros sem categoria</div>
                          <div className="text-xs mt-1">
                            Selecione primeiro uma categoria e depois a subcategoria
                          </div>
                        </div>
                        
                        <div>
                          <Label>1. Selecionar Categoria</Label>
                          <Select 
                            value={categoriaSelecionadaParaApropriacao} 
                            onValueChange={setCategoriaSelecionadaParaApropriacao}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Escolha uma categoria..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categorias
                                .filter(cat => cat.tipo === (tipoAtivo === 'receber' ? 'receita' : 'despesa'))
                                .map(categoria => (
                                  <SelectItem key={categoria.id} value={categoria.id}>
                                    {categoria.nome}
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {categoriaSelecionadaParaApropriacao && (
                          <div>
                            <Label>2. Selecionar Subcategoria</Label>
                            <SubcategoriaSelector
                              categoriaId={categoriaSelecionadaParaApropriacao}
                              value={subcategoriaSelecionada}
                              onValueChange={setSubcategoriaSelecionada}
                              placeholder="Escolha uma subcategoria..."
                            />
                          </div>
                        )}
                      </div>
                    ) : categoriaRegistrosSelecionados === 'mixed' ? (
                      <div>
                        <Label>Selecionar Subcategoria</Label>
                        <div className="p-3 border rounded-md bg-orange-50 border-orange-200 text-orange-700 text-sm">
                          <div className="font-medium">Categorias mistas selecionadas</div>
                          <div className="text-xs mt-1">Selecione apenas registros da mesma categoria para apropriar uma subcategoria</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label>Selecionar Subcategoria</Label>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Categoria detectada: <span className="font-medium text-foreground">{nomeCategoriaSelecionados}</span>
                          </div>
                          <SubcategoriaSelector
                            categoriaId={categoriaRegistrosSelecionados}
                            value={subcategoriaSelecionada}
                            onValueChange={setSubcategoriaSelecionada}
                            placeholder="Escolha uma subcategoria..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleApropriar}
                    disabled={loading || !subcategoriaSelecionada || categoriaRegistrosSelecionados === 'mixed' || !categoriaParaUsar}
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Apropriar ({totalSelecionados})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Registros */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Registros sem Subcategoria ({registrosFiltrados.length})
                </CardTitle>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelecionarTodos}
                  className="flex items-center gap-2"
                >
                  {registrosSelecionados.length === registrosFiltrados.length ? (
                    <CheckSquare2 className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {registrosSelecionados.length === registrosFiltrados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {registrosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum registro encontrado sem subcategoria</p>
                      {busca && (
                        <p className="text-sm mt-2">
                          Tente ajustar os filtros de busca
                        </p>
                      )}
                    </div>
                  ) : (
                    registrosFiltrados.map(registro => (
                      <div
                        key={registro.id}
                        className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={registrosSelecionados.includes(registro.id)}
                          onCheckedChange={(checked) => 
                            handleSelecionarRegistro(registro.id, checked as boolean)
                          }
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{registro.descricao}</p>
                            <div className="flex items-center gap-1">
                              <Badge 
                                variant={
                                  registro.status === 'pendente' ? 'secondary' :
                                  registro.status === 'pago' || registro.status === 'recebido' ? 'default' :
                                  registro.status === 'perda' ? 'destructive' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {registro.status === 'pago' && 'Pago'}
                                {registro.status === 'recebido' && 'Recebido'}
                                {registro.status === 'pendente' && 'Pendente'}
                                {registro.status === 'perda' && 'Perda'}
                                {!['pago', 'recebido', 'pendente', 'perda'].includes(registro.status) && registro.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {registro.categoria?.nome || 'Sem categoria'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(registro.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            
                            <span>
                              {tipoAtivo === 'receber' ? registro.cliente_nome : registro.fornecedor_nome}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {formatCurrency(registro.valor_original)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}