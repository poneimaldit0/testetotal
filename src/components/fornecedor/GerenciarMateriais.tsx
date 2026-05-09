import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Package, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useSolicitacoesMateriais } from '@/hooks/useSolicitacoesMateriais';
import { useToast } from '@/hooks/use-toast';

interface GerenciarMateriaisProps {
  contratoId?: string;
}

export const GerenciarMateriais: React.FC<GerenciarMateriaisProps> = ({ contratoId }) => {
  const { solicitacoes, loading, responderSolicitacao } = useSolicitacoesMateriais(contratoId);
  const { toast } = useToast();
  
  const [respostasForm, setRespostasForm] = useState<{[key: string]: {
    valor_estimado: string;
    observacoes_fornecedor: string;
  }}>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="h-4 w-4" />;
      case 'aprovado': return <CheckCircle className="h-4 w-4" />;
      case 'rejeitado': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleResposta = async (solicitacaoId: string, status: 'aprovado' | 'rejeitado') => {
    const resposta = respostasForm[solicitacaoId];
    
    if (status === 'aprovado' && !resposta?.valor_estimado) {
      toast({
        title: "Erro",
        description: "Valor estimado é obrigatório para aprovação",
        variant: "destructive",
      });
      return;
    }

    try {
      await responderSolicitacao(
        solicitacaoId, 
        status, 
        resposta?.valor_estimado ? parseFloat(resposta.valor_estimado) : undefined,
        resposta?.observacoes_fornecedor
      );
      
      // Limpar form após resposta
      setRespostasForm(prev => {
        const newState = { ...prev };
        delete newState[solicitacaoId];
        return newState;
      });
    } catch (error) {
      console.error('Erro ao responder solicitação:', error);
    }
  };

  const updateRespostaForm = (solicitacaoId: string, field: string, value: string) => {
    setRespostasForm(prev => ({
      ...prev,
      [solicitacaoId]: {
        ...prev[solicitacaoId],
        [field]: value
      }
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const solicitacoesPendentes = solicitacoes.filter(s => s.status === 'pendente');
  const solicitacoesRespondidas = solicitacoes.filter(s => s.status !== 'pendente');

  return (
    <div className="space-y-6">
      {/* Solicitações Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Solicitações Pendentes ({solicitacoesPendentes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {solicitacoesPendentes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma solicitação pendente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitacoesPendentes.map((solicitacao) => (
                <div key={solicitacao.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(solicitacao.status)}>
                          {getStatusIcon(solicitacao.status)}
                          {solicitacao.status === 'pendente' ? 'Aguardando Resposta' : solicitacao.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Tipo: {solicitacao.tipo}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-medium text-sm">Descrição</h4>
                          <p className="text-sm text-gray-700">{solicitacao.descricao}</p>
                        </div>

                        {solicitacao.valor_estimado && (
                          <div>
                            <h4 className="font-medium text-sm">Valor Estimado pelo Cliente</h4>
                            <p className="font-semibold text-primary">
                              {formatCurrency(solicitacao.valor_estimado)}
                            </p>
                          </div>
                        )}

                        {solicitacao.observacoes_cliente && (
                          <div>
                            <h4 className="font-medium text-sm">Observações do Cliente</h4>
                            <p className="text-sm text-gray-600">{solicitacao.observacoes_cliente}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Resposta */}
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium">Sua Resposta</h4>
                    
                    <div>
                      <label className="text-sm font-medium">Valor Estimado (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={respostasForm[solicitacao.id]?.valor_estimado || ''}
                        onChange={(e) => updateRespostaForm(solicitacao.id, 'valor_estimado', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        placeholder="Observações sobre a solicitação, prazo de entrega, etc..."
                        value={respostasForm[solicitacao.id]?.observacoes_fornecedor || ''}
                        onChange={(e) => updateRespostaForm(solicitacao.id, 'observacoes_fornecedor', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleResposta(solicitacao.id, 'aprovado')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleResposta(solicitacao.id, 'rejeitado')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Solicitações */}
      {solicitacoesRespondidas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Respostas ({solicitacoesRespondidas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {solicitacoesRespondidas.map((solicitacao) => (
                <div key={solicitacao.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Badge className={getStatusColor(solicitacao.status)}>
                        {getStatusIcon(solicitacao.status)}
                        {solicitacao.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        Tipo: {solicitacao.tipo}
                      </p>
                    </div>
                    {solicitacao.observacoes_fornecedor && (
                      <span className="text-sm text-gray-500">
                        Respondido em: {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium text-sm">Descrição</h4>
                      <p className="text-sm text-gray-700">{solicitacao.descricao}</p>
                    </div>

                    {solicitacao.valor_estimado && (
                      <div>
                        <h4 className="font-medium text-sm">Valor Estimado</h4>
                        <p className="font-semibold text-primary">
                          {formatCurrency(solicitacao.valor_estimado)}
                        </p>
                      </div>
                    )}

                    {solicitacao.observacoes_fornecedor && (
                      <div>
                        <h4 className="font-medium text-sm">Suas Observações</h4>
                        <p className="text-sm text-gray-600">{solicitacao.observacoes_fornecedor}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};