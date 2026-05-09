import React, { useState, useEffect } from 'react';
import { AlertTriangle, Edit, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRevisoesWorkflow } from '@/hooks/useRevisoesWorkflow';

export const RevisionWorkflow: React.FC = () => {
  const { 
    revisoesPendentes, 
    loading, 
    iniciarRevisao, 
    finalizarRevisao 
  } = useRevisoesWorkflow();
  
  const [revisoesConcluidas, setRevisoesConcluidas] = useState([]);
  const [loadingConcluidas, setLoadingConcluidas] = useState(false);

  const carregarRevisoesConcluidas = async () => {
    try {
      setLoadingConcluidas(true);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      const { data, error } = await supabase
        .from('revisoes_propostas_clientes')
        .select(`
          *,
          checklist_propostas!inner(
            candidatura_id,
            status,
            candidaturas_fornecedores!inner(
              fornecedor_id,
              orcamento_id,
              orcamentos(id, necessidade, local)
            )
          )
        `)
        .eq('status', 'concluida')
        .eq('checklist_propostas.candidaturas_fornecedores.fornecedor_id', user.user.id)
        .order('data_resposta', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      const revisoes = (data || []).map(revisao => ({
        ...revisao,
        proposta: {
          candidatura_id: revisao.checklist_propostas.candidatura_id,
          status: revisao.checklist_propostas.status,
          orcamento_id: revisao.checklist_propostas.candidaturas_fornecedores.orcamento_id,
          orcamento: revisao.checklist_propostas.candidaturas_fornecedores.orcamentos
        }
      }));

      setRevisoesConcluidas(revisoes);
      
    } catch (error) {
      console.error('Erro ao carregar revisões concluídas:', error);
    } finally {
      setLoadingConcluidas(false);
    }
  };

  useEffect(() => {
    carregarRevisoesConcluidas();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (revisoesPendentes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Nenhuma Revisão Pendente
          </CardTitle>
          <CardDescription>
            Todas as suas propostas estão em dia! Continue acompanhando suas notificações.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold">Revisões Solicitadas</h3>
        <Badge variant="secondary">
          {revisoesPendentes.length}
        </Badge>
      </div>

      {revisoesPendentes.map((revisao) => (
        <Card key={revisao.id} className="border-warning/20 bg-warning/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  {revisao.proposta.orcamento?.necessidade}
                </CardTitle>
                <CardDescription>
                  {revisao.proposta.orcamento?.local}
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-warning text-warning">
                {revisao.status === 'em_andamento' ? 'Em Andamento' : 'Revisão Solicitada'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Motivo da Revisão:</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  {revisao.motivo_revisao}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Solicitado pelo cliente: {revisao.cliente_temp_email}
              </div>

              <Separator />

              <div className="flex gap-2">
                {revisao.status === 'em_andamento' ? (
                  <Button 
                    onClick={() => finalizarRevisao(revisao.checklist_proposta_id)}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalizar Revisão
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      iniciarRevisao(revisao.id, revisao.checklist_proposta_id);
                      // Navegar para o editor de revisão
                      window.location.href = `/fornecedor/revisao?revisao_id=${revisao.id}&candidatura_id=${revisao.proposta.candidatura_id}&orcamento_id=${revisao.proposta.orcamento_id || ''}`;
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Iniciar Revisão
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Seção de Revisões Concluídas */}
      {revisoesConcluidas.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <h3 className="text-lg font-semibold">Revisões Concluídas</h3>
            <Badge variant="secondary">
              {revisoesConcluidas.length}
            </Badge>
          </div>

          {revisoesConcluidas.map((revisao) => (
            <Card key={revisao.id} className="border-success/20 bg-success/5">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {revisao.proposta.orcamento?.necessidade}
                    </CardTitle>
                    <CardDescription>
                      {revisao.proposta.orcamento?.local}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-success text-success">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Concluída
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Motivo da Revisão:</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                      {revisao.motivo_revisao}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Finalizada em: {new Date(revisao.data_resposta).toLocaleDateString('pt-BR')}
                  </div>

                  <div className="text-sm text-success font-medium">
                    ✅ Revisão concluída - Proposta disponível no comparador
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};