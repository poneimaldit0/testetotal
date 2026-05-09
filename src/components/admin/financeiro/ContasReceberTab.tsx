import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, DollarSign, Calendar, User, Search, ArrowUpDown, Edit, Trash2, Download } from 'lucide-react';
import { exportarContasReceberExcel } from '@/utils/exportacaoContasFinanceiras';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { formatarDataParaExibicao } from '@/utils/dateUtils';
import type { ContaReceber } from '@/types/financeiro';
import { NovaContaReceberModal } from './NovaContaReceberModal';
import { ReceberContaModal } from './ReceberContaModal';
import { EditarContaReceberModal } from './EditarContaReceberModal';
import { ConfirmDeleteFinanceiroDialog } from './ConfirmDeleteFinanceiroDialog';
import { MarcarPerdaModal } from './MarcarPerdaModal';
import { FiltrosFinanceiro } from './FiltrosFinanceiro';

interface ContasReceberTabProps {
  onUpdate: () => void;
}

export const ContasReceberTab = ({ onUpdate }: ContasReceberTabProps) => {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [contasFiltradas, setContasFiltradas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaConta, setModalNovaConta] = useState(false);
  const [modalReceber, setModalReceber] = useState<ContaReceber | null>(null);
  const [modalEditar, setModalEditar] = useState<ContaReceber | null>(null);
  const [modalExcluir, setModalExcluir] = useState<boolean>(false);
  const [contaParaExcluir, setContaParaExcluir] = useState<ContaReceber | null>(null);
  const [filtros, setFiltros] = useState<any>({});
  const [ordenacao, setOrdenacao] = useState<'vencimento' | 'valor' | 'cliente'>('vencimento');
  const [busca, setBusca] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const { buscarContasReceber, buscarContasReceberComFiltros, excluirContaReceber, buscarMotivosPerda, marcarComoPerda, loading: financeiroLoading } = useFinanceiro();
  const [motivosPerda, setMotivosPerda] = useState<any[]>([]);
  const [modalPerda, setModalPerda] = useState<ContaReceber | null>(null);

  useEffect(() => {
    carregarContas();
    carregarMotivosPerda();
  }, []);

  const carregarMotivosPerda = async () => {
    try {
      const motivos = await buscarMotivosPerda();
      setMotivosPerda(motivos);
    } catch (error) {
      console.error('Erro ao carregar motivos de perda:', error);
    }
  };

  const handleMarcarPerda = async (motivoId: string, justificativa?: string) => {
    if (!modalPerda) return;
    try {
      await marcarComoPerda(modalPerda.id, motivoId, justificativa);
      setModalPerda(null);
      handleUpdate();
    } catch (error) {
      console.error('Erro ao marcar como perda:', error);
    }
  };

  const carregarContas = async (filtrosParam?: any) => {
    setLoading(true);
    const data = filtrosParam ? 
      await buscarContasReceberComFiltros(filtrosParam) : 
      await buscarContasReceber();
    setContas(data);
    setContasFiltradas(data);
    setLoading(false);
  };

  const handleFiltrar = (novosFiltros: any) => {
    setFiltros(novosFiltros);
    carregarContas(novosFiltros);
  };

  const handleLimparFiltros = () => {
    setFiltros({});
    setBusca('');
    carregarContas();
  };

  const handleUpdate = () => {
    carregarContas(filtros);
    onUpdate(); // Apenas dispara sync global, não recarrega dashboard completo
  };

  const handleExcluir = async (contaIds: string[]) => {
    if (contaIds.length === 0) return;
    
    const sucesso = await excluirContaReceber(contaIds);
    if (sucesso) {
      setModalExcluir(false);
      setContaParaExcluir(null);
      handleUpdate();
    }
  };

  const abrirModalExcluir = (conta: ContaReceber) => {
    setContaParaExcluir(conta);
    setModalExcluir(true);
  };

  const fecharModalExcluir = () => {
    setModalExcluir(false);
    setContaParaExcluir(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return formatarDataParaExibicao(dateString);
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    const vencida = status === 'pendente' && dataVencimento < hoje;
    
    if (vencida) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    
    switch (status) {
      case 'recebido':
        return <Badge variant="default" className="bg-green-100 text-green-800">Recebido</Badge>;
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'cancelado':
        return <Badge variant="outline">Cancelado</Badge>;
      case 'perda':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Perda</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filtrar e ordenar contas
  const contasProcessadas = useMemo(() => {
    let resultado = [...contasFiltradas];

    // Aplicar busca local
    if (busca) {
      resultado = resultado.filter(conta => 
        conta.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        conta.descricao.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Aplicar ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case 'vencimento':
          return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
        case 'valor':
          return b.valor_original - a.valor_original;
        case 'cliente':
          return a.cliente_nome.localeCompare(b.cliente_nome);
        default:
          return 0;
      }
    });

    return resultado;
  }, [contasFiltradas, busca, ordenacao]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="text-muted-foreground">Carregando contas a receber...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contas a Receber ({contasProcessadas.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <Search className="w-4 h-4 mr-2" />
            {mostrarFiltros ? 'Ocultar Filtros' : 'Filtros'}
          </Button>
          <Button variant="outline" onClick={() => exportarContasReceberExcel(contasProcessadas)}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={() => setModalNovaConta(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <FiltrosFinanceiro
            onFiltrar={handleFiltrar}
            onLimpar={handleLimparFiltros}
            tipo="receber"
          />
        </div>
      )}

      {/* Busca rápida e ordenação */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Busca rápida por cliente ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={ordenacao} onValueChange={(value: any) => setOrdenacao(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vencimento">Ordenar por Vencimento</SelectItem>
            <SelectItem value="valor">Ordenar por Valor</SelectItem>
            <SelectItem value="cliente">Ordenar por Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {contasProcessadas.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhuma conta a receber encontrada</p>
            </CardContent>
          </Card>
        ) : (
          contasProcessadas.map((conta) => (
            <Card key={conta.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{conta.descricao}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <User className="w-4 h-4" />
                      {conta.cliente_nome}
                    </div>
                  </div>
                  {getStatusBadge(conta.status, conta.data_vencimento)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor Original</p>
                    <p className="font-medium">{formatCurrency(conta.valor_original)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Recebido</p>
                    <p className="font-medium text-green-600">{formatCurrency(conta.valor_recebido)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Pendente</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(conta.valor_original - conta.valor_recebido)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vencimento</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <p className="font-medium">{formatDate(conta.data_vencimento)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Categoria</p>
                    <p className="font-medium">{conta.categoria?.nome || 'Sem categoria'}</p>
                    {conta.subcategoria && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Subcategoria: {conta.subcategoria.nome}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModalEditar(conta)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  {(conta.status === 'pendente' || conta.status === 'cancelado') && conta.valor_recebido === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => abrirModalExcluir(conta)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                  {conta.status === 'pendente' && conta.valor_recebido < conta.valor_original && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setModalReceber(conta)}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Registrar Recebimento
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setModalPerda(conta)}
                      >
                        Marcar como Perda
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NovaContaReceberModal
        open={modalNovaConta}
        onOpenChange={setModalNovaConta}
        onSuccess={handleUpdate}
      />

      {modalReceber && (
        <ReceberContaModal
          conta={modalReceber}
          open={!!modalReceber}
          onOpenChange={() => setModalReceber(null)}
          onSuccess={handleUpdate}
        />
      )}

      {modalEditar && (
        <EditarContaReceberModal
          conta={modalEditar}
          open={!!modalEditar}
          onOpenChange={() => setModalEditar(null)}
          onSuccess={handleUpdate}
        />
      )}

      <ConfirmDeleteFinanceiroDialog
        isOpen={modalExcluir}
        onClose={fecharModalExcluir}
        onConfirm={handleExcluir}
        conta={contaParaExcluir}
        isLoading={financeiroLoading}
      />

      {modalPerda && (
        <MarcarPerdaModal
          conta={modalPerda}
          isOpen={!!modalPerda}
          onClose={() => setModalPerda(null)}
          onConfirm={handleMarcarPerda}
          motivosPerda={motivosPerda}
        />
      )}
    </div>
  );
};