import { useState } from 'react';
import { Calendar, CalendarIcon, Users, UserPlus, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRelatoriosAdmin, type RelatorioFornecedoresAtivos, type FornecedorAtivoData } from '@/hooks/useRelatoriosAdmin';
import { cn } from '@/lib/utils';

export function RelatorioFornecedoresAtivos() {
  const [dataConsulta, setDataConsulta] = useState<Date>(new Date());
  const [relatorio, setRelatorio] = useState<RelatorioFornecedoresAtivos | null>(null);
  const { loading, buscarFornecedoresAtivos } = useRelatoriosAdmin();

  const handleConsultar = async () => {
    const resultado = await buscarFornecedoresAtivos(format(dataConsulta, 'yyyy-MM-dd'));
    setRelatorio(resultado);
  };

  const getStatusBadgeVariant = (status: FornecedorAtivoData['status_contrato']) => {
    switch (status) {
      case 'ativo': return 'default';
      case 'vencendo': return 'destructive';
      case 'sem_prazo': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: FornecedorAtivoData['status_contrato']) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'vencendo': return 'Vencendo';
      case 'sem_prazo': return 'Sem Prazo';
      default: return 'Indefinido';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fornecedores Ativos por Data</h2>
          <p className="text-muted-foreground">
            Consulte quantos fornecedores estavam ativos em uma data específica
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dataConsulta && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataConsulta ? format(dataConsulta, "PPP", { locale: ptBR }) : "Selecione uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dataConsulta}
                onSelect={(date) => date && setDataConsulta(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={handleConsultar} disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </Button>
        </div>
      </div>

      {relatorio && (
        <>
          {/* Métricas principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorio.total_ativos}</div>
                <p className="text-xs text-muted-foreground">
                  Em {format(dataConsulta, "dd/MM/yyyy")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Novos no Mês</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorio.novos_mes_atual}</div>
                <p className="text-xs text-muted-foreground">
                  Cadastrados em {format(dataConsulta, "MMMM/yyyy", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencendo em 30 dias</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorio.contratos_vencendo_30_dias}</div>
                <p className="text-xs text-muted-foreground">
                  Contratos próximos ao vencimento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sem Prazo</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{relatorio.sem_data_termino}</div>
                <p className="text-xs text-muted-foreground">
                  Contratos sem data de término
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de fornecedores */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Fornecedores Ativos</CardTitle>
              <CardDescription>
                Fornecedores que estavam ativos em {format(dataConsulta, "dd/MM/yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relatorio.fornecedores.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Data Cadastro</TableHead>
                      <TableHead>Término Contrato</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorio.fornecedores.map((fornecedor) => (
                      <TableRow key={fornecedor.id}>
                        <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                        <TableCell>{fornecedor.empresa || '-'}</TableCell>
                        <TableCell>{fornecedor.email}</TableCell>
                        <TableCell>{fornecedor.telefone || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(fornecedor.data_criacao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {fornecedor.data_termino_contrato 
                            ? format(new Date(fornecedor.data_termino_contrato), "dd/MM/yyyy")
                            : 'Sem prazo'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(fornecedor.status_contrato)}>
                            {getStatusLabel(fornecedor.status_contrato)}
                          </Badge>
                          {fornecedor.dias_restantes_contrato !== null && fornecedor.dias_restantes_contrato <= 30 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({fornecedor.dias_restantes_contrato} dias)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    Nenhum fornecedor ativo encontrado para a data selecionada.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}