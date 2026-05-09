import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, FileEdit, Mail } from 'lucide-react';
import { useRevisoesWorkflow } from '@/hooks/useRevisoesWorkflow';

export const NotificacaoRevisao = () => {
  const { revisoesPendentes, loading, iniciarRevisao, finalizarRevisao } = useRevisoesWorkflow();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (revisoesPendentes.length === 0) {
    return null; // Não mostra nada se não há revisões pendentes
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Revisões Solicitadas</h3>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {revisoesPendentes.length}
        </Badge>
      </div>

      {revisoesPendentes.map((revisao) => (
        <Card key={revisao.id} className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-orange-600" />
                <span>Revisão de Proposta</span>
              </div>
              <Badge variant={revisao.status === 'pendente' ? 'destructive' : 'default'}>
                {revisao.status === 'pendente' ? 'Aguardando' : 'Em Andamento'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Projeto</p>
                <p className="font-medium">{revisao.proposta.orcamento.necessidade}</p>
                <p className="text-sm text-gray-600">{revisao.proposta.orcamento.local}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solicitado em</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(revisao.data_solicitacao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Cliente
              </p>
              <p className="font-medium">{revisao.cliente_temp_email}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Motivo da Revisão</p>
              <div className="bg-white p-3 rounded border">
                <p className="text-sm whitespace-pre-wrap">{revisao.motivo_revisao}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {revisao.status === 'pendente' ? (
                <Button
                  onClick={() => iniciarRevisao(revisao.id, revisao.checklist_proposta_id)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Iniciar Revisão
                </Button>
              ) : (
                <Button
                  onClick={() => finalizarRevisao(revisao.checklist_proposta_id)}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  Finalizar Revisão
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};