import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Calendar, User, Filter, X, Building2 } from 'lucide-react';
import { useRelatorioCRM } from '@/hooks/useRelatorioCRM';
import { useFiltrosRelatorioCRM } from '@/hooks/useFiltrosRelatorioCRM';
import { useGestoresConta } from '@/hooks/useGestoresConta';
import { useRelatoriosAdmin } from '@/hooks/useRelatoriosAdmin';
import { MetricasCRMCards } from './crm/MetricasCRMCards';
import { FunilCRMChart } from './crm/FunilCRMChart';
import { FunilAcumuladoCRMChart } from './crm/FunilAcumuladoCRMChart';
import { ForecastCard } from './crm/ForecastCard';
import { FornecedorCombobox } from '@/components/admin/FornecedorCombobox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const RelatorioCRMKanban = () => {
  const { carregando, buscarFunilCRM, buscarFunilAcumulado, buscarForecast, buscarMetricasCRM } = useRelatorioCRM();
  const { filtros, atualizarFiltro, limparFiltros, obterDataInicio, obterDataFim } = useFiltrosRelatorioCRM();
  const { data: gestores = [], isLoading: carregandoGestores } = useGestoresConta();
  const { buscarFornecedores } = useRelatoriosAdmin();
  
  const [metricas, setMetricas] = useState<any>(null);
  const [dadosFunil, setDadosFunil] = useState<any[]>([]);
  const [dadosFunilAcumulado, setDadosFunilAcumulado] = useState<any[]>([]);
  const [dadosForecast, setDadosForecast] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  const carregarDados = async () => {
    const inicio = obterDataInicio();
    const fim = obterDataFim();
    const gestorId = filtros.gestorId;
    const fornecedorId = filtros.fornecedorId;

    const [metricasData, funilData, funilAcumuladoData, forecastData] = await Promise.all([
      buscarMetricasCRM(inicio, fim, gestorId, fornecedorId),
      buscarFunilCRM(inicio, fim, gestorId, fornecedorId),
      buscarFunilAcumulado(inicio, fim, gestorId, fornecedorId),
      buscarForecast(filtros.mes, filtros.ano, gestorId),
    ]);

    setMetricas(metricasData);
    setDadosFunil(funilData);
    setDadosFunilAcumulado(funilAcumuladoData);
    setDadosForecast(forecastData);
  };

  useEffect(() => {
    carregarDados();
    
    const carregarFornecedores = async () => {
      const lista = await buscarFornecedores();
      setFornecedores(lista);
    };
    carregarFornecedores();
  }, []);

  const handleAplicarFiltros = () => {
    carregarDados();
  };

  const handleLimparFiltros = () => {
    limparFiltros();
    setTimeout(() => carregarDados(), 100);
  };

  const obterNomeGestor = (gestorId?: string) => {
    if (!gestorId) return null;
    const gestor = gestores.find(g => g.id === gestorId);
    return gestor?.nome;
  };

  const obterNomeFornecedor = (fornecedorId?: string) => {
    if (!fornecedorId) return null;
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor ? `${fornecedor.nome} (${fornecedor.empresa})` : null;
  };

  const calcularTotalOrcamentos = () => {
    return dadosFunil.reduce((acc, item) => acc + Number(item.quantidade || 0), 0);
  };

  const filtrosAtivos = [
    filtros.dataInicio && { tipo: 'Data Início', valor: new Date(filtros.dataInicio).toLocaleDateString('pt-BR') },
    filtros.dataFim && { tipo: 'Data Fim', valor: new Date(filtros.dataFim).toLocaleDateString('pt-BR') },
    filtros.gestorId && { tipo: 'Gestor', valor: obterNomeGestor(filtros.gestorId) },
    filtros.fornecedorId && { tipo: 'Fornecedor', valor: obterNomeFornecedor(filtros.fornecedorId) },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Indicadores de Filtros Ativos */}
      {filtrosAtivos.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Filtros ativos:</span>
                {filtrosAtivos.map((filtro: any, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {filtro.tipo}: {filtro.valor}
                  </Badge>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparFiltros}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar todos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contador de Registros */}
      {metricas && (
        <Card className="border-muted">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  Exibindo <strong className="text-foreground">{calcularTotalOrcamentos()}</strong> orçamentos no funil
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  <strong className="text-green-600">{metricas.total_ganhos ?? 0}</strong> ganhos
                </span>
                <span>•</span>
                <span>
                  <strong className="text-red-600">{metricas.total_perdas ?? 0}</strong> perdidos
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Início
                </Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => atualizarFiltro('dataInicio', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Fim
                </Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => atualizarFiltro('dataFim', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gestor" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Gestor de Conta
                </Label>
                <Select
                  value={filtros.gestorId || "todos"}
                  onValueChange={(value) => 
                    atualizarFiltro('gestorId', value === "todos" ? undefined : value)
                  }
                  disabled={carregandoGestores}
                >
                  <SelectTrigger id="gestor">
                    <SelectValue placeholder="Todos os gestores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os gestores</SelectItem>
                    {gestores.map((gestor) => (
                      <SelectItem key={gestor.id} value={gestor.id}>
                        {gestor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fornecedor" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Fornecedor Inscrito
                </Label>
                <FornecedorCombobox
                  fornecedores={fornecedores}
                  value={filtros.fornecedorId || ""}
                  onValueChange={(value) => 
                    atualizarFiltro('fornecedorId', value || undefined)
                  }
                  placeholder="Todos os fornecedores"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAplicarFiltros} disabled={carregando}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLimparFiltros}
                disabled={carregando}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <MetricasCRMCards metricas={metricas} carregando={carregando} />

      {/* Abas de Funil: Atual vs Acumulado */}
      <Tabs defaultValue="atual" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="atual">
            Funil Atual
          </TabsTrigger>
          <TabsTrigger value="acumulado" title="Mostra leads que entraram no CRM durante o período filtrado">
            Funil Acumulado (por entrada)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="atual" className="mt-6">
          <FunilCRMChart dados={dadosFunil} carregando={carregando} />
        </TabsContent>
        
        <TabsContent value="acumulado" className="mt-6">
          <FunilAcumuladoCRMChart dados={dadosFunilAcumulado} carregando={carregando} />
        </TabsContent>
      </Tabs>

      {/* Forecast */}
      <ForecastCard dados={dadosForecast} carregando={carregando} />

      {/* Informações Adicionais */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-semibold">📊 Sobre este Relatório</h4>
            <p className="text-sm text-muted-foreground">
              Este relatório apresenta a <strong>Fase 1</strong> da análise do CRM Kanban, incluindo:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li><strong>Visão Geral:</strong> Métricas principais do pipeline ativo</li>
              <li><strong>Funil de Conversão:</strong> Distribuição e taxa de conversão entre etapas</li>
              <li><strong>Análise de Ticket Médio:</strong> Valor médio por etapa do funil</li>
              <li><strong>Forecast Básico:</strong> Previsão de receita com probabilidades ponderadas</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              💡 <strong>Próximas fases incluirão:</strong> Análise de tempo por etapa, performance por gestor, 
              motivos de perda, alertas automáticos e drill-down interativo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
