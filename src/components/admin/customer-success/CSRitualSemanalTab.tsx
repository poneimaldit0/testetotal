import { useState, useMemo, useEffect } from 'react';
import { CSRitualSemanal, StatusIndicador, TipoFeedbackConcierge } from '@/types/customerSuccess';
import { useCSMicrotreinamentos, useCSOrientacoes, useSalvarRitualSemanal, useCSRitualSemana, useCSPlanosAcao, useChecklistSemanaZero } from '@/hooks/useCustomerSuccessCRM';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, TrendingUp, Loader2, TrendingDown, Minus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calcularIncremento } from '@/utils/calcularMetricasCS';
import { CSSemanaZeroTab } from './CSSemanaZeroTab';

interface CSRitualSemanalTabProps {
  csFornecedorId: string;
  semanaAtual: number;
  rituais: CSRitualSemanal[];
}

export function CSRitualSemanalTab({ csFornecedorId, semanaAtual, rituais }: CSRitualSemanalTabProps) {
  // Start at week 0 if semanaAtual is 0, otherwise start at semanaAtual
  const [semanaSelecionada, setSemanaSelecionada] = useState(semanaAtual >= 0 ? semanaAtual : 0);
  const { data: microtreinamentos } = useCSMicrotreinamentos();
  const { data: orientacoes } = useCSOrientacoes();
  const { data: ritualExistente } = useCSRitualSemana(csFornecedorId, semanaSelecionada);
  const { data: planosExistentes } = useCSPlanosAcao(ritualExistente?.id);
  const { data: checklistSemanaZero } = useChecklistSemanaZero(csFornecedorId);
  const salvarRitual = useSalvarRitualSemanal();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    inscricoes_orcamentos: 0,
    visitas_realizadas: 0,
    orcamentos_enviados: 0,
    contratos_fechados: 0,
    compareceu_reuniao: false,
    status_inscricoes: 'dentro' as StatusIndicador,
    status_visitas: 'dentro' as StatusIndicador,
    status_orcamentos: 'dentro' as StatusIndicador,
    status_contratos: 'dentro' as StatusIndicador,
    orientacoes_aplicadas: [] as string[],
    feedback_concierge_consultado: false,
    tipo_feedback_concierge: 'nenhum' as TipoFeedbackConcierge,
    observacao_feedback_concierge: '',
    microtreinamento_id: '',
    treinamento_aplicado: false,
    observacao_treinamento: '',
    planos_acao: ['', '', '']
  });

  // Sincronizar formData quando os dados forem carregados ou semana mudar
  useEffect(() => {
    setFormData({
      inscricoes_orcamentos: ritualExistente?.inscricoes_orcamentos || 0,
      visitas_realizadas: ritualExistente?.visitas_realizadas || 0,
      orcamentos_enviados: ritualExistente?.orcamentos_enviados || 0,
      contratos_fechados: ritualExistente?.contratos_fechados || 0,
      compareceu_reuniao: ritualExistente?.compareceu_reuniao || false,
      status_inscricoes: ritualExistente?.status_inscricoes || 'dentro',
      status_visitas: ritualExistente?.status_visitas || 'dentro',
      status_orcamentos: ritualExistente?.status_orcamentos || 'dentro',
      status_contratos: ritualExistente?.status_contratos || 'dentro',
      orientacoes_aplicadas: ritualExistente?.orientacoes_aplicadas || [],
      feedback_concierge_consultado: ritualExistente?.feedback_concierge_consultado || false,
      tipo_feedback_concierge: ritualExistente?.tipo_feedback_concierge || 'nenhum',
      observacao_feedback_concierge: ritualExistente?.observacao_feedback_concierge || '',
      microtreinamento_id: ritualExistente?.microtreinamento_id || '',
      treinamento_aplicado: ritualExistente?.treinamento_aplicado || false,
      observacao_treinamento: ritualExistente?.observacao_treinamento || '',
      planos_acao: planosExistentes?.map(p => p.descricao_acao) || ['', '', '']
    });
  }, [ritualExistente, planosExistentes]);

  // Microtreinamento selecionado para exibir descrição
  const microtreinamentoSelecionado = useMemo(() => {
    return microtreinamentos?.find(mt => mt.id === formData.microtreinamento_id);
  }, [microtreinamentos, formData.microtreinamento_id]);

  const ritualConcluido = rituais.find(r => r.semana === semanaSelecionada)?.concluido;

  const handleSalvar = async (concluir: boolean) => {
    if (!profile) return;
    await salvarRitual.mutateAsync({
      cs_fornecedor_id: csFornecedorId,
      semana: semanaSelecionada,
      formData: { ...formData, planos_acao: formData.planos_acao.filter(p => p.trim()) },
      concluir,
      userId: profile.id,
      userName: profile.nome
    });
  };

  const orientacoesPorIndicador = (indicador: string) => 
    orientacoes?.filter(o => o.indicador === indicador) || [];

  // Check if week 0 is completed
  const semanaZeroConcluida = checklistSemanaZero?.concluido;

  return (
    <div className="space-y-6">
      {/* Seletor de semana */}
      <div className="flex items-center gap-4">
        <Label>Semana:</Label>
        <Select value={String(semanaSelecionada)} onValueChange={(v) => setSemanaSelecionada(Number(v))}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">
              Semana 0 - Pré-Onboarding {semanaZeroConcluida && '✓'}
            </SelectItem>
            {Array.from({ length: Math.max(12, semanaAtual) }, (_, i) => i + 1).map(s => (
              <SelectItem key={s} value={String(s)}>
                Semana {s} {s > 12 && `(C${Math.ceil(s / 12)})`} {rituais.find(r => r.semana === s)?.concluido && '✓'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {semanaSelecionada > 0 && ritualConcluido && (
          <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Concluída</Badge>
        )}
      </div>

      {/* Render Week 0 component or regular ritual form */}
      {semanaSelecionada === 0 ? (
        <CSSemanaZeroTab csFornecedorId={csFornecedorId} />
      ) : (
        <>

      {/* Indicadores */}
      <Card>
        <CardHeader><CardTitle className="text-base">📊 Indicadores da Semana</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'inscricoes_orcamentos', label: 'Inscrições em orçamentos', status: 'status_inscricoes', indicador: 'inscricoes' },
            { key: 'visitas_realizadas', label: 'Visitas realizadas', status: 'status_visitas', indicador: 'visitas' },
            { key: 'orcamentos_enviados', label: 'Orçamentos enviados', status: 'status_orcamentos', indicador: 'orcamentos' },
            { key: 'contratos_fechados', label: 'Contratos fechados', status: 'status_contratos', indicador: 'contratos' }
          ].map(ind => {
            const campo = ind.key as 'inscricoes_orcamentos' | 'visitas_realizadas' | 'orcamentos_enviados' | 'contratos_fechados';
            const incremento = calcularIncremento(rituais, semanaSelecionada, campo);
            const valorAtual = formData[ind.key as keyof typeof formData] as number;
            const ritualAnterior = rituais.find(r => r.semana === semanaSelecionada - 1);
            const valorAnterior = ritualAnterior?.[campo] || 0;
            const incrementoCalculado = valorAtual - valorAnterior;
            
            return (
            <div key={ind.key} className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>{ind.label} <span className="text-xs text-muted-foreground">(acumulado)</span></Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={valorAtual} 
                      onChange={(e) => setFormData(p => ({ ...p, [ind.key]: Number(e.target.value) }))} disabled={ritualConcluido} />
                    {semanaSelecionada > 1 && ritualAnterior && (
                      <div className="flex items-center gap-1 min-w-[80px]">
                        {incrementoCalculado > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : incrementoCalculado < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-xs font-medium ${
                          incrementoCalculado > 0 ? 'text-green-600 dark:text-green-400' : 
                          incrementoCalculado < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                        }`}>
                          {incrementoCalculado >= 0 ? '+' : ''}{incrementoCalculado}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-40">
                  <Label>Status</Label>
                  <Select value={formData[ind.status as keyof typeof formData] as string} 
                    onValueChange={(v) => setFormData(p => ({ ...p, [ind.status]: v }))} disabled={ritualConcluido}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abaixo">⬇️ Abaixo</SelectItem>
                      <SelectItem value="dentro">✅ Dentro</SelectItem>
                      <SelectItem value="acima">⬆️ Acima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData[ind.status as keyof typeof formData] === 'abaixo' && (
                <Alert><AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-1">
                    {orientacoesPorIndicador(ind.indicador).map(o => (
                      <div key={o.id} className="flex items-center gap-2">
                        <Checkbox checked={(formData.orientacoes_aplicadas as string[]).includes(o.id)}
                          onCheckedChange={(c) => setFormData(p => ({
                            ...p, orientacoes_aplicadas: c 
                              ? [...p.orientacoes_aplicadas, o.id] 
                              : p.orientacoes_aplicadas.filter(id => id !== o.id)
                          }))} disabled={ritualConcluido} />
                        <span className="text-sm">{o.titulo}</span>
                      </div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
          })}
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.compareceu_reuniao} 
              onCheckedChange={(c) => setFormData(p => ({ ...p, compareceu_reuniao: !!c }))} disabled={ritualConcluido} />
            <Label>Fornecedor compareceu à reunião?</Label>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Concierge */}
      <Card>
        <CardHeader><CardTitle className="text-base">💬 Feedback do Concierge</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.feedback_concierge_consultado} 
              onCheckedChange={(c) => setFormData(p => ({ ...p, feedback_concierge_consultado: !!c }))} disabled={ritualConcluido} />
            <Label>Consultei o feedback do concierge</Label>
          </div>
          <Select value={formData.tipo_feedback_concierge} 
            onValueChange={(v) => setFormData(p => ({ ...p, tipo_feedback_concierge: v as TipoFeedbackConcierge }))} disabled={ritualConcluido}>
            <SelectTrigger><SelectValue placeholder="Tipo de feedback" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Nenhum</SelectItem>
              <SelectItem value="elogio">Elogio</SelectItem>
              <SelectItem value="reclamacao">Reclamação</SelectItem>
              <SelectItem value="alerta">Alerta</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Observações..." value={formData.observacao_feedback_concierge}
            onChange={(e) => setFormData(p => ({ ...p, observacao_feedback_concierge: e.target.value }))} disabled={ritualConcluido} />
        </CardContent>
      </Card>

      {/* Microtreinamento */}
      <Card>
        <CardHeader><CardTitle className="text-base">🎓 Microtreinamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Treinamento ministrado</Label>
            <Select 
              value={formData.microtreinamento_id || 'none'} 
              onValueChange={(v) => setFormData(p => ({ ...p, microtreinamento_id: v === 'none' ? '' : v }))} 
              disabled={ritualConcluido}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o treinamento ministrado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum treinamento ministrado</SelectItem>
                {microtreinamentos?.map((mt) => (
                  <SelectItem key={mt.id} value={mt.id}>
                    Semana {mt.semana}: {mt.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {microtreinamentoSelecionado?.descricao && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {microtreinamentoSelecionado.descricao}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.treinamento_aplicado} 
              onCheckedChange={(c) => setFormData(p => ({ ...p, treinamento_aplicado: !!c }))} disabled={ritualConcluido} />
            <Label>Treinamento aplicado</Label>
          </div>
          <Textarea placeholder="Observações do treinamento..." value={formData.observacao_treinamento}
            onChange={(e) => setFormData(p => ({ ...p, observacao_treinamento: e.target.value }))} disabled={ritualConcluido} />
        </CardContent>
      </Card>

      {/* Plano de Ação */}
      <Card>
        <CardHeader><CardTitle className="text-base">🎯 Plano de Ação (1-3 ações)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {formData.planos_acao.map((acao, idx) => (
            <Input key={idx} placeholder={`Ação ${idx + 1}`} value={acao}
              onChange={(e) => setFormData(p => {
                const novos = [...p.planos_acao];
                novos[idx] = e.target.value;
                return { ...p, planos_acao: novos };
              })} disabled={ritualConcluido} />
          ))}
        </CardContent>
      </Card>

      {/* Botões */}
      {!ritualConcluido && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSalvar(false)} disabled={salvarRitual.isPending}>
            {salvarRitual.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Rascunho
          </Button>
          <Button onClick={() => handleSalvar(true)} disabled={salvarRitual.isPending || !formData.feedback_concierge_consultado || formData.planos_acao.filter(p => p.trim()).length === 0}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Finalizar Semana
          </Button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
