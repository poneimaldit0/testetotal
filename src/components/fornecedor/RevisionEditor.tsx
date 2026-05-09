import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Edit, CheckCircle, ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChecklistProposta, ChecklistPropostaRef } from './ChecklistProposta';
import { useRevisoesWorkflow } from '@/hooks/useRevisoesWorkflow';
import { EmergencyRecoveryModal } from './EmergencyRecoveryModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RevisaoDetalhada {
  id: string;
  checklist_proposta_id: string;
  motivo_revisao: string;
  cliente_temp_email: string;
  status: string;
  data_solicitacao: string;
  candidatura_id: string;
  orcamento_id: string;
  necessidade: string;
  local: string;
}

export const RevisionEditor: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const revisaoId = searchParams.get('revisao_id');
  const candidaturaId = searchParams.get('candidatura_id');
  const orcamentoId = searchParams.get('orcamento_id');
  
  const [revisaoDetalhes, setRevisaoDetalhes] = useState<RevisaoDetalhada | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [valorTotalProposta, setValorTotalProposta] = useState(0);
  const [finalizandoRevisao, setFinalizandoRevisao] = useState(false);
  const { finalizarRevisao } = useRevisoesWorkflow();
  const { toast } = useToast();
  
  // Ref para o componente ChecklistProposta
  const checklistRef = React.useRef<ChecklistPropostaRef>(null);

  useEffect(() => {
    if (revisaoId) {
      carregarDetalhesRevisao();
    }
  }, [revisaoId]);

  const carregarDetalhesRevisao = async () => {
    if (!revisaoId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('revisoes_propostas_clientes')
        .select(`
          *,
          checklist_propostas!inner(
            candidatura_id,
            candidaturas_fornecedores!inner(
              orcamento_id,
              orcamentos(necessidade, local)
            )
          )
        `)
        .eq('id', revisaoId)
        .single();

      if (error) throw error;

      if (data) {
        // VALIDAÇÃO: Verificar se revisão já foi concluída
        if (data.status === 'concluida') {
          toast({
            title: "Revisão já concluída",
            description: "Esta revisão já foi finalizada e não pode mais ser editada.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setRevisaoDetalhes({
          ...data,
          candidatura_id: data.checklist_propostas.candidatura_id,
          orcamento_id: data.checklist_propostas.candidaturas_fornecedores.orcamento_id,
          necessidade: data.checklist_propostas.candidaturas_fornecedores.orcamentos.necessidade,
          local: data.checklist_propostas.candidaturas_fornecedores.orcamentos.local
        });
      }
      
    } catch (error) {
      console.error('Erro ao carregar detalhes da revisão:', error);
      toast({
        title: "Erro ao carregar revisão",
        description: "Não foi possível carregar os detalhes da revisão.",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarRevisao = async () => {
    if (!revisaoDetalhes) return;
    
    try {
      setFinalizandoRevisao(true);
      
      console.log('=== FINALIZANDO REVISÃO WORKFLOW ===');
      console.log('🔧 checklistPropostaId:', revisaoDetalhes.checklist_proposta_id);

      // PASSO 1: Garantir salvamento completo de toda a proposta
      const onSalvarAntes = async () => {
        if (checklistRef.current?.salvarProposta) {
          console.log('💾 Salvando toda a proposta preenchida...');
          await checklistRef.current.salvarProposta();
          console.log('✅ Proposta completa salva com sucesso');
          
          // Verificar se salvamento foi bem sucedido
          const { data: propostaAtualizada } = await supabase
            .from('checklist_propostas')
            .select('valor_total_estimado, status')
            .eq('id', revisaoDetalhes.checklist_proposta_id)
            .single();
            
          console.log('📊 Valor total da proposta salva:', propostaAtualizada?.valor_total_estimado);
        } else {
          throw new Error('Erro: Sistema de salvamento não disponível');
        }
      };
      
      console.log('🚀 Finalizando revisão e atualizando comparador...');
      await finalizarRevisao(revisaoDetalhes.checklist_proposta_id, onSalvarAntes);
      
      toast({
        title: "✅ Revisão Finalizada com Sucesso!",
        description: "Sua proposta foi salva e está disponível no comparador com status 'Revisada'",
      });
      
      // Aguardar feedback visual antes de redirecionar
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Erro na finalização da revisão:', error);
      
      // Verificar se é erro de recuperação necessária
      if (error.message && error.message.startsWith('RECOVERY_NEEDED:')) {
        const errorData = JSON.parse(error.message.replace('RECOVERY_NEEDED:', ''));
        setValorTotalProposta(errorData.valorTotal || 0);
        setShowRecoveryModal(true);
      } else {
        // Erro genérico - mostrar detalhes específicos
        const errorMessage = error.message || "Não foi possível salvar e finalizar a revisão";
        
        toast({
          title: "Erro ao finalizar revisão",
          description: `${errorMessage}. Verifique o console do navegador para mais detalhes.`,
          variant: "destructive",
          duration: 8000, // 8 segundos para dar tempo de ler
        });
        
        // Log detalhado do erro
        console.error('💥 [RevisionEditor] Detalhes completos do erro:', {
          message: error.message,
          stack: error.stack,
          revisaoId,
          candidaturaId,
          orcamentoId,
          checklistPropostaId: revisaoDetalhes.checklist_proposta_id
        });
      }
    } finally {
      setFinalizandoRevisao(false);
    }
  };

  const handleVoltar = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!revisaoDetalhes || !candidaturaId || !orcamentoId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Revisão não encontrada
          </CardTitle>
          <CardDescription>
            A revisão solicitada não foi encontrada ou não possui dados válidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleVoltar} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Meus Orçamentos
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header da Revisão */}
      <Card className="border-warning/20 bg-warning/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button onClick={handleVoltar} variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Badge variant="outline" className="border-warning text-warning">
                  <Edit className="w-3 h-3 mr-1" />
                  Revisão em Andamento
                </Badge>
              </div>
              <CardTitle className="text-xl">
                {revisaoDetalhes.necessidade}
              </CardTitle>
              <CardDescription className="text-base">
                <strong>Local:</strong> {revisaoDetalhes.local}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Alert className="border-warning/20 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>Motivo da Revisão:</strong></p>
                <p className="text-sm bg-background/50 p-3 rounded-md border">
                  {revisaoDetalhes.motivo_revisao}
                </p>
                <p className="text-xs text-muted-foreground">
                  Solicitado por: {revisaoDetalhes.cliente_temp_email} • {new Date(revisaoDetalhes.data_solicitacao).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Editor da Proposta */}
      <div id="proposta-editor">
        <ChecklistProposta 
          ref={checklistRef}
          orcamentoId={orcamentoId}
          candidaturaId={candidaturaId}
          readonly={false}
          isRevisionMode={true}
        />
      </div>

      {/* Seção de Finalização - Botão Único no Final da Página */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">
                Finalizar Revisão
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ao clicar neste botão, todo o conteúdo da sua proposta (itens do checklist, valores, forma de pagamento e observações) será salvo automaticamente e a revisão será finalizada. Sua proposta revisada aparecerá no comparador do cliente com a tag "Revisada".
              </p>
            </div>
            
            <Button 
              onClick={handleFinalizarRevisao}
              disabled={finalizandoRevisao}
              size="lg"
              className="w-full max-w-md bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-6 disabled:opacity-50"
            >
              {finalizandoRevisao ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Salvar e Finalizar Revisão
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              ✅ Após finalizar, toda a proposta será salva e a revisão marcada como concluída. Sua proposta atualizada aparecerá automaticamente no comparador com a tag "Revisada"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Recuperação Emergencial */}
      <EmergencyRecoveryModal
        open={showRecoveryModal}
        onOpenChange={setShowRecoveryModal}
        checklistPropostaId={revisaoDetalhes?.checklist_proposta_id || ''}
        valorTotal={valorTotalProposta}
        candidaturaId={candidaturaId || ''}
        orcamentoId={orcamentoId || ''}
      />
    </div>
  );
};