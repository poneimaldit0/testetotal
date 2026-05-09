import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Users, UserX, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRelatoriosAdmin, type RelatorioLoginFornecedor } from '@/hooks/useRelatoriosAdmin';
import * as XLSX from 'xlsx';

interface Props {
  fornecedorId?: string;
  dataInicio?: string;
  dataFim?: string;
  filtrosAplicados: boolean;
}

export const RelatorioLoginsFornecedor: React.FC<Props> = ({
  fornecedorId,
  dataInicio,
  dataFim,
  filtrosAplicados
}) => {
  const { buscarLoginsFornecedor, loading } = useRelatoriosAdmin();
  const [dados, setDados] = useState<RelatorioLoginFornecedor[]>([]);

  useEffect(() => {
    if (filtrosAplicados) {
      buscarDados();
    }
  }, [fornecedorId, dataInicio, dataFim, filtrosAplicados]);

  const buscarDados = async () => {
    try {
      const resultado = await buscarLoginsFornecedor(fornecedorId, dataInicio, dataFim);
      setDados(resultado);
    } catch (error) {
      console.error('Erro ao buscar dados de login:', error);
    }
  };

  const exportarCSV = () => {
    if (dados.length === 0) return;

    const dadosExport = dados.map(item => ({
      'Nome': item.nome,
      'Empresa': item.empresa,
      'Email': item.email,
      'Status do Contrato': item.status_contrato,
      'Início do Contrato': item.data_inicio_contrato ? format(new Date(item.data_inicio_contrato), 'dd/MM/yyyy', { locale: ptBR }) : '',
      'Término do Contrato': item.data_termino_contrato ? format(new Date(item.data_termino_contrato), 'dd/MM/yyyy', { locale: ptBR }) : 'Não definido',
      'Total de Logins (Desde o Início)': item.total_logins_desde_inicio,
      'Total de Logins (Período)': item.total_logins_periodo,
      'Último Login': item.ultimo_login ? format(new Date(item.ultimo_login), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Nunca fez login',
      'Dias Sem Login': item.dias_sem_login || 'N/A',
      'Média de Logins/Mês': item.media_logins_mes,
      'Dias Totais de Contrato': item.dias_contrato_total || 'N/A',
      'Dias Restantes': item.dias_contrato_restantes || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logins Fornecedores');

    const periodo = dataInicio && dataFim ? `_${dataInicio}_${dataFim}` : '';
    const nomeArquivo = `relatorio_logins_fornecedores${periodo}.xlsx`;
    
    XLSX.writeFile(wb, nomeArquivo);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'vencido':
        return <Badge variant="destructive">Vencido</Badge>;
      case 'inativo':
        return <Badge variant="secondary">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUltimoLoginBadge = (ultimoLogin: string | null, diasSemLogin: number | null) => {
    if (!ultimoLogin) {
      return <Badge variant="destructive">Nunca fez login</Badge>;
    }

    if (diasSemLogin === null) return null;

    if (diasSemLogin <= 7) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>;
    } else if (diasSemLogin <= 30) {
      return <Badge variant="secondary">Moderado</Badge>;
    } else {
      return <Badge variant="destructive">Inativo</Badge>;
    }
  };

  const calcularProgressoContrato = (diasRestantes: number | null, diasTotais: number | null) => {
    if (!diasRestantes || !diasTotais) return 0;
    return Math.max(0, Math.min(100, ((diasTotais - diasRestantes) / diasTotais) * 100));
  };

  // Estatísticas
  const fornecedoresAtivos = dados.filter(f => f.status_contrato === 'ativo').length;
  const fornecedoresInativos = dados.filter(f => f.dias_sem_login && f.dias_sem_login > 30).length;
  const nuncaFizeramLogin = dados.filter(f => !f.ultimo_login).length;
  const mediaLoginsGeral = dados.length > 0 ? dados.reduce((acc, f) => acc + f.media_logins_mes, 0) / dados.length : 0;

  if (!filtrosAplicados) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Relatório de Logins dos Fornecedores
            </CardTitle>
            <CardDescription>
              Monitore a atividade de login dos fornecedores ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Configure as datas e clique em "Aplicar Filtros" para visualizar o relatório.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fornecedores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fornecedoresAtivos}</div>
            <p className="text-xs text-muted-foreground">
              de {dados.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Login Recente</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{fornecedoresInativos}</div>
            <p className="text-xs text-muted-foreground">
              +30 dias sem acesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nunca Acessaram</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{nuncaFizeramLogin}</div>
            <p className="text-xs text-muted-foreground">
              necessitam atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Logins/Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mediaLoginsGeral.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              por fornecedor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(fornecedoresInativos > 0 || nuncaFizeramLogin > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> {fornecedoresInativos > 0 && `${fornecedoresInativos} fornecedores sem acesso há mais de 30 dias`}
            {fornecedoresInativos > 0 && nuncaFizeramLogin > 0 && ' e '}
            {nuncaFizeramLogin > 0 && `${nuncaFizeramLogin} fornecedores nunca fizeram login`}.
            Considere entrar em contato para verificar se precisam de suporte.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detalhamento por Fornecedor</CardTitle>
              <CardDescription>
                {dados.length} fornecedores encontrados
                {dataInicio && dataFim && ` • Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`}
              </CardDescription>
            </div>
            <Button onClick={exportarCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum fornecedor encontrado para os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Logins Total</TableHead>
                    <TableHead>Logins Período</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead>Média/Mês</TableHead>
                    <TableHead>Progresso Contrato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((fornecedor) => (
                    <TableRow key={fornecedor.fornecedor_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{fornecedor.nome}</div>
                          <div className="text-sm text-muted-foreground">{fornecedor.empresa}</div>
                          <div className="text-xs text-muted-foreground">{fornecedor.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(fornecedor.status_contrato)}
                          {getUltimoLoginBadge(fornecedor.ultimo_login, fornecedor.dias_sem_login)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-lg font-semibold">{fornecedor.total_logins_desde_inicio}</div>
                        <div className="text-xs text-muted-foreground">
                          desde {format(new Date(fornecedor.data_inicio_contrato), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-lg font-semibold">{fornecedor.total_logins_periodo}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {fornecedor.ultimo_login ? (
                            <>
                              <div className="font-medium">
                                {format(new Date(fornecedor.ultimo_login), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(fornecedor.ultimo_login), 'HH:mm', { locale: ptBR })}
                              </div>
                              {fornecedor.dias_sem_login && (
                                <div className="text-xs text-muted-foreground">
                                  há {fornecedor.dias_sem_login} dias
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-muted-foreground">Nunca fez login</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-lg font-semibold">{fornecedor.media_logins_mes}</div>
                        <div className="text-xs text-muted-foreground">logins/mês</div>
                      </TableCell>
                      <TableCell>
                        {fornecedor.dias_contrato_total && fornecedor.dias_contrato_restantes !== null ? (
                          <div className="space-y-2">
                            <Progress 
                              value={calcularProgressoContrato(fornecedor.dias_contrato_restantes, fornecedor.dias_contrato_total)} 
                              className="w-20" 
                            />
                            <div className="text-xs text-muted-foreground">
                              {fornecedor.dias_contrato_restantes} dias restantes
                            </div>
                            {fornecedor.data_termino_contrato && (
                              <div className="text-xs text-muted-foreground">
                                até {format(new Date(fornecedor.data_termino_contrato), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Contrato indefinido</div>
                        )}
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