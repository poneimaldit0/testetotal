import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Loader2, User, Building, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePropostas, PropostaDetalhada } from '@/hooks/usePropostas';
import { useToast } from '@/hooks/use-toast';
import { exportarPropostaExcel } from '@/utils/exportacaoPropostas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DetalhesPropostaModalProps {
  propostaId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetalhesPropostaModal: React.FC<DetalhesPropostaModalProps> = ({
  propostaId,
  isOpen,
  onClose
}) => {
  const [proposta, setProposta] = useState<PropostaDetalhada | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { carregarPropostaDetalhada } = usePropostas();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && propostaId) {
      carregarDetalhes();
    }
  }, [isOpen, propostaId]);

  const carregarDetalhes = async () => {
    if (!propostaId) return;
    
    try {
      setLoading(true);
      const dados = await carregarPropostaDetalhada(propostaId);
      setProposta(dados);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async () => {
    if (!proposta) return;

    try {
      setExportando(true);
      const sucesso = exportarPropostaExcel(proposta);
      
      if (sucesso) {
        toast({
          title: 'Sucesso',
          description: 'Proposta exportada com sucesso!'
        });
      } else {
        throw new Error('Falha na exportação');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar a proposta',
        variant: 'destructive'
      });
    } finally {
      setExportando(false);
    }
  };

  // Agrupar respostas por categoria
  const respostasPorCategoria = proposta?.respostas.reduce((acc, resposta) => {
    const categoria = resposta.item.categoria;
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(resposta);
    return acc;
  }, {} as Record<string, typeof proposta.respostas>) || {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'bg-gray-100 text-gray-800';
      case 'enviado':
        return 'bg-blue-100 text-blue-800';
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl text-secondary">
              Detalhes da Proposta
            </DialogTitle>
            {proposta && (
              <Button
                onClick={handleExportar}
                disabled={exportando}
                className="goodref-button-primary"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {exportando ? 'Exportando...' : 'Exportar Excel'}
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando detalhes...</span>
          </div>
        ) : proposta ? (
          <div className="space-y-6">
            {/* Informações Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados do Orçamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Building className="h-5 w-5 mr-2 text-primary" />
                    Dados do Orçamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Código:</span> {proposta.orcamento.codigo_orcamento || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Necessidade:</span> {proposta.orcamento.necessidade}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="font-medium">Local:</span> {proposta.orcamento.local}
                  </div>
                  <div>
                    <span className="font-medium">Tamanho:</span> {proposta.orcamento.tamanho_imovel || 'N/A'} m²
                  </div>
                </CardContent>
              </Card>

              {/* Dados do Fornecedor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    Dados do Fornecedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-medium">Nome:</span> {proposta.candidatura.nome}
                  </div>
                  <div>
                    <span className="font-medium">Empresa:</span> {proposta.candidatura.empresa}
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                    {proposta.candidatura.email}
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                    {proposta.candidatura.telefone}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo da Proposta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Proposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(proposta.valor_total_estimado || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Total Estimado</div>
                  </div>
                  <div className="text-center">
                    <Badge className={getStatusColor(proposta.status)}>
                      {proposta.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-2">Status</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                      {format(new Date(proposta.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <div className="text-sm text-muted-foreground">Data da Proposta</div>
                  </div>
                </div>

                {proposta.observacoes && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <span className="font-medium">Observações:</span>
                      <p className="mt-2 text-muted-foreground">{proposta.observacoes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Detalhamento por Categoria */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalhamento por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {Object.entries(respostasPorCategoria).map(([categoria, respostas]) => {
                  const totalCategoria = respostas
                    .filter(r => r.incluido)
                    .reduce((sum, r) => sum + (r.valor_estimado || 0), 0);

                  return (
                    <div key={categoria} className="border-b last:border-b-0">
                      <div className="p-4 bg-muted/50">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-secondary">
                            {categoria.toUpperCase()}
                          </h4>
                          <span className="font-bold text-primary">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(totalCategoria)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead className="text-center">Incluído</TableHead>
                              <TableHead className="text-right">Valor Estimado</TableHead>
                              <TableHead>Ambientes</TableHead>
                              <TableHead>Observações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {respostas
                              .sort((a, b) => a.item.ordem - b.item.ordem)
                              .map((resposta) => (
                                <TableRow key={resposta.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{resposta.item.nome}</div>
                                      {resposta.item.descricao && (
                                        <div className="text-sm text-muted-foreground">
                                          {resposta.item.descricao}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={resposta.incluido ? "default" : "secondary"}>
                                      {resposta.incluido ? 'SIM' : 'NÃO'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {resposta.incluido ? (
                                      <span className="font-semibold">
                                        {new Intl.NumberFormat('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL'
                                        }).format(resposta.valor_estimado || 0)}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {resposta.incluido && resposta.ambientes?.length > 0
                                      ? resposta.ambientes.join(', ')
                                      : '-'
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {resposta.observacoes || '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Não foi possível carregar os detalhes da proposta.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};