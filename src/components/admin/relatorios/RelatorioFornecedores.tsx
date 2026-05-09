import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRelatoriosAdmin, type RelatorioFornecedorCompleto, type FiltrosFornecedores } from "@/hooks/useRelatoriosAdmin";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Search, Filter, Users, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

interface RelatorioFornecedoresProps {
  filtrosAplicados: boolean;
}

const RelatorioFornecedores: React.FC<RelatorioFornecedoresProps> = ({ filtrosAplicados }) => {
  const { loading, buscarRelatorioFornecedores } = useRelatoriosAdmin();
  
  const [fornecedores, setFornecedores] = useState<RelatorioFornecedorCompleto[]>([]);
  const [buscaTexto, setBuscaTexto] = useState('');
  const [statusSelecionado, setStatusSelecionado] = useState<string>('todos');
  const [vencimentoProximo, setVencimentoProximo] = useState<string>('todos');
  const [dadosCarregados, setDadosCarregados] = useState(false);
  
  const aplicarFiltros = async () => {
    const filtrosCompletos: FiltrosFornecedores = {
      busca_texto: buscaTexto || undefined,
      status_filtro: statusSelecionado && statusSelecionado !== 'todos' ? [statusSelecionado] : undefined,
      vencimento_proximo_dias: vencimentoProximo && vencimentoProximo !== 'todos' ? parseInt(vencimentoProximo) : undefined
    };
    
    const dados = await buscarRelatorioFornecedores(filtrosCompletos);
    setFornecedores(dados);
    setDadosCarregados(true);
  };

  const limparFiltros = () => {
    setBuscaTexto('');
    setStatusSelecionado('todos');
    setVencimentoProximo('todos');
    setFornecedores([]);
    setDadosCarregados(false);
  };

  const exportarExcel = () => {
    if (fornecedores.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    // Preparar dados para exportação
    const dadosExportacao = fornecedores.map(fornecedor => ({
      'Nome': fornecedor.nome,
      'Email': fornecedor.email,
      'Empresa': fornecedor.empresa || '-',
      'Telefone': fornecedor.telefone || '-',
      'WhatsApp': fornecedor.whatsapp || '-',
      'Status Contrato': getStatusLabel(fornecedor.status_contrato),
      'Data Cadastro': fornecedor.data_criacao ? format(new Date(fornecedor.data_criacao), 'dd/MM/yyyy', { locale: ptBR }) : '-',
      'Data Término': fornecedor.data_termino_contrato ? format(new Date(fornecedor.data_termino_contrato), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem prazo',
      'Dias Restantes': fornecedor.dias_restantes_contrato || 'N/A',
      'Limite Acessos Diários': fornecedor.limite_acessos_diarios,
      'Limite Acessos Mensais': fornecedor.limite_acessos_mensais,
      'Limite Propostas Abertas': fornecedor.limite_propostas_abertas || 'Ilimitado',
      'Acessos Hoje': fornecedor.acessos_diarios,
      'Acessos Este Mês': fornecedor.acessos_mensais,
      'Último Login': fornecedor.ultimo_login ? format(new Date(fornecedor.ultimo_login), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Nunca',
      'Dias Sem Login': fornecedor.dias_sem_login || 'N/A',
      'Penalidades Ativas': fornecedor.penalidades_ativas,
      'Total Candidaturas': fornecedor.total_candidaturas,
      'Candidaturas Ativas': fornecedor.candidaturas_ativas,
      'Endereço': fornecedor.endereco || '-',
      'Site': fornecedor.site_url || '-'
    }));

    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Fornecedores');

    // Gerar arquivo
    const nomeArquivo = `relatorio_fornecedores_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
    
    toast.success(`Relatório exportado: ${nomeArquivo}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ativo': return 'default';
      case 'vencido': return 'destructive';
      case 'suspenso': return 'secondary';
      case 'pendente': return 'outline';
      case 'inativo': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'vencido': return 'Vencido';
      case 'suspenso': return 'Suspenso';
      case 'pendente': return 'Pendente';
      case 'inativo': return 'Inativo';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativo': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'vencido': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'suspenso': return <XCircle className="w-4 h-4 text-orange-600" />;
      case 'pendente': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'inativo': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  // Calcular métricas
  const metricas = useMemo(() => {
    if (fornecedores.length === 0) return null;
    
    return {
      total: fornecedores.length,
      ativos: fornecedores.filter(f => f.status_contrato === 'ativo').length,
      vencidos: fornecedores.filter(f => f.status_contrato === 'vencido').length,
      suspensos: fornecedores.filter(f => f.status_contrato === 'suspenso').length,
      vencendoEm30Dias: fornecedores.filter(f => 
        f.dias_restantes_contrato !== null && 
        f.dias_restantes_contrato <= 30 && 
        f.dias_restantes_contrato > 0
      ).length,
      semLogin30Dias: fornecedores.filter(f => 
        f.dias_sem_login !== null && f.dias_sem_login > 30
      ).length,
      comPenalidades: fornecedores.filter(f => f.penalidades_ativas > 0).length
    };
  }, [fornecedores]);

  return (
    <div className="space-y-6">
      {/* Filtros Específicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Específicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="busca">Buscar (Nome, Email ou Empresa)</Label>
              <Input
                id="busca"
                placeholder="Digite para buscar..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status do Contrato</Label>
              <Select value={statusSelecionado} onValueChange={setStatusSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento Próximo</Label>
              <Select value={vencimentoProximo} onValueChange={setVencimentoProximo}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer prazo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer prazo</SelectItem>
                  <SelectItem value="7">Próximos 7 dias</SelectItem>
                  <SelectItem value="15">Próximos 15 dias</SelectItem>
                  <SelectItem value="30">Próximos 30 dias</SelectItem>
                  <SelectItem value="60">Próximos 60 dias</SelectItem>
                  <SelectItem value="90">Próximos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={aplicarFiltros} disabled={loading} className="flex-1">
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      {metricas && dadosCarregados && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{metricas.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{metricas.ativos}</div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{metricas.vencidos}</div>
              <div className="text-sm text-muted-foreground">Vencidos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{metricas.suspensos}</div>
              <div className="text-sm text-muted-foreground">Suspensos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{metricas.vencendoEm30Dias}</div>
              <div className="text-sm text-muted-foreground">Vencendo em 30d</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{metricas.semLogin30Dias}</div>
              <div className="text-sm text-muted-foreground">Sem login 30d+</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{metricas.comPenalidades}</div>
              <div className="text-sm text-muted-foreground">Com Penalidades</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Resultados */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Fornecedores ({fornecedores.length})</CardTitle>
            {fornecedores.length > 0 && (
              <Button onClick={exportarExcel} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!dadosCarregados ? (
            <div className="text-center py-8 text-muted-foreground">
              Configure os filtros acima e clique em "Buscar" para visualizar os resultados
            </div>
          ) : fornecedores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum fornecedor encontrado com os filtros aplicados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome/Empresa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Candidaturas</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(fornecedor.status_contrato)}
                          <Badge variant={getStatusBadgeVariant(fornecedor.status_contrato)}>
                            {getStatusLabel(fornecedor.status_contrato)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{fornecedor.nome}</div>
                          <div className="text-sm text-muted-foreground">{fornecedor.empresa}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{fornecedor.email}</div>
                          <div className="text-muted-foreground">{fornecedor.telefone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            Cadastro: {fornecedor.data_criacao 
                              ? format(new Date(fornecedor.data_criacao), 'dd/MM/yyyy', { locale: ptBR })
                              : '-'
                            }
                          </div>
                          <div className="text-muted-foreground">
                            Término: {fornecedor.data_termino_contrato 
                              ? format(new Date(fornecedor.data_termino_contrato), 'dd/MM/yyyy', { locale: ptBR })
                              : 'Sem prazo'
                            }
                          </div>
                          {fornecedor.dias_restantes_contrato !== null && (
                            <div className={`text-sm ${fornecedor.dias_restantes_contrato <= 30 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {fornecedor.dias_restantes_contrato} dias restantes
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Acessos: {fornecedor.limite_acessos_diarios}/dia, {fornecedor.limite_acessos_mensais}/mês</div>
                          <div className="text-muted-foreground">
                            Propostas: {fornecedor.limite_propostas_abertas || 'Ilimitado'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Hoje: {fornecedor.acessos_diarios} | Mês: {fornecedor.acessos_mensais}</div>
                          <div className="text-muted-foreground">
                            Último login: {fornecedor.ultimo_login 
                              ? format(new Date(fornecedor.ultimo_login), 'dd/MM', { locale: ptBR })
                              : 'Nunca'
                            }
                          </div>
                          {fornecedor.dias_sem_login !== null && fornecedor.dias_sem_login > 30 && (
                            <div className="text-red-600 text-xs font-medium">
                              {fornecedor.dias_sem_login} dias sem login
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Total: {fornecedor.total_candidaturas}</div>
                          <div className="text-muted-foreground">Ativas: {fornecedor.candidaturas_ativas}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {fornecedor.penalidades_ativas > 0 && (
                            <Badge variant="destructive" className="mb-1">
                              {fornecedor.penalidades_ativas} penalidade(s)
                            </Badge>
                          )}
                          {fornecedor.bloqueado_ate && new Date(fornecedor.bloqueado_ate) > new Date() && (
                            <div className="text-red-600 text-xs">
                              Bloqueado até {format(new Date(fornecedor.bloqueado_ate), 'dd/MM', { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioFornecedores;