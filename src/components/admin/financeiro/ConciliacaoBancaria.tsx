import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { ContaBancaria, MovimentacaoBancaria, DashboardBancario } from '@/types/financeiro';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Building2, ArrowUpDown, CheckCircle, XCircle, Search, RefreshCw, Lock, Unlock, AlertTriangle, Download, Sparkles } from 'lucide-react';
import { ConciliacaoRapida } from './ConciliacaoRapida';
import { exportarConciliacaoBancariaExcel } from '@/utils/exportacaoConciliacaoBancaria';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { formatarDataParaExibicao } from '@/utils/dateUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

export function ConciliacaoBancaria() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<string>('');
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoBancaria[]>([]);
  const [dashboardBancario, setDashboardBancario] = useState<DashboardBancario | null>(null);
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    conciliado: undefined as boolean | undefined,
    busca: ''
  });
  
  // Estados para seleção múltipla
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [saldoPreview, setSaldoPreview] = useState<number>(0);
  
  // Estados para fechamento de caixa
  const [fechamentosCaixa, setFechamentosCaixa] = useState<any[]>([]);
  const [dataFechamento, setDataFechamento] = useState('');
  const [observacoesFechamento, setObservacoesFechamento] = useState('');
  
  // Estado para Conciliação Rápida
  const [showConciliacaoRapida, setShowConciliacaoRapida] = useState(false);
  
  const { 
    buscarContasBancarias, 
    buscarMovimentacoesBancarias, 
    marcarTransacaoConciliada, 
    buscarDashboardBancario,
    loading 
  } = useFinanceiro();
  const { toast } = useToast();

  const carregarContas = async () => {
    const contasData = await buscarContasBancarias();
    setContas(contasData.filter(conta => conta.ativa));
    if (contasData.length > 0 && !contaSelecionada) {
      setContaSelecionada(contasData[0].id);
    }
  };

  const carregarMovimentacoes = async () => {
    if (!contaSelecionada) return;
    
    const movimentacoesData = await buscarMovimentacoesBancarias(contaSelecionada, {
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      conciliado: filtros.conciliado
    });
    
    // Filtrar por busca se necessário
    let movimentacoesFiltradas = movimentacoesData;
    if (filtros.busca) {
      movimentacoesFiltradas = movimentacoesData.filter(mov => 
        mov.descricao.toLowerCase().includes(filtros.busca.toLowerCase())
      );
    }
    
    setMovimentacoes(movimentacoesFiltradas);
  };

  const carregarDashboard = async () => {
    const dashboard = await buscarDashboardBancario();
    setDashboardBancario(dashboard);
  };

  const carregarFechamentos = async () => {
    if (!contaSelecionada) return;
    
    try {
      const { data, error } = await supabase
        .from('fechamentos_caixa')
        .select('*')
        .eq('conta_bancaria_id', contaSelecionada)
        .order('data_fechamento', { ascending: false });
      
      if (error) throw error;
      setFechamentosCaixa(data || []);
    } catch (error) {
      console.error('Erro ao carregar fechamentos:', error);
    }
  };

  // Variáveis calculadas
  const contaAtual = contas.find(conta => conta.id === contaSelecionada);
  const transacoesPendentes = movimentacoes.filter(mov => !mov.conciliado);

  useEffect(() => {
    carregarContas();
    carregarDashboard();
  }, []);

  useEffect(() => {
    if (contaSelecionada) {
      carregarMovimentacoes();
      carregarFechamentos();
      setItensSelecionados(new Set()); // Limpar seleções ao trocar conta
    }
  }, [contaSelecionada, filtros]);

  // Calcular preview do saldo baseado nas seleções
  useEffect(() => {
    const itensParaConciliar = movimentacoes.filter(mov => 
      itensSelecionados.has(mov.id) && !mov.conciliado
    );
    
    const impactoSaldo = itensParaConciliar.reduce((total, mov) => {
      return total + (mov.tipo === 'entrada' ? mov.valor : -mov.valor);
    }, 0);
    
    setSaldoPreview((contaAtual?.saldo_atual || 0) + impactoSaldo);
  }, [itensSelecionados, movimentacoes, contaAtual]);

  // Funções de seleção múltipla
  const selecionarTodos = () => {
    const todosIds = movimentacoes.filter(mov => !mov.conciliado).map(mov => mov.id);
    setItensSelecionados(new Set(todosIds));
  };

  const deselecionarTodos = () => {
    setItensSelecionados(new Set());
  };

  const toggleSelecao = (id: string) => {
    const novaSeleção = new Set(itensSelecionados);
    if (novaSeleção.has(id)) {
      novaSeleção.delete(id);
    } else {
      novaSeleção.add(id);
    }
    setItensSelecionados(novaSeleção);
  };

  const conciliarSelecionados = async () => {
    const promises = Array.from(itensSelecionados).map(id => 
      marcarTransacaoConciliada(id, true)
    );
    
    const resultados = await Promise.all(promises);
    const sucessos = resultados.filter(Boolean).length;
    
    if (sucessos > 0) {
      // Atualizar estado local
      setMovimentacoes(prev => prev.map(mov => 
        itensSelecionados.has(mov.id) ? { ...mov, conciliado: true } : mov
      ));
      
      // Limpar seleções
      setItensSelecionados(new Set());
      
      toast({
        title: "Sucesso",
        description: `${sucessos} transações conciliadas com sucesso`,
      });
      
      // Recarregar dados
      carregarMovimentacoes();
      carregarDashboard();
    }
  };

  // Função para fechar caixa
  const fecharCaixa = async () => {
    if (!contaSelecionada || !dataFechamento) {
      toast({
        title: "Erro",
        description: "Selecione uma conta e data para fechamento",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('fechar_caixa', {
        p_conta_bancaria_id: contaSelecionada,
        p_data_fechamento: dataFechamento,
        p_observacoes: observacoesFechamento || null
      });

      if (error) throw error;

      const resultado = data as any;
      if (resultado.success) {
        toast({
          title: "Sucesso",
          description: resultado.message,
        });
        
        setDataFechamento('');
        setObservacoesFechamento('');
        carregarFechamentos();
      } else {
        toast({
          title: "Erro",
          description: resultado.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      toast({
        title: "Erro",
        description: "Erro interno ao fechar caixa",
        variant: "destructive",
      });
    }
  };

  // Verificar se a data está fechada
  const verificarDataFechada = (data: string) => {
    return fechamentosCaixa.some(f => f.data_fechamento === data && f.status === 'fechado');
  };

  const handleMarcarConciliado = async (movimentacaoId: string, conciliado: boolean) => {
    // Verificar se a movimentação já tem o status correto para evitar processamento desnecessário
    const movimentacao = movimentacoes.find(mov => mov.id === movimentacaoId);
    if (movimentacao && movimentacao.conciliado === conciliado) {
      return; // Não faz nada se já está no status correto
    }

    const sucesso = await marcarTransacaoConciliada(movimentacaoId, conciliado);
    if (sucesso) {
      // Atualizar apenas o estado local da movimentação específica
      setMovimentacoes(prev => prev.map(mov => 
        mov.id === movimentacaoId 
          ? { ...mov, conciliado } 
          : mov
      ));

      // Atualizar apenas o saldo da conta atual no estado local
      if (contaAtual && movimentacao) {
        const impactoSaldo = movimentacao.tipo === 'entrada' ? movimentacao.valor : -movimentacao.valor;
        const ajusteSaldo = conciliado ? impactoSaldo : -impactoSaldo;
        
        setContas(prev => prev.map(conta => 
          conta.id === contaSelecionada 
            ? { ...conta, saldo_atual: conta.saldo_atual + ajusteSaldo }
            : conta
        ));
      }

      // Atualizar dashboard local se existir
      if (dashboardBancario) {
        const novoTotal = conciliado 
          ? dashboardBancario.transacoes_nao_conciliadas - 1
          : dashboardBancario.transacoes_nao_conciliadas + 1;
        
        setDashboardBancario(prev => prev ? {
          ...prev,
          transacoes_nao_conciliadas: novoTotal
        } : null);
      }
    }
  };

  const handleExportarExcel = () => {
    if (!contaSelecionada || movimentacoes.length === 0) {
      toast({
        title: "Atenção",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    const contaAtual = contas.find(c => c.id === contaSelecionada);
    if (!contaAtual) return;

    // Calcular totais
    const totalDebitos = movimentacoes
      .filter(mov => mov.tipo === 'saida')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const totalCreditos = movimentacoes
      .filter(mov => mov.tipo === 'entrada')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const totalConciliado = movimentacoes
      .filter(mov => mov.conciliado)
      .reduce((sum, mov) => sum + mov.valor, 0);

    const totalPendente = movimentacoes
      .filter(mov => !mov.conciliado)
      .reduce((sum, mov) => sum + mov.valor, 0);

    const sucesso = exportarConciliacaoBancariaExcel({
      movimentacoes,
      conta: contaAtual,
      periodo: {
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim
      },
      totais: {
        totalDebitos,
        totalCreditos,
        saldo: totalCreditos - totalDebitos,
        totalConciliado,
        totalPendente
      }
    });

    if (sucesso) {
      toast({
        title: "✅ Exportação concluída",
        description: "Relatório de conciliação exportado com sucesso!"
      });
    } else {
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório",
        variant: "destructive"
      });
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    if (!data) return '';
    try {
      return format(parseISO(data + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', data, error);
      return data; // Retorna a data original se houver erro
    }
  };

  // Se estiver no modo Conciliação Rápida
  if (showConciliacaoRapida) {
    return (
      <ConciliacaoRapida
        contas={contas}
        onClose={() => setShowConciliacaoRapida(false)}
        onConcluido={() => {
          setShowConciliacaoRapida(false);
          carregarMovimentacoes();
          carregarDashboard();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Conciliação Bancária</h2>
            <p className="text-muted-foreground">
              Concilie suas movimentações bancárias com o sistema
            </p>
          </div>
        </div>
        <Button onClick={() => setShowConciliacaoRapida(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Conciliação Rápida
        </Button>
      </div>

      {/* Dashboard Cards */}
      {dashboardBancario && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Saldo Total</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatarValor(dashboardBancario.saldo_total)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Não Conciliadas</span>
              </div>
              <p className="text-2xl font-bold text-destructive mt-2">
                {dashboardBancario.transacoes_nao_conciliadas}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Conciliadas</span>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {movimentacoes.filter(mov => mov.conciliado).length}
              </p>
            </CardContent>
          </Card>

          {contaAtual && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Saldo Conta</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {formatarValor(contaAtual.saldo_atual)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros e Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Conta Bancária</Label>
              <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome} - {conta.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              />
            </div>

            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={filtros.conciliado === undefined ? 'todos' : filtros.conciliado.toString()} 
                onValueChange={(value) => setFiltros({ 
                  ...filtros, 
                  conciliado: value === 'todos' ? undefined : value === 'true' 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Conciliados</SelectItem>
                  <SelectItem value="false">Não Conciliados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <Label>Buscar por descrição</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Preview de Saldo */}
      {itensSelecionados.size > 0 && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="font-medium">{itensSelecionados.size} itens selecionados</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Saldo após conciliação: <strong>{formatarValor(saldoPreview)}</strong>
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselecionarTodos}
                  >
                    Desselecionar Todos
                  </Button>
                  <Button
                    size="sm"
                    onClick={conciliarSelecionados}
                    disabled={loading}
                  >
                    Conciliar Selecionados
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles de Seleção e Fechamento */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selecionarTodos}
            disabled={transacoesPendentes.length === 0}
          >
            Selecionar Todas Pendentes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deselecionarTodos}
            disabled={itensSelecionados.size === 0}
          >
            Limpar Seleção
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarExcel}
            disabled={loading || movimentacoes.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Fechamento de Caixa */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dataFechamento}
            onChange={(e) => setDataFechamento(e.target.value)}
            placeholder="Data para fechamento"
            className="w-auto"
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={!dataFechamento || !contaSelecionada}
              >
                <Lock className="h-4 w-4 mr-2" />
                Fechar Caixa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Confirmar Fechamento de Caixa
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Você está prestes a fechar o caixa do dia {formatarData(dataFechamento)} para a conta {contaAtual?.nome}.
                  <br /><br />
                  <strong>Atenção:</strong> Após o fechamento, não será possível conciliar transações desta data sem reabrir o caixa nas configurações.
                  <br /><br />
                  Transações pendentes: {movimentacoes.filter(mov => mov.data_movimentacao === dataFechamento && !mov.conciliado).length}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Input
                  id="observacoes"
                  value={observacoesFechamento}
                  onChange={(e) => setObservacoesFechamento(e.target.value)}
                  placeholder="Observações sobre o fechamento..."
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={fecharCaixa}>
                  Confirmar Fechamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabela de Movimentações com Seleção Múltipla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Extrato Bancário - Conciliação</span>
            {fechamentosCaixa.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {fechamentosCaixa.length} período(s) fechado(s)
              </Badge>
            )}
          </CardTitle>
          {contaAtual && (
            <div className="flex items-center justify-between text-sm">
              <span>Conta: {contaAtual.nome} - {contaAtual.banco}</span>
              <div className="flex items-center gap-4">
                <span>Transações pendentes: {transacoesPendentes.length}</span>
                {itensSelecionados.size > 0 && (
                  <span className="text-primary font-medium">
                    {itensSelecionados.size} selecionados
                  </span>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <div className="grid grid-cols-9 gap-4 p-4 font-medium bg-muted/50 border-b min-w-[1200px]">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={transacoesPendentes.length > 0 && transacoesPendentes.every(mov => itensSelecionados.has(mov.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selecionarTodos();
                    } else {
                      deselecionarTodos();
                    }
                  }}
                />
                <span>Selecionar</span>
              </div>
              <div>Data</div>
              <div>Descrição</div>
              <div>Cliente/Fornecedor</div>
              <div>Categoria</div>
              <div className="text-right">Débito</div>
              <div className="text-right">Crédito</div>
              <div className="text-center">Status</div>
              <div className="text-center">Conciliado</div>
            </div>

            {movimentacoes.map((movimentacao) => {
              const dataFechada = verificarDataFechada(movimentacao.data_movimentacao);
              const isSelected = itensSelecionados.has(movimentacao.id);
              
              return (
                <div 
                  key={movimentacao.id} 
                  className={cn(
                    "grid grid-cols-9 gap-4 p-4 border-b hover:bg-muted/30 min-w-[1200px]",
                    isSelected && "bg-primary/5 border-primary/20",
                    dataFechada && "bg-muted/20"
                  )}
                >
                  <div className="flex items-center">
                    {dataFechada ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelecao(movimentacao.id)}
                        disabled={movimentacao.conciliado}
                      />
                    )}
                  </div>

                  <div className="text-sm flex items-center gap-2">
                    {formatarData(movimentacao.data_movimentacao)}
                    {dataFechada && (
                      <Badge variant="secondary" className="text-xs">
                        Fechado
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">{movimentacao.descricao}</p>
                    {movimentacao.origem_tipo && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {movimentacao.origem_tipo === 'conta_receber' ? 'Recebimento' : 
                         movimentacao.origem_tipo === 'conta_pagar' ? 'Pagamento' : 
                         movimentacao.origem_tipo === 'ajuste_saldo' ? 'Ajuste de Saldo' : 'Manual'}
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    {movimentacao.pessoa_nome ? (
                      <div className="text-sm">
                        <p className="font-medium text-foreground">{movimentacao.pessoa_nome}</p>
                        {movimentacao.pessoa_email && (
                          <p className="text-xs text-muted-foreground truncate" title={movimentacao.pessoa_email}>
                            {movimentacao.pessoa_email}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">-</span>
                    )}
                  </div>
                  
                  <div>
                    {movimentacao.categoria_nome || movimentacao.subcategoria_nome ? (
                      <div className="flex flex-col gap-1">
                        {movimentacao.categoria_nome && (
                          <Badge variant="secondary" className="text-xs w-fit">
                            {movimentacao.categoria_nome}
                          </Badge>
                        )}
                        {movimentacao.subcategoria_nome && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {movimentacao.subcategoria_nome}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">-</span>
                    )}
                  </div>
                  
                  <div className="text-right text-sm">
                    {movimentacao.tipo === 'saida' && (
                      <span className="text-red-600 font-medium">
                        {formatarValor(movimentacao.valor)}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right text-sm">
                    {movimentacao.tipo === 'entrada' && (
                      <span className="text-green-600 font-medium">
                        {formatarValor(movimentacao.valor)}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <Badge variant={movimentacao.conciliado ? 'default' : 'secondary'}>
                      {movimentacao.conciliado ? 'Conciliado' : 'Pendente'}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <Checkbox
                      checked={movimentacao.conciliado}
                      onCheckedChange={(checked) => 
                        handleMarcarConciliado(movimentacao.id, checked as boolean)
                      }
                      disabled={dataFechada}
                    />
                  </div>
                </div>
              );
            })}

            {movimentacoes.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma movimentação encontrada para os filtros selecionados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}