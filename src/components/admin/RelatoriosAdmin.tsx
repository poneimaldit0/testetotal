
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, TrendingUp, Users, FileText, BarChart3, UserCheck, Clock, Filter, Activity, CalendarCheck, ClipboardCheck, UserCog, FileCheck } from 'lucide-react';
import RelatorioHomologacaoFornecedores from './relatorios/RelatorioHomologacaoFornecedores';
import { FornecedorCombobox } from './FornecedorCombobox';
import { RelatorioAcessosUnicos } from './relatorios/RelatorioAcessosUnicos';
import { RelatorioInscricoesFornecedor } from './relatorios/RelatorioInscricoesFornecedor';
import { RelatorioInscricoesHoje } from './relatorios/RelatorioInscricoesHoje';
import { RelatorioStatusOrcamentos } from './relatorios/RelatorioStatusOrcamentos';
import { RelatorioOrcamentosPostados } from './relatorios/RelatorioOrcamentosPostados';
import { RelatorioConversaoOrcamentos } from './relatorios/RelatorioConversaoOrcamentos';
import { RelatorioClientesMes } from './relatorios/RelatorioClientesMes';
import { RelatorioLoginsFornecedor } from './relatorios/RelatorioLoginsFornecedor';
import { RelatorioPerfilOrcamentos } from './relatorios/RelatorioPerfilOrcamentos';
import { RelatorioTicketMedio } from './relatorios/RelatorioTicketMedio';
import RelatorioFornecedores from './relatorios/RelatorioFornecedores';
import { RelatorioFornecedoresAtivos } from './relatorios/RelatorioFornecedoresAtivos';
import RelatorioLTChurn from './relatorios/RelatorioLTChurn';
import { RelatorioFunilVendas } from './relatorios/RelatorioFunilVendas';
import { RelatorioExperienciaFornecedor } from './relatorios/RelatorioExperienciaFornecedor';
import { RelatorioCRMKanban } from './relatorios/RelatorioCRMKanban';
import { RelatorioAvaliacoesLeads } from './relatorios/RelatorioAvaliacoesLeads';
import { RelatorioOrcamentosConcierge } from './relatorios/RelatorioOrcamentosConcierge';
import { useRelatoriosAdmin, Fornecedor, type RelatorioClientesMes as IRelatorioClientesMes } from '@/hooks/useRelatoriosAdmin';
import { format } from 'date-fns';

const RelatoriosAdmin = () => {
  const { buscarFornecedores, buscarClientesMes, loading } = useRelatoriosAdmin();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [dataInicio, setDataInicio] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);
  const [dadosClientes, setDadosClientes] = useState<IRelatorioClientesMes[]>([]);

  const carregarFornecedores = useCallback(async () => {
    try {
      const data = await buscarFornecedores();
      setFornecedores(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  }, [buscarFornecedores]);

  useEffect(() => {
    carregarFornecedores();
  }, [carregarFornecedores]);

  const aplicarFiltros = useCallback(async () => {
    setFiltrosAplicados(true);
    
    try {
      const dados = await buscarClientesMes(dataInicio, dataFim);
      setDadosClientes(dados);
    } catch (error) {
      console.error('Erro ao carregar dados de clientes:', error);
      setDadosClientes([]);
    }
  }, [dataInicio, dataFim, buscarClientesMes]);

  const handleDataInicioChange = useCallback((value: string) => {
    setDataInicio(value);
    setFiltrosAplicados(false);
  }, []);

  const handleDataFimChange = useCallback((value: string) => {
    setDataFim(value);
    setFiltrosAplicados(false);
  }, []);

  const handleFornecedorChange = useCallback((value: string) => {
    setFornecedorSelecionado(value);
    setFiltrosAplicados(false);
  }, []);

  const filtrosComuns = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="space-y-2">
        <Label htmlFor="dataInicio">Data Início</Label>
        <Input
          id="dataInicio"
          type="date"
          value={dataInicio}
          onChange={(e) => handleDataInicioChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dataFim">Data Fim</Label>
        <Input
          id="dataFim"
          type="date"
          value={dataFim}
          onChange={(e) => handleDataFimChange(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <Button onClick={aplicarFiltros} className="w-full">
          <CalendarDays className="h-4 w-4 mr-2" />
          Aplicar Filtros
        </Button>
      </div>
    </div>
  );

  const seletorFornecedor = (
    <div className="mb-4">
      <Label htmlFor="fornecedor">Selecionar Fornecedor</Label>
      <Select value={fornecedorSelecionado} onValueChange={handleFornecedorChange}>
        <SelectTrigger>
          <SelectValue placeholder="Escolha um fornecedor..." />
        </SelectTrigger>
        <SelectContent>
          {fornecedores.map((fornecedor) => (
            <SelectItem key={fornecedor.id} value={fornecedor.id}>
              <div className="flex items-center justify-between w-full">
                <span>{fornecedor.nome} - {fornecedor.empresa}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  fornecedor.status === 'ativo' ? 'bg-green-100 text-green-800' :
                  fornecedor.status === 'inativo' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {fornecedor.status === 'ativo' ? 'Ativo' : 
                   fornecedor.status === 'inativo' ? 'Inativo' : 'Pendente'}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary">Relatórios Administrativos</h2>
          <p className="text-muted-foreground">Análise detalhada de dados e métricas do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="crm-vendas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-primary/10">
          <TabsTrigger value="crm-vendas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Filter className="h-4 w-4 mr-2" />
            CRM & Vendas
          </TabsTrigger>
          <TabsTrigger value="orcamentos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4 mr-2" />
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="fornecedores-categoria" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4 mr-2" />
            Fornecedores
          </TabsTrigger>
          <TabsTrigger value="clientes-categoria" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserCheck className="h-4 w-4 mr-2" />
            Clientes
          </TabsTrigger>
        </TabsList>

        {/* Categoria: CRM & Vendas */}
        <TabsContent value="crm-vendas" className="space-y-4">
          <Tabs defaultValue="crm-kanban" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6 bg-muted">
              <TabsTrigger value="crm-kanban">
                <BarChart3 className="h-4 w-4 mr-2" />
                CRM Kanban
              </TabsTrigger>
              <TabsTrigger value="funil">
                <Filter className="h-4 w-4 mr-2" />
                Funil
              </TabsTrigger>
              <TabsTrigger value="avaliacoes">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Avaliações
              </TabsTrigger>
              <TabsTrigger value="apropriacoes">
                <UserCog className="h-4 w-4 mr-2" />
                Apropriações
              </TabsTrigger>
              <TabsTrigger value="inscricoes-hoje">
                <CalendarCheck className="h-4 w-4 mr-2" />
                Inscr. Hoje
              </TabsTrigger>
              <TabsTrigger value="inscricoes">
                <FileText className="h-4 w-4 mr-2" />
                Inscrições
              </TabsTrigger>
            </TabsList>

            <TabsContent value="crm-kanban">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                    Relatório CRM Kanban
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Análise completa do funil de vendas, forecast, conversão e desempenho do pipeline CRM
                  </p>
                </CardHeader>
                <CardContent>
                  <RelatorioCRMKanban />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="funil">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Filter className="h-5 w-5 mr-2 text-primary" />
                    Funil de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RelatorioFunilVendas
                    dataInicio={dataInicio}
                    dataFim={dataFim}
                    onDataInicioChange={handleDataInicioChange}
                    onDataFimChange={handleDataFimChange}
                    filtrosAplicados={filtrosAplicados}
                    onAplicarFiltros={aplicarFiltros}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="avaliacoes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ClipboardCheck className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Avaliações de Leads
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Análise das avaliações internas de leads realizadas pela equipe
                  </p>
                </CardHeader>
                <CardContent>
                  <RelatorioAvaliacoesLeads />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="apropriacoes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCog className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Apropriações por Concierge
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Análise mensal de orçamentos apropriados para cada concierge
                  </p>
                </CardHeader>
                <CardContent>
                  <RelatorioOrcamentosConcierge />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inscricoes-hoje">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarCheck className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Inscrições de Hoje
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Acompanhe em tempo real as inscrições realizadas pelos fornecedores hoje
                  </p>
                </CardHeader>
                <CardContent>
                  <RelatorioInscricoesHoje />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inscricoes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Inscrições por Fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {seletorFornecedor}
                  {filtrosComuns}
                  {filtrosAplicados && fornecedorSelecionado && dataInicio && dataFim ? (
                    <RelatorioInscricoesFornecedor 
                      fornecedorId={fornecedorSelecionado}
                      fornecedorNome={fornecedores.find(f => f.id === fornecedorSelecionado)?.nome}
                      fornecedorEmpresa={fornecedores.find(f => f.id === fornecedorSelecionado)?.empresa}
                      dataInicio={dataInicio} 
                      dataFim={dataFim} 
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Selecione um fornecedor, defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Categoria: Orçamentos */}
        <TabsContent value="orcamentos" className="space-y-4">
          <Tabs defaultValue="postados" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5 bg-muted">
              <TabsTrigger value="postados">
                <TrendingUp className="h-4 w-4 mr-2" />
                Postados
              </TabsTrigger>
              <TabsTrigger value="conversao">
                <TrendingUp className="h-4 w-4 mr-2" />
                Conversão
              </TabsTrigger>
              <TabsTrigger value="perfil">
                <BarChart3 className="h-4 w-4 mr-2" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="ticket-medio">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ticket Médio
              </TabsTrigger>
              <TabsTrigger value="status">
                <BarChart3 className="h-4 w-4 mr-2" />
                Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="postados">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Orçamentos Postados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filtrosComuns}
                  {filtrosAplicados && dataInicio && dataFim ? (
                    <RelatorioOrcamentosPostados dataInicio={dataInicio} dataFim={dataFim} />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <TrendingUp className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conversao">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Conversão de Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filtrosComuns}
                  {filtrosAplicados && dataInicio && dataFim ? (
                    <RelatorioConversaoOrcamentos dataInicio={dataInicio} dataFim={dataFim} />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <TrendingUp className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="perfil">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Perfil dos Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filtrosComuns}
                  {filtrosAplicados && dataInicio && dataFim ? (
                    <RelatorioPerfilOrcamentos dataInicio={dataInicio} dataFim={dataFim} />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <BarChart3 className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ticket-medio">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Ticket Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filtrosComuns}
                  {filtrosAplicados && dataInicio && dataFim ? (
                    <RelatorioTicketMedio dataInicio={dataInicio} dataFim={dataFim} />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <BarChart3 className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Status dos Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {seletorFornecedor}
                  {filtrosComuns}
                  {filtrosAplicados && fornecedorSelecionado && dataInicio && dataFim ? (
                    <RelatorioStatusOrcamentos 
                      fornecedorId={fornecedorSelecionado} 
                      dataInicio={dataInicio} 
                      dataFim={dataFim} 
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <BarChart3 className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Selecione um fornecedor, defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Categoria: Fornecedores */}
        <TabsContent value="fornecedores-categoria" className="space-y-4">
          <Tabs defaultValue="fornecedores" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6 bg-muted">
              <TabsTrigger value="fornecedores">
                <Users className="h-4 w-4 mr-2" />
                Completo
              </TabsTrigger>
              <TabsTrigger value="ativos">
                <Users className="h-4 w-4 mr-2" />
                Ativos
              </TabsTrigger>
              <TabsTrigger value="experiencia">
                <Activity className="h-4 w-4 mr-2" />
                Experiência
              </TabsTrigger>
              <TabsTrigger value="lt-churn">
                <TrendingUp className="h-4 w-4 mr-2" />
                LT & Churn
              </TabsTrigger>
              <TabsTrigger value="logins">
                <Clock className="h-4 w-4 mr-2" />
                Logins
              </TabsTrigger>
              <TabsTrigger value="homologacao">
                <FileCheck className="h-4 w-4 mr-2" />
                Homologação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fornecedores">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Relatório Completo de Fornecedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RelatorioFornecedores filtrosAplicados={filtrosAplicados} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ativos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Fornecedores Ativos por Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RelatorioFornecedoresAtivos />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experiencia">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Experiência do Fornecedor
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Identifique fornecedores que precisam de ação de CS baseado em inatividade, orçamentos abertos e marcos temporais
                  </p>
                </CardHeader>
                <CardContent>
                  <RelatorioExperienciaFornecedor />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lt-churn">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Lifetime e Churn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RelatorioLTChurn filtrosAplicados={filtrosAplicados} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logins">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Logins dos Fornecedores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Label htmlFor="fornecedor-logins">Selecionar Fornecedor</Label>
                    <FornecedorCombobox
                      fornecedores={fornecedores}
                      value={fornecedorSelecionado}
                      onValueChange={handleFornecedorChange}
                      placeholder="Todos os fornecedores (ou digite para buscar específico)"
                    />
                    {fornecedorSelecionado && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Exibindo dados apenas do fornecedor selecionado
                      </p>
                    )}
                  </div>
                  {filtrosComuns}
                  {filtrosAplicados ? (
                    <RelatorioLoginsFornecedor 
                      fornecedorId={fornecedorSelecionado || undefined}
                      dataInicio={dataInicio}
                      dataFim={dataFim}
                      filtrosAplicados={filtrosAplicados}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Clock className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {fornecedorSelecionado 
                            ? 'Defina as datas e clique em "Aplicar Filtros" para visualizar os logins do fornecedor selecionado'
                            : 'Defina as datas e clique em "Aplicar Filtros" para visualizar os logins de todos os fornecedores'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="homologacao">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileCheck className="h-5 w-5 mr-2 text-primary" />
                    Homologação de Fornecedores
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Consulte os documentos e dados cadastrais dos fornecedores homologados
                  </p>
                </CardHeader>
                <CardContent>
                  <RelatorioHomologacaoFornecedores />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Categoria: Clientes */}
        <TabsContent value="clientes-categoria" className="space-y-4">
          <Tabs defaultValue="clientes" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="clientes">
                <UserCheck className="h-4 w-4 mr-2" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="acessos">
                <Users className="h-4 w-4 mr-2" />
                Acessos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clientes">
              {filtrosComuns}
              <RelatorioClientesMes 
                dados={dadosClientes} 
                filtrosAplicados={filtrosAplicados}
                loading={loading}
                dataInicio={dataInicio}
                dataFim={dataFim}
              />
            </TabsContent>

            <TabsContent value="acessos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Relatório de Acessos Únicos Diários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filtrosComuns}
                  {filtrosAplicados && dataInicio && dataFim ? (
                    <RelatorioAcessosUnicos dataInicio={dataInicio} dataFim={dataFim} />
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Defina as datas e clique em "Aplicar Filtros" para visualizar o relatório
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RelatoriosAdmin;
