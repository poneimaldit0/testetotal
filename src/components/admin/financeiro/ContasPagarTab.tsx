import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, DollarSign, Calendar, Building, Search, Edit, Trash2, Download } from 'lucide-react';
import { exportarContasPagarExcel } from '@/utils/exportacaoContasFinanceiras';
import { CategoriaHierarquica } from './CategoriaHierarquica';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { formatarDataParaExibicao } from '@/utils/dateUtils';
import type { ContaPagar } from '@/types/financeiro';
import { NovaContaPagarModal } from './NovaContaPagarModal';
import { PagarContaModal } from './PagarContaModal';
import { EditarContaPagarModal } from './EditarContaPagarModal';
import { ConfirmDeleteFinanceiroDialog } from './ConfirmDeleteFinanceiroDialog';
import { FiltrosFinanceiro } from './FiltrosFinanceiro';

interface ContasPagarTabProps {
  onUpdate: () => void;
}

export const ContasPagarTab = ({ onUpdate }: ContasPagarTabProps) => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [contasFiltradas, setContasFiltradas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaConta, setModalNovaConta] = useState(false);
  const [modalPagar, setModalPagar] = useState<ContaPagar | null>(null);
  const [modalEditar, setModalEditar] = useState<ContaPagar | null>(null);
  const [modalExcluir, setModalExcluir] = useState<boolean>(false);
  const [contaParaExcluir, setContaParaExcluir] = useState<ContaPagar | null>(null);
  const [filtros, setFiltros] = useState<any>({});
  const [ordenacao, setOrdenacao] = useState<'vencimento' | 'valor' | 'fornecedor'>('vencimento');
  const [busca, setBusca] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const { buscarContasPagar, buscarContasPagarComFiltros, excluirContaPagar, loading: financeiroLoading } = useFinanceiro();

  useEffect(() => {
    carregarContas();
  }, []);

  const carregarContas = async (filtrosParam?: any) => {
    setLoading(true);
    const data = filtrosParam ? 
      await buscarContasPagarComFiltros(filtrosParam) : 
      await buscarContasPagar();
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
    
    const sucesso = await excluirContaPagar(contaIds);
    if (sucesso) {
      setModalExcluir(false);
      setContaParaExcluir(null);
      handleUpdate();
    }
  };

  const abrirModalExcluir = (conta: ContaPagar) => {
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
      case 'pago':
        return <Badge variant="default" className="bg-green-100 text-green-800">Pago</Badge>;
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'cancelado':
        return <Badge variant="outline">Cancelado</Badge>;
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
        conta.fornecedor_nome.toLowerCase().includes(busca.toLowerCase()) ||
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
        case 'fornecedor':
          return a.fornecedor_nome.localeCompare(b.fornecedor_nome);
        default:
          return 0;
      }
    });

    return resultado;
  }, [contasFiltradas, busca, ordenacao]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="text-muted-foreground">Carregando contas a pagar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contas a Pagar ({contasProcessadas.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <Search className="w-4 h-4 mr-2" />
            {mostrarFiltros ? 'Ocultar Filtros' : 'Filtros'}
          </Button>
          <Button variant="outline" onClick={() => exportarContasPagarExcel(contasProcessadas)}>
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
            tipo="pagar"
          />
        </div>
      )}

      {/* Busca rápida e ordenação */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Busca rápida por fornecedor ou descrição..."
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
            <SelectItem value="fornecedor">Ordenar por Fornecedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {contasProcessadas.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhuma conta a pagar encontrada</p>
            </CardContent>
          </Card>
        ) : (
          contasProcessadas.map((conta) => (
            <Card key={conta.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Header com título e status */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{conta.descricao}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Building className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{conta.fornecedor_nome}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {getStatusBadge(conta.status, conta.data_vencimento)}
                  </div>
                </div>

                {/* Categoria Hierárquica */}
                {(conta.categoria || conta.subcategoria) && (
                  <div className="mb-3">
                    <CategoriaHierarquica 
                      categoria={conta.categoria?.nome}
                      subcategoria={conta.subcategoria?.nome}
                      variant="compact"
                    />
                  </div>
                )}

                {/* Grid de valores compacto */}
                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-1">Original</p>
                    <p className="font-semibold">{formatCurrency(conta.valor_original)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground mb-1">Pago</p>
                    <p className="font-semibold text-green-600">{formatCurrency(conta.valor_pago)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground mb-1">Pendente</p>
                    <p className="font-semibold text-destructive">
                      {formatCurrency(conta.valor_original - conta.valor_pago)}
                    </p>
                  </div>
                </div>

                {/* Footer com data e ações */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(conta.data_vencimento)}</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setModalEditar(conta)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    
                    {(conta.status === 'pendente' || conta.status === 'cancelado') && conta.valor_pago === 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => abrirModalExcluir(conta)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                    
                    {conta.status === 'pendente' && conta.valor_pago < conta.valor_original && (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setModalPagar(conta)}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NovaContaPagarModal
        open={modalNovaConta}
        onOpenChange={setModalNovaConta}
        onSuccess={handleUpdate}
      />

      {modalPagar && (
        <PagarContaModal
          conta={modalPagar}
          open={!!modalPagar}
          onOpenChange={() => setModalPagar(null)}
          onSuccess={handleUpdate}
        />
      )}

      {modalEditar && (
        <EditarContaPagarModal
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
    </div>
  );
};