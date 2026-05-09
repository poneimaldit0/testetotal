import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, User, Building2, MessageSquare, CheckCircle, Send, RefreshCw } from 'lucide-react';
import { useSolicitacoesAjuda } from '@/hooks/useSolicitacoesAjuda';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FilaSolicitacoesAjuda = () => {
  const { solicitacoes, loading, recarregar } = useSolicitacoesAjuda();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviandoResposta, setEnviandoResposta] = useState<string | null>(null);

  const pendentes = solicitacoes.filter(s => !s.respondida);
  const respondidas = solicitacoes.filter(s => s.respondida);

  const handleResponder = async (solicitacaoId: string) => {
    const resposta = respostas[solicitacaoId]?.trim();
    
    if (!resposta) {
      toast({
        title: "Resposta obrigatória",
        description: "Por favor, digite uma resposta antes de enviar",
        variant: "destructive"
      });
      return;
    }

    try {
      setEnviandoResposta(solicitacaoId);

      const { error } = await supabase
        .from('solicitacoes_ajuda')
        .update({
          respondida: true,
          resposta_admin: resposta,
          data_resposta: new Date().toISOString()
        })
        .eq('id', solicitacaoId);

      if (error) {
        throw error;
      }

      toast({
        title: "Resposta enviada",
        description: "A resposta foi enviada com sucesso ao fornecedor"
      });

      // Limpar a resposta e recarregar dados
      setRespostas(prev => ({ ...prev, [solicitacaoId]: '' }));
      setExpandedId(null);
      recarregar();

    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar resposta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setEnviandoResposta(null);
    }
  };

  const renderSolicitacao = (solicitacao: any, isPendente: boolean) => (
    <TableRow key={solicitacao.id}>
      <TableCell>
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{solicitacao.fornecedorInfo?.nome || 'Nome não disponível'}</p>
            <p className="text-sm text-muted-foreground">{solicitacao.fornecedorInfo?.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{solicitacao.orcamentoInfo?.codigo || 'N/A'}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {solicitacao.orcamentoInfo?.necessidade || 'Descrição não disponível'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-xs">
          <p className="text-sm line-clamp-3">{solicitacao.mensagem}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {format(solicitacao.dataHora, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {isPendente ? (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        ) : (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Respondida
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant={expandedId === solicitacao.id ? "default" : "outline"}
          onClick={() => setExpandedId(expandedId === solicitacao.id ? null : solicitacao.id)}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          {isPendente ? 'Responder' : 'Ver Conversa'}
        </Button>
      </TableCell>
    </TableRow>
  );

  const renderRespostaSection = (solicitacao: any) => {
    if (expandedId !== solicitacao.id) return null;

    return (
      <TableRow>
        <TableCell colSpan={6}>
          <Card className="mt-2">
            <CardHeader>
              <CardTitle className="text-sm">
                {solicitacao.respondida ? 'Conversa Completa' : 'Responder Solicitação'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mensagem original */}
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Mensagem do fornecedor:</p>
                <p className="text-sm">{solicitacao.mensagem}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(solicitacao.dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Resposta admin (se existir) */}
              {solicitacao.respostaAdmin && (
                <div className="bg-primary/10 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Sua resposta:</p>
                  <p className="text-sm">{solicitacao.respostaAdmin}</p>
                  {solicitacao.dataResposta && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Respondida em {format(solicitacao.dataResposta, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}

              {/* Campo de resposta (apenas para pendentes) */}
              {!solicitacao.respondida && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Digite sua resposta para o fornecedor..."
                    value={respostas[solicitacao.id] || ''}
                    onChange={(e) => setRespostas(prev => ({ 
                      ...prev, 
                      [solicitacao.id]: e.target.value 
                    }))}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResponder(solicitacao.id)}
                      disabled={enviandoResposta === solicitacao.id}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {enviandoResposta === solicitacao.id ? (
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-1" />
                      )}
                      Enviar Resposta
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando solicitações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Solicitações de Ajuda</h2>
        <Button onClick={recarregar} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{pendentes.length}</p>
                <p className="text-sm text-muted-foreground">Pendentes de Resposta</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{respondidas.length}</p>
                <p className="text-sm text-muted-foreground">Respondidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Ajuda</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendentes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pendentes" className="relative">
                Pendentes
                {pendentes.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white text-xs">
                    {pendentes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="respondidas">Respondidas</TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="mt-4">
              {pendentes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">Nenhuma solicitação pendente</p>
                  <p className="text-muted-foreground">Todas as solicitações foram respondidas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Orçamento</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendentes.map((solicitacao) => (
                      <React.Fragment key={solicitacao.id}>
                        {renderSolicitacao(solicitacao, true)}
                        {renderRespostaSection(solicitacao)}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="respondidas" className="mt-4">
              {respondidas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma solicitação respondida</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Orçamento</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {respondidas.map((solicitacao) => (
                      <React.Fragment key={solicitacao.id}>
                        {renderSolicitacao(solicitacao, false)}
                        {renderRespostaSection(solicitacao)}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};