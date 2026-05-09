import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Search, Filter } from 'lucide-react';
import { useRelatorioConsolidado } from '@/hooks/useRelatorioConsolidado';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const RelatorioConsolidado = () => {
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    incluirPagas: true,
    incluirRecebidas: true,
    incluirPendentes: true,
    busca: ''
  });
  
  const { relatorio, loading, buscarRelatorio, exportarExcel } = useRelatorioConsolidado();

  const handleFiltroChange = (campo: string, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const aplicarFiltros = () => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      return;
    }

    const statusSelecionados: string[] = [];
    if (filtros.incluirPagas) statusSelecionados.push('pago');
    if (filtros.incluirRecebidas) statusSelecionados.push('recebido');
    if (filtros.incluirPendentes) statusSelecionados.push('pendente');

    buscarRelatorio(
      filtros.dataInicio,
      filtros.dataFim,
      statusSelecionados,
      filtros.busca
    );
  };

  const handleExportar = async () => {
    if (!relatorio) return;
    await exportarExcel(relatorio, filtros);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', dateString, error);
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      'pendente': 'secondary',
      'pago': 'default',
      'recebido': 'default',
      'cancelado': 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    return (
      <Badge variant={tipo === 'entrada' ? 'default' : 'secondary'} className={
        tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }>
        {tipo === 'entrada' ? 'Entrada' : 'Saída'}
      </Badge>
    );
  };

  const movimentacoesFiltradas = relatorio?.movimentacoes.filter(mov => {
    if (!filtros.busca) return true;
    const busca = filtros.busca.toLowerCase();
    return (
      mov.descricao.toLowerCase().includes(busca) ||
      mov.cliente_fornecedor.toLowerCase().includes(busca) ||
      mov.categoria.toLowerCase().includes(busca)
    );
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Relatório Consolidado</h3>
        {relatorio && (
          <Button onClick={handleExportar} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filtros.dataFim}
                onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Label>Status a incluir:</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluirPendentes"
                checked={filtros.incluirPendentes}
                onCheckedChange={(checked) => handleFiltroChange('incluirPendentes', checked)}
              />
              <Label htmlFor="incluirPendentes">Pendentes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluirPagas"
                checked={filtros.incluirPagas}
                onCheckedChange={(checked) => handleFiltroChange('incluirPagas', checked)}
              />
              <Label htmlFor="incluirPagas">Pagas</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluirRecebidas"
                checked={filtros.incluirRecebidas}
                onCheckedChange={(checked) => handleFiltroChange('incluirRecebidas', checked)}
              />
              <Label htmlFor="incluirRecebidas">Recebidas</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="busca">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="busca"
                placeholder="Buscar por descrição, cliente/fornecedor, categoria..."
                value={filtros.busca}
                onChange={(e) => handleFiltroChange('busca', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={aplicarFiltros} disabled={loading || !filtros.dataInicio || !filtros.dataFim}>
            {loading ? 'Carregando...' : 'Aplicar Filtros'}
          </Button>
        </CardContent>
      </Card>

      {/* Resumo */}
      {relatorio && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Total Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(relatorio.totais.total_entradas)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Total Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(relatorio.totais.total_saidas)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${relatorio.totais.saldo_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(relatorio.totais.saldo_liquido)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Movimentações */}
      {relatorio && (
        <Card>
          <CardHeader>
            <CardTitle>
              Movimentações ({movimentacoesFiltradas.length} registros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cliente/Fornecedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor Original</TableHead>
                    <TableHead>Valor Efetivo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoesFiltradas.map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>{formatDate(mov.data_vencimento)}</TableCell>
                      <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                      <TableCell className="max-w-xs truncate">{mov.descricao}</TableCell>
                      <TableCell>{mov.cliente_fornecedor}</TableCell>
                      <TableCell>{mov.categoria}</TableCell>
                      <TableCell>{formatCurrency(mov.valor_original)}</TableCell>
                      <TableCell>
                        {formatCurrency(
                          mov.tipo === 'entrada' 
                            ? (mov.valor_recebido > 0 ? mov.valor_recebido : mov.valor_original)
                            : (mov.valor_pago > 0 ? mov.valor_pago : mov.valor_original)
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(mov.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!relatorio && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Selecione um período e clique em "Aplicar Filtros" para visualizar o relatório.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};