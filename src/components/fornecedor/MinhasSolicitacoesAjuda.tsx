import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useSolicitacoesAjuda } from '@/hooks/useSolicitacoesAjuda';
import { MessageCircle, Clock, CheckCircle, HelpCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const MinhasSolicitacoesAjuda = () => {
  const { solicitacoes, loading, recarregar } = useSolicitacoesAjuda();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const solicitacoesPendentes = solicitacoes.filter(s => !s.respondida);
  const solicitacoesRespondidas = solicitacoes.filter(s => s.respondida);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderSolicitacao = (solicitacao: any, showFullConversation = false) => (
    <Card key={solicitacao.id} className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={solicitacao.respondida ? "default" : "secondary"}>
                {solicitacao.respondida ? "Respondida" : "Pendente"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(solicitacao.dataHora, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Orçamento: {solicitacao.orcamentoInfo?.codigo}
            </CardTitle>
            <CardDescription className="mt-1">
              {solicitacao.orcamentoInfo?.necessidade}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleExpanded(solicitacao.id)}
            className="ml-2"
          >
            {expandedId === solicitacao.id ? "Recolher" : "Ver detalhes"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Sua pergunta */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Sua pergunta:</span>
            </div>
            <p className="text-blue-700">{solicitacao.mensagem}</p>
          </div>

          {/* Resposta do admin se existir */}
          {solicitacao.respondida && solicitacao.respostaAdmin && (
            <>
              <Separator />
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Resposta do suporte:</span>
                  {solicitacao.dataResposta && (
                    <span className="text-sm text-green-600 ml-auto">
                      {format(solicitacao.dataResposta, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <p className="text-green-700 whitespace-pre-wrap">{solicitacao.respostaAdmin}</p>
              </div>
            </>
          )}

          {/* Status pendente */}
          {!solicitacao.respondida && (
            <>
              <Separator />
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Status:</span>
                  <span className="text-amber-700">Aguardando resposta do suporte</span>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando solicitações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-secondary">Minhas Solicitações de Ajuda</h2>
          <p className="text-muted-foreground">Acompanhe suas perguntas e respostas do suporte</p>
        </div>
        <Button onClick={recarregar} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{solicitacoes.length}</p>
                <p className="text-sm text-blue-600">Total de Solicitações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-700">{solicitacoesPendentes.length}</p>
                <p className="text-sm text-amber-600">Aguardando Resposta</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{solicitacoesRespondidas.length}</p>
                <p className="text-sm text-green-600">Respondidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de solicitações */}
      <Tabs defaultValue="todas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-primary/10">
          <TabsTrigger value="todas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Todas ({solicitacoes.length})
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Pendentes ({solicitacoesPendentes.length})
          </TabsTrigger>
          <TabsTrigger value="respondidas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Respondidas ({solicitacoesRespondidas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="space-y-4">
          {solicitacoes.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-sm text-muted-foreground">
                Você ainda não fez nenhuma solicitação de ajuda.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {solicitacoes.map(solicitacao => renderSolicitacao(solicitacao, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendentes" className="space-y-4">
          {solicitacoesPendentes.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhuma solicitação pendente
              </h3>
              <p className="text-sm text-muted-foreground">
                Todas as suas solicitações foram respondidas ou você não possui solicitações ativas.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {solicitacoesPendentes.map(solicitacao => renderSolicitacao(solicitacao, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="respondidas" className="space-y-4">
          {solicitacoesRespondidas.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhuma solicitação respondida
              </h3>
              <p className="text-sm text-muted-foreground">
                Você ainda não possui solicitações com respostas do suporte.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {solicitacoesRespondidas.map(solicitacao => renderSolicitacao(solicitacao, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};