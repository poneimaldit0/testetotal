import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, FileText, Users, Download, TrendingUp } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useRelatoriosAdmin } from '@/hooks/useRelatoriosAdmin';
import { useFornecedorSearch } from '@/hooks/useFornecedorSearch';
import { InscricaoHojeResumo, OrcamentoInscritoHoje } from '@/types/relatorios';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

type ModoVisualizacao = 'geral' | 'fornecedor';

export const RelatorioInscricoesHoje = () => {
  const { buscarInscricoesHoje, buscarHistoricoInscricoesFornecedor, loading } = useRelatoriosAdmin();
  const [modo, setModo] = useState<ModoVisualizacao>('geral');
  const [dados, setDados] = useState<InscricaoHojeResumo[]>([]);
  const [historicoFornecedor, setHistoricoFornecedor] = useState<any[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<InscricaoHojeResumo | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [dataInicio, setDataInicio] = useState<Date>(subDays(new Date(), 7));
  const [dataFim, setDataFim] = useState<Date>(new Date());
  const [fornecedorHistorico, setFornecedorHistorico] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const { fornecedores, isLoading: loadingFornecedores } = useFornecedorSearch(searchTerm);

  useEffect(() => {
    if (modo === 'geral') {
      carregarDados();
    }
  }, [dataSelecionada, modo]);

  useEffect(() => {
    if (modo === 'fornecedor' && fornecedorHistorico) {
      carregarHistoricoFornecedor();
    }
  }, [dataInicio, dataFim, fornecedorHistorico, modo]);

  const carregarDados = async () => {
    try {
      const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd');
      const resultado = await buscarInscricoesHoje(dataFormatada);
      setDados(resultado);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    }
  };

  const carregarHistoricoFornecedor = async () => {
    if (!fornecedorHistorico) return;
    
    const inicio = format(dataInicio, 'yyyy-MM-dd');
    const fim = format(dataFim, 'yyyy-MM-dd');
    const resultado = await buscarHistoricoInscricoesFornecedor(
      fornecedorHistorico.fornecedor_id,
      inicio,
      fim
    );
    setHistoricoFornecedor(resultado);
  };

  const abrirDetalhes = (fornecedor: InscricaoHojeResumo) => {
    setFornecedorSelecionado(fornecedor);
    setModalAberto(true);
  };

  const abrirDetalhesDia = (dia: any) => {
    if (dia.total_inscricoes === 0) return;
    setFornecedorSelecionado({
      fornecedor_id: fornecedorHistorico.fornecedor_id,
      fornecedor_nome: fornecedorHistorico.nome,
      empresa: fornecedorHistorico.empresa,
      total_inscricoes: dia.total_inscricoes,
      orcamentos: dia.orcamentos
    });
    setModalAberto(true);
  };

  const exportarParaExcel = () => {
    if (modo === 'geral') {
      const dadosExportacao = dados.flatMap(fornecedor => 
        fornecedor.orcamentos.map(orc => ({
          'Fornecedor': fornecedor.fornecedor_nome,
          'Empresa': fornecedor.empresa,
          'Código Orçamento': orc.codigo_orcamento,
          'Local': orc.local,
          'Necessidade': orc.necessidade.substring(0, 100),
          'Data Inscrição': format(new Date(orc.data_candidatura), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Status': orc.status || 'N/A'
        }))
      );

      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inscrições');
      
      const dataArquivo = format(dataSelecionada, 'yyyy-MM-dd');
      XLSX.writeFile(wb, `inscricoes_${dataArquivo}.xlsx`);
      toast.success('Relatório exportado com sucesso!');
    } else {
      const dadosExportacao = historicoFornecedor.flatMap(dia =>
        dia.orcamentos.map((orc: any) => ({
          'Data': format(new Date(dia.data), 'dd/MM/yyyy', { locale: ptBR }),
          'Fornecedor': fornecedorHistorico?.nome || '',
          'Empresa': fornecedorHistorico?.empresa || '',
          'Código Orçamento': orc.codigo_orcamento,
          'Local': orc.local,
          'Necessidade': orc.necessidade.substring(0, 100),
          'Hora': format(new Date(orc.data_candidatura), 'HH:mm', { locale: ptBR })
        }))
      );

      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
      
      const inicioFormatado = format(dataInicio, 'yyyy-MM-dd');
      const fimFormatado = format(dataFim, 'yyyy-MM-dd');
      XLSX.writeFile(wb, `historico_${fornecedorHistorico?.nome || 'fornecedor'}_${inicioFormatado}_${fimFormatado}.xlsx`);
      toast.success('Histórico exportado com sucesso!');
    }
  };

  const totalFornecedores = dados.length;
  const totalInscricoes = dados.reduce((sum, f) => sum + f.total_inscricoes, 0);
  const dataFormatada = format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR });
  const isHoje = format(dataSelecionada, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isOntem = format(dataSelecionada, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Estatísticas do histórico
  const totalInscricoesHistorico = historicoFornecedor.reduce((acc, dia) => acc + dia.total_inscricoes, 0);
  const diasComAtividade = historicoFornecedor.filter(dia => dia.total_inscricoes > 0).length;
  const totalDias = historicoFornecedor.length;
  const mediaPorDia = totalDias > 0 ? (totalInscricoesHistorico / totalDias).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Inscrições por Data
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize as inscrições de fornecedores por data ou histórico de um fornecedor específico
            </p>
          </div>
          <Button 
            onClick={exportarParaExcel} 
            variant="outline" 
            size="sm" 
            disabled={(modo === 'geral' && dados.length === 0) || (modo === 'fornecedor' && !fornecedorHistorico)}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Toggle de Modo e Filtros */}
        <Card>
          <CardContent className="pt-6">
            {/* Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={modo === 'geral' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModo('geral')}
              >
                Visão Geral
              </Button>
              <Button
                variant={modo === 'fornecedor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModo('fornecedor')}
              >
                Por Fornecedor
              </Button>
            </div>

            {/* Filtros - Visão Geral */}
            {modo === 'geral' && (
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant={isHoje ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDataSelecionada(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant={isOntem ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDataSelecionada(subDays(new Date(), 1))}
                >
                  Ontem
                </Button>

                <div className="flex-1" />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {dataFormatada}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={dataSelecionada}
                      onSelect={(date) => date && setDataSelecionada(date)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Filtros - Por Fornecedor */}
            {modo === 'fornecedor' && (
              <div className="space-y-4">
                {/* Seletor de Fornecedor */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Fornecedor:</label>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {fornecedorHistorico ? `${fornecedorHistorico.nome} - ${fornecedorHistorico.empresa}` : 'Selecione um fornecedor...'}
                        <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[500px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar fornecedor..." 
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {loadingFornecedores ? 'Buscando...' : 'Nenhum fornecedor encontrado.'}
                          </CommandEmpty>
                          <CommandGroup>
                            {fornecedores.map((fornecedor) => (
                              <CommandItem
                                key={fornecedor.fornecedor_id}
                                value={fornecedor.nome}
                                onSelect={() => {
                                  setFornecedorHistorico(fornecedor);
                                  setComboboxOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{fornecedor.nome}</span>
                                  <span className="text-sm text-muted-foreground">{fornecedor.empresa}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Filtros de Período */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Período:</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(dataInicio, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataInicio}
                          onSelect={(date) => date && setDataInicio(date)}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>

                    <span className="text-sm text-muted-foreground">até</span>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {format(dataFim, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataFim}
                          onSelect={(date) => date && setDataFim(date)}
                          disabled={(date) => date > new Date() || date < dataInicio}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>

                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setDataInicio(subDays(new Date(), 7));
                          setDataFim(new Date());
                        }}
                      >
                        7d
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setDataInicio(subDays(new Date(), 14));
                          setDataFim(new Date());
                        }}
                      >
                        14d
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setDataInicio(subDays(new Date(), 30));
                          setDataFim(new Date());
                        }}
                      >
                        30d
                      </Button>
                    </div>
                  </div>

                  {fornecedorHistorico && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Exibindo: {fornecedorHistorico.nome} - {format(dataInicio, 'dd/MM/yyyy')} até {format(dataFim, 'dd/MM/yyyy')} ({totalDias} {totalDias === 1 ? 'dia' : 'dias'})
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cards de resumo */}
      {modo === 'geral' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Fornecedores Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalFornecedores}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Fornecedores que se inscreveram em {dataFormatada}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Total de Inscrições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalInscricoes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Inscrições totais em {dataFormatada}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : fornecedorHistorico && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Total de Inscrições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalInscricoesHistorico}</div>
              <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Média por Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{mediaPorDia}</div>
              <p className="text-xs text-muted-foreground mt-1">inscrições/dia</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Dias com Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{diasComAtividade}</div>
              <p className="text-xs text-muted-foreground mt-1">de {totalDias} {totalDias === 1 ? 'dia' : 'dias'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela principal */}
      <Card>
        <CardHeader>
          <CardTitle>
            {modo === 'geral' ? 'Inscrições por Fornecedor' : 'Histórico de Inscrições por Dia'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dados...
            </div>
          ) : modo === 'geral' ? (
            dados.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Nenhuma inscrição foi realizada em {dataFormatada}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-center">Inscrições</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((fornecedor) => (
                    <TableRow key={fornecedor.fornecedor_id}>
                      <TableCell className="font-medium">
                        {fornecedor.fornecedor_nome}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fornecedor.empresa}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => abrirDetalhes(fornecedor)}
                        >
                          {fornecedor.total_inscricoes}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : !fornecedorHistorico ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Selecione um fornecedor para ver o histórico de inscrições
              </p>
            </div>
          ) : historicoFornecedor.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Nenhuma inscrição encontrada neste período
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-center">Inscrições</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicoFornecedor.map((dia) => (
                  <TableRow key={dia.data} className={dia.total_inscricoes === 0 ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      {format(new Date(dia.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-center">
                      {dia.total_inscricoes > 0 ? (
                        <Badge 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => abrirDetalhesDia(dia)}
                        >
                          {dia.total_inscricoes}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalhes das Inscrições - {fornecedorSelecionado?.fornecedor_nome}
            </DialogTitle>
          </DialogHeader>
          
          {fornecedorSelecionado && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{fornecedorSelecionado.empresa}</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {fornecedorSelecionado.total_inscricoes} {fornecedorSelecionado.total_inscricoes === 1 ? 'inscrição' : 'inscrições'}
                </Badge>
              </div>

              <div className="space-y-4">
                {fornecedorSelecionado.orcamentos.map((orc, idx) => (
                  <Card key={orc.orcamento_id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-primary">
                              {idx + 1}. Código: {orc.codigo_orcamento}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Local: {orc.local || 'Não informado'}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {format(new Date(orc.data_candidatura), 'HH:mm', { locale: ptBR })}
                          </Badge>
                        </div>
                        <div className="pt-2">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Necessidade:</span>
                          </p>
                          <p className="text-sm mt-1">
                            {orc.necessidade || 'Não especificada'}
                          </p>
                        </div>
                        {orc.status && (
                          <div className="pt-2">
                            <Badge variant="secondary" className="text-xs">
                              Status: {orc.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};