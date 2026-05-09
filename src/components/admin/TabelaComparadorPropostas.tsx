import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Users, Calculator, Calendar, MapPin, FileText, ChevronDown, ChevronRight, Link } from 'lucide-react';
import GeradorTokenComparacao from '@/components/admin/GeradorTokenComparacao';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PropostaNaComparacao {
  id: string;
  fornecedor_nome: string;
  fornecedor_empresa: string;
  status: string;
  valor_total: number;
  data_candidatura: string;
}

interface OrcamentoComParada {
  id: string;
  necessidade: string;
  local: string;
  status: string;
  data_publicacao: string;
  propostas: PropostaNaComparacao[];
  dados_contato?: {
    nome: string;
    telefone: string;
    email: string;
  };
}

interface TabelaComparadorPropostasProps {
  orcamentos: OrcamentoComParada[];
  loading: boolean;
  onVerComparacao: (orcamentoId: string) => void;
}

export const TabelaComparadorPropostas: React.FC<TabelaComparadorPropostasProps> = ({
  orcamentos,
  loading,
  onVerComparacao
}) => {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [modalAberto, setModalAberto] = useState(false);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState<OrcamentoComParada | null>(null);
  const [modalLinkAberto, setModalLinkAberto] = useState(false);
  const [orcamentoParaLink, setOrcamentoParaLink] = useState<OrcamentoComParada | null>(null);

  const toggleExpandir = (orcamentoId: string) => {
    const novosExpandidos = new Set(expandidos);
    if (novosExpandidos.has(orcamentoId)) {
      novosExpandidos.delete(orcamentoId);
    } else {
      novosExpandidos.add(orcamentoId);
    }
    setExpandidos(novosExpandidos);
  };

  const abrirComparacao = (orcamento: OrcamentoComParada) => {
    setOrcamentoSelecionado(orcamento);
    setModalAberto(true);
  };

  const abrirModalLink = (orcamento: OrcamentoComParada) => {
    setOrcamentoParaLink(orcamento);
    setModalLinkAberto(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      'finalizada': 'default',
      'enviada': 'default',
      'rascunho': 'secondary',
      'sem_proposta': 'destructive'
    };
    
    const labels = {
      'finalizada': 'Finalizada',
      'enviada': 'Enviada',
      'rascunho': 'Rascunho',
      'sem_proposta': 'Sem Proposta'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const calcularEstatisticas = (propostas: PropostaNaComparacao[]) => {
    const valores = propostas.map(p => p.valor_total).filter(v => v > 0);
    if (valores.length === 0) return { min: 0, max: 0, media: 0 };
    
    return {
      min: Math.min(...valores),
      max: Math.max(...valores),
      media: valores.reduce((a, b) => a + b, 0) / valores.length
    };
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Carregando orçamentos...</span>
      </div>
    );
  }

  if (orcamentos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Nenhum orçamento com propostas encontrado</h3>
              <p className="text-muted-foreground">
                Orçamentos aparecerão aqui quando receberem propostas dos fornecedores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Orçamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Propostas</TableHead>
                <TableHead>Valores</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orcamentos.map((orcamento) => {
                const stats = calcularEstatisticas(orcamento.propostas);
                const estaExpandido = expandidos.has(orcamento.id);
                
                return (
                  <React.Fragment key={orcamento.id}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpandir(orcamento.id)}
                          className="p-1"
                        >
                          {estaExpandido ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm line-clamp-2">
                            {orcamento.necessidade}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {orcamento.local}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={orcamento.status === 'aberto' ? 'default' : 'secondary'}>
                          {orcamento.status === 'aberto' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-medium">{orcamento.propostas.length}</span>
                          <span className="text-muted-foreground text-sm">
                            proposta{orcamento.propostas.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {orcamento.propostas.length > 0 && stats.min > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-green-600">
                              Min: {formatarMoeda(stats.min)}
                            </div>
                            <div className="text-sm font-medium text-blue-600">
                              Máx: {formatarMoeda(stats.max)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem valores</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(orcamento.data_publicacao), "dd/MM/yyyy", {
                            locale: ptBR
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => abrirComparacao(orcamento)}
                            variant="outline"
                            size="sm"
                            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Comparar
                          </Button>
                          <Button
                            onClick={() => abrirModalLink(orcamento)}
                            variant="outline"
                            size="sm"
                            className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                          >
                            <Link className="h-4 w-4 mr-1" />
                            Gerar Link
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {estaExpandido && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <div className="bg-muted/20 p-4 border-t">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Propostas Recebidas:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {orcamento.propostas.map((proposta) => (
                                  <div
                                    key={proposta.id}
                                    className="bg-background p-3 rounded-lg border"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="font-medium text-sm">
                                          {proposta.fornecedor_nome}
                                        </div>
                                        {getStatusBadge(proposta.status)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {proposta.fornecedor_empresa}
                                      </div>
                                      {proposta.valor_total > 0 && (
                                        <div className="font-semibold text-primary">
                                          {formatarMoeda(proposta.valor_total)}
                                        </div>
                                      )}
                                      <div className="text-xs text-muted-foreground">
                                        Enviada em {format(new Date(proposta.data_candidatura), "dd/MM/yyyy", {
                                          locale: ptBR
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Comparação Detalhada */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Comparação Detalhada de Propostas
            </DialogTitle>
            <DialogDescription>
              {orcamentoSelecionado?.necessidade}
            </DialogDescription>
          </DialogHeader>
          
          {orcamentoSelecionado && (
            <div className="space-y-6">
              {/* Informações do Orçamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações do Orçamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Necessidade
                      </label>
                      <p className="mt-1">{orcamentoSelecionado.necessidade}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Local
                      </label>
                      <p className="mt-1">{orcamentoSelecionado.local}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Status
                      </label>
                      <div className="mt-1">
                        <Badge variant={orcamentoSelecionado.status === 'aberto' ? 'default' : 'secondary'}>
                          {orcamentoSelecionado.status === 'aberto' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Data de Publicação
                      </label>
                      <p className="mt-1">
                        {format(new Date(orcamentoSelecionado.data_publicacao), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparação de Propostas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Propostas Recebidas ({orcamentoSelecionado.propostas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orcamentoSelecionado.propostas
                          .sort((a, b) => a.valor_total - b.valor_total)
                          .map((proposta) => (
                          <TableRow key={proposta.id}>
                            <TableCell className="font-medium">
                              {proposta.fornecedor_nome}
                            </TableCell>
                            <TableCell>{proposta.fornecedor_empresa}</TableCell>
                            <TableCell>
                              {proposta.valor_total > 0 ? (
                                <span className="font-semibold text-primary">
                                  {formatarMoeda(proposta.valor_total)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Não informado</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(proposta.status)}
                            </TableCell>
                            <TableCell>
                              {format(new Date(proposta.data_candidatura), "dd/MM/yyyy", {
                                locale: ptBR
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Geração de Link */}
      <Dialog open={modalLinkAberto} onOpenChange={setModalLinkAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Gerar Link de Comparação
            </DialogTitle>
            <DialogDescription>
              Gere um link seguro para o cliente visualizar e comparar as propostas
            </DialogDescription>
          </DialogHeader>
          
          {orcamentoParaLink && (
            <GeradorTokenComparacao
              orcamento={orcamentoParaLink}
              onClose={() => setModalLinkAberto(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};