import { useState, useEffect, useMemo } from 'react';
import { useRelatoriosAdmin } from '@/hooks/useRelatoriosAdmin';
import { FornecedorExperiencia } from '@/types/relatorios';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Activity,
  MessageSquare,
  Phone,
  Users,
  Copy,
  ExternalLink,
  Search,
  XCircle,
  Download
} from 'lucide-react';
import { exportarExperienciaFornecedorExcel } from '@/utils/exportacaoExperienciaFornecedor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function RelatorioExperienciaFornecedor() {
  const { buscarExperienciaFornecedores, loading } = useRelatoriosAdmin();
  const [fornecedores, setFornecedores] = useState<FornecedorExperiencia[]>([]);
  const [filtroAba, setFiltroAba] = useState<'todos' | 'urgente' | 'inatividade' | 'orcamentos' | 'marcos'>('todos');
  const [busca, setBusca] = useState('');
  const [filtroContrato, setFiltroContrato] = useState<'todos' | 'com_contrato' | 'sem_contrato'>('todos');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorExperiencia | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const dados = await buscarExperienciaFornecedores();
    setFornecedores(dados as unknown as FornecedorExperiencia[]);
  };

  const resumo = useMemo(() => {
    const comContrato = fornecedores.filter(f => 
      f.status_contrato === 'ativo' || f.status_contrato === 'vencendo'
    ).length;
    
    const semContrato = fornecedores.filter(f => 
      f.status_contrato === 'sem_prazo' || f.status_contrato === 'vencido'
    ).length;

    return {
      total_ativos: fornecedores.length,
      criticos: fornecedores.filter(f => f.nivel_alerta === 'critico').length,
      atencao: fornecedores.filter(f => f.nivel_alerta === 'atencao').length,
      saudaveis: fornecedores.filter(f => f.nivel_alerta === 'ok').length,
      marcos: fornecedores.filter(f => f.nivel_alerta === 'marco').length,
      com_contrato: comContrato,
      sem_contrato: semContrato,
    };
  }, [fornecedores]);

  const fornecedoresFiltrados = useMemo(() => {
    let resultado = fornecedores;

    // Filtro por status de contrato
    if (filtroContrato === 'com_contrato') {
      resultado = resultado.filter(f => 
        f.status_contrato === 'ativo' || f.status_contrato === 'vencendo'
      );
    } else if (filtroContrato === 'sem_contrato') {
      resultado = resultado.filter(f => 
        f.status_contrato === 'sem_prazo' || f.status_contrato === 'vencido'
      );
    }

    // Filtro por aba
    if (filtroAba === 'urgente') {
      resultado = resultado.filter(f => f.nivel_alerta === 'critico');
    } else if (filtroAba === 'inatividade') {
      resultado = resultado.filter(f => 
        f.gatilhos_ativos.some(g => g.tipo === 'inatividade')
      );
    } else if (filtroAba === 'orcamentos') {
      resultado = resultado.filter(f => 
        f.gatilhos_ativos.some(g => g.tipo === 'orcamentos_abertos')
      );
    } else if (filtroAba === 'marcos') {
      resultado = resultado.filter(f => 
        f.gatilhos_ativos.some(g => g.tipo === 'marco_temporal')
      );
    }

    // Filtro por busca
    if (busca) {
      const buscaLower = busca.toLowerCase();
      resultado = resultado.filter(f =>
        f.nome.toLowerCase().includes(buscaLower) ||
        f.empresa.toLowerCase().includes(buscaLower) ||
        f.email.toLowerCase().includes(buscaLower)
      );
    }

    return resultado;
  }, [fornecedores, filtroAba, busca, filtroContrato]);

  const getBadgeAlerta = (nivel: string) => {
    switch (nivel) {
      case 'critico':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Crítico</Badge>;
      case 'atencao':
        return <Badge variant="outline" className="gap-1 border-warning text-warning"><AlertTriangle className="h-3 w-3" />Atenção</Badge>;
      case 'marco':
        return <Badge variant="outline" className="gap-1 border-primary text-primary"><Activity className="h-3 w-3" />Marco</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 border-success text-success"><CheckCircle2 className="h-3 w-3" />Saudável</Badge>;
    }
  };

  const getIconeTipoContato = (tipo: string) => {
    switch (tipo) {
      case 'reuniao_online':
        return <Phone className="h-4 w-4" />;
      case 'reuniao_presencial':
        return <Users className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const copiarMensagem = (mensagem: string) => {
    navigator.clipboard.writeText(mensagem);
    toast.success('Mensagem copiada para a área de transferência');
  };

  const abrirWhatsApp = (telefone: string, mensagem: string) => {
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const mensagemEncoded = encodeURIComponent(mensagem);
    window.open(`https://wa.me/55${telefoneFormatado}?text=${mensagemEncoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ação Urgente</p>
                <p className="text-2xl font-bold text-destructive">{resumo.criticos}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requer Atenção</p>
                <p className="text-2xl font-bold text-warning">{resumo.atencao}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saudáveis</p>
                <p className="text-2xl font-bold text-success">{resumo.saudaveis}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ativos</p>
                <p className="text-2xl font-bold">{resumo.total_ativos}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, empresa ou email..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="w-full md:w-64">
              <Select value={filtroContrato} onValueChange={(v: any) => setFiltroContrato(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status de Contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Contratos</SelectItem>
                  <SelectItem value="com_contrato">
                    Com Contrato Ativo ({resumo.com_contrato})
                  </SelectItem>
                  <SelectItem value="sem_contrato">
                    Sem Contrato Ativo ({resumo.sem_contrato})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => exportarExperienciaFornecedorExcel(fornecedoresFiltrados, resumo)}
              disabled={loading || fornecedoresFiltrados.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Abas de Filtro */}
      <Tabs value={filtroAba} onValueChange={(v: any) => setFiltroAba(v)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="todos">Todos ({fornecedores.length})</TabsTrigger>
          <TabsTrigger value="urgente">Urgente ({resumo.criticos})</TabsTrigger>
          <TabsTrigger value="inatividade">Inatividade</TabsTrigger>
          <TabsTrigger value="orcamentos">Orç. Abertos</TabsTrigger>
          <TabsTrigger value="marcos">Marcos</TabsTrigger>
        </TabsList>

        <TabsContent value={filtroAba} className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-center">Alerta</TableHead>
                      <TableHead className="text-center">Status Contrato</TableHead>
                      <TableHead className="text-center">Inativo</TableHead>
                      <TableHead className="text-center">Plataforma</TableHead>
                      <TableHead className="text-center">Abertos</TableHead>
                      <TableHead className="text-center">Inscrições</TableHead>
                      <TableHead className="text-center">Taxa Conv.</TableHead>
                      <TableHead>Ação Sugerida</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          Carregando dados...
                        </TableCell>
                      </TableRow>
                    ) : fornecedoresFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Nenhum fornecedor encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      fornecedoresFiltrados.map((fornecedor) => (
                        <TableRow key={fornecedor.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{fornecedor.nome}</span>
                              <span className="text-sm text-muted-foreground">{fornecedor.empresa}</span>
                              <span className="text-xs text-muted-foreground">{fornecedor.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getBadgeAlerta(fornecedor.nivel_alerta)}
                          </TableCell>
                          <TableCell className="text-center">
                            {fornecedor.status_contrato === 'ativo' && (
                              <Badge variant="outline" className="gap-1 border-success text-success">
                                <CheckCircle2 className="h-3 w-3" />Ativo
                              </Badge>
                            )}
                            {fornecedor.status_contrato === 'vencendo' && (
                              <Badge variant="outline" className="gap-1 border-warning text-warning">
                                <AlertTriangle className="h-3 w-3" />Vencendo
                              </Badge>
                            )}
                            {fornecedor.status_contrato === 'vencido' && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />Vencido
                              </Badge>
                            )}
              {fornecedor.status_contrato === 'sem_prazo' && (
                <Badge variant="secondary">Sem Prazo</Badge>
              )}
              {fornecedor.status_contrato === 'inativo' && (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />Inativo
                </Badge>
              )}
              {fornecedor.status_contrato === 'sem_prazo_inativo' && (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />Sem Prazo (Inativo)
                </Badge>
              )}
            </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={fornecedor.dias_inativo >= 20 ? 'destructive' : fornecedor.dias_inativo >= 10 ? 'outline' : 'secondary'}>
                              {fornecedor.dias_inativo} dias
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {fornecedor.dias_plataforma} dias
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={fornecedor.orcamentos_abertos >= 30 ? 'destructive' : fornecedor.orcamentos_abertos >= 15 ? 'outline' : 'secondary'}>
                              {fornecedor.orcamentos_abertos}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{fornecedor.total_inscricoes}</TableCell>
                          <TableCell className="text-center">{fornecedor.taxa_conversao}%</TableCell>
                          <TableCell className="max-w-xs truncate" title={fornecedor.acao_sugerida.titulo}>
                            {fornecedor.acao_sugerida.titulo}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              {getIconeTipoContato(fornecedor.acao_sugerida.tipo)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setFornecedorSelecionado(fornecedor)}
                            >
                              Executar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Ação */}
      <Dialog open={!!fornecedorSelecionado} onOpenChange={() => setFornecedorSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Executar Ação de CS</DialogTitle>
            <DialogDescription>
              {fornecedorSelecionado && (
                <>
                  <strong>{fornecedorSelecionado.nome}</strong> - {fornecedorSelecionado.empresa}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {fornecedorSelecionado && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  {getIconeTipoContato(fornecedorSelecionado.acao_sugerida.tipo)}
                  {fornecedorSelecionado.acao_sugerida.titulo}
                </h4>
                
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                  {fornecedorSelecionado.acao_sugerida.template}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => copiarMensagem(fornecedorSelecionado.acao_sugerida.template)}
                  className="w-full gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Mensagem
                </Button>

                {fornecedorSelecionado.telefone && (
                  <Button
                    variant="outline"
                    onClick={() => abrirWhatsApp(fornecedorSelecionado.telefone, fornecedorSelecionado.acao_sugerida.template)}
                    className="w-full gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Abrir no WhatsApp
                  </Button>
                )}

                {fornecedorSelecionado.acao_sugerida.link_reuniao && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(fornecedorSelecionado.acao_sugerida.link_reuniao!, '_blank')}
                    className="w-full gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir Pauta da Reunião
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <h5 className="font-semibold mb-2">Informações Adicionais</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span> {fornecedorSelecionado.email}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span> {fornecedorSelecionado.telefone}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prioridade:</span> {fornecedorSelecionado.prioridade}/100
                  </div>
                  <div>
                    <span className="text-muted-foreground">Último Acesso:</span>{' '}
                    {fornecedorSelecionado.ultimo_acesso
                      ? format(new Date(fornecedorSelecionado.ultimo_acesso), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Nunca'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
