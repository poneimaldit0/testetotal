import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, User, Building2, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePenalidadesFornecedor, TIPOS_PENALIDADE } from '@/hooks/usePenalidadesFornecedor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DesistenciaComDados {
  id: string;
  candidaturaId: string;
  motivoCategoria: string;
  justificativa: string;
  dataHora: Date;
  aprovada?: boolean;
  orcamentoInfo?: {
    necessidade: string;
    codigo: string;
  };
  fornecedorInfo?: {
    nome: string;
    email: string;
    empresa: string;
  };
}

interface AvaliarDesistenciaModalProps {
  desistencia: DesistenciaComDados | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AvaliarDesistenciaModal = ({ 
  desistencia, 
  open, 
  onOpenChange, 
  onSuccess 
}: AvaliarDesistenciaModalProps) => {
  const { toast } = useToast();
  const { aplicarPenalidade: aplicarPenalidadeHook, loading: loadingPenalidade } = usePenalidadesFornecedor();
  const [observacoes, setObservacoes] = useState('');
  const [aplicarPenalidade, setAplicarPenalidade] = useState(false);
  const [tipoPenalidade, setTipoPenalidade] = useState<string>('');
  const [duracaoPenalidade, setDuracaoPenalidade] = useState<number>(7);
  const [observacoesPenalidade, setObservacoesPenalidade] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setObservacoes('');
    setAplicarPenalidade(false);
    setTipoPenalidade('');
    setDuracaoPenalidade(7);
    setObservacoesPenalidade('');
    onOpenChange(false);
  };

  const handleDecisao = async (aprovar: boolean) => {
    if (!desistencia) return;

    if (!observacoes.trim()) {
      toast({
        title: "Observações obrigatórias",
        description: "Por favor, adicione observações sobre sua decisão",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Se aprovando e deve aplicar penalidade, aplicar primeiro
      if (aprovar && aplicarPenalidade && tipoPenalidade) {
        // Buscar fornecedor_id da desistência
        const { data: desistenciaData, error: desistenciaError } = await supabase
          .from('desistencias_propostas')
          .select('fornecedor_id')
          .eq('id', desistencia.id)
          .single();

        if (desistenciaError || !desistenciaData) {
          toast({
            title: "Erro",
            description: "Erro ao buscar dados da desistência",
            variant: "destructive"
          });
          return;
        }

        const penalidadeAplicada = await aplicarPenalidadeHook(
          desistenciaData.fornecedor_id,
          desistencia.id,
          tipoPenalidade,
          duracaoPenalidade,
          observacoesPenalidade
        );

        if (!penalidadeAplicada) {
          toast({
            title: "Erro",
            description: "Erro ao aplicar penalidade. Tente novamente.",
            variant: "destructive"
          });
          return;
        }
      }

      // Atualizar a desistência
      const { error: updateError } = await supabase
        .from('desistencias_propostas')
        .update({
          aprovada: aprovar,
          data_aprovacao: new Date().toISOString(),
          observacoes_admin: observacoes,
          penalidade_aplicada: aplicarPenalidade && aprovar
        })
        .eq('id', desistencia.id);

      if (updateError) {
        throw updateError;
      }

      // Se aprovada, atualizar a candidatura
      if (aprovar) {
        const { error: candidaturaError } = await supabase
          .from('candidaturas_fornecedores')
          .update({
            data_desistencia: new Date().toISOString(),
            desistencia_aprovada: true,
            penalidade_aplicada: aplicarPenalidade
          })
          .eq('id', desistencia.candidaturaId);

        if (candidaturaError) {
          throw candidaturaError;
        }
      }

      toast({
        title: aprovar ? "Desistência aprovada" : "Desistência rejeitada",
        description: `A solicitação foi ${aprovar ? 'aprovada' : 'rejeitada'} com sucesso${aplicarPenalidade && aprovar ? ' com penalidade aplicada' : ''}`
      });

      onSuccess();
      handleClose();

    } catch (error) {
      console.error('Erro ao avaliar desistência:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a decisão. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!desistencia) return null;

  const isReadOnly = desistencia.aprovada !== undefined;
  const isLoadingAny = loading || loadingPenalidade;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>
              {isReadOnly ? 'Detalhes da Desistência' : 'Avaliar Solicitação de Desistência'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status atual */}
          {isReadOnly && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={desistencia.aprovada ? "default" : "destructive"}>
                    {desistencia.aprovada ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovada
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejeitada
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações do fornecedor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Informações do Fornecedor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Nome:</span>
                <span className="ml-2">{desistencia.fornecedorInfo?.nome || 'Não disponível'}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Email:</span>
                <span className="ml-2">{desistencia.fornecedorInfo?.email || 'Não disponível'}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Empresa:</span>
                <span className="ml-2">{desistencia.fornecedorInfo?.empresa || 'Não disponível'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Informações do orçamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Informações do Orçamento</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Código:</span>
                <span className="ml-2">{desistencia.orcamentoInfo?.codigo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Necessidade:</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  {desistencia.orcamentoInfo?.necessidade || 'Descrição não disponível'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes da solicitação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Detalhes da Solicitação</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm font-medium">Data da solicitação:</span>
                <span className="ml-2">
                  {format(desistencia.dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              <div>
                <span className="text-sm font-medium">Motivo:</span>
                <div className="mt-1">
                  <Badge variant="outline">
                    {desistencia.motivoCategoria.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Justificativa:</span>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm">{desistencia.justificativa}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção de avaliação (apenas se não foi avaliada) */}
          {!isReadOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Avaliação Administrativa</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Observações (obrigatório):
                  </label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Descreva os motivos da sua decisão..."
                    className="min-h-[100px]"
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="aplicar-penalidade"
                      checked={aplicarPenalidade}
                      onCheckedChange={(checked) => setAplicarPenalidade(checked === true)}
                      disabled={isLoadingAny}
                    />
                    <label
                      htmlFor="aplicar-penalidade"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Aplicar penalidade ao fornecedor
                    </label>
                  </div>

                  {aplicarPenalidade && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="tipo-penalidade">Tipo de Penalidade</Label>
                          <Select
                            value={tipoPenalidade}
                            onValueChange={setTipoPenalidade}
                            disabled={isLoadingAny}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_PENALIDADE.map((tipo) => (
                                <SelectItem key={tipo.value} value={tipo.value}>
                                  <div>
                                    <div className="font-medium">{tipo.label}</div>
                                    <div className="text-xs text-muted-foreground">{tipo.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="duracao-penalidade">Duração (dias)</Label>
                          <Input
                            id="duracao-penalidade"
                            type="number"
                            min="1"
                            max="365"
                            value={duracaoPenalidade}
                            onChange={(e) => setDuracaoPenalidade(parseInt(e.target.value) || 7)}
                            disabled={isLoadingAny}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="observacoes-penalidade">Observações da Penalidade</Label>
                        <Textarea
                          id="observacoes-penalidade"
                          placeholder="Motivo específico da penalidade..."
                          value={observacoesPenalidade}
                          onChange={(e) => setObservacoesPenalidade(e.target.value)}
                          disabled={isLoadingAny}
                          className="min-h-[60px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoadingAny}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDecisao(false)}
                    disabled={isLoadingAny}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    onClick={() => handleDecisao(true)}
                    disabled={isLoadingAny || (aplicarPenalidade && !tipoPenalidade)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};