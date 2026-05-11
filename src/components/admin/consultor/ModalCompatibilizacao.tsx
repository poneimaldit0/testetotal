import { useState, useMemo } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2, Send, Loader2, Star, TrendingUp, TrendingDown,
  Info, ChevronUp, ChevronDown, Pencil, X, AlertCircle, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CompatibilizacaoIA, EmpresaRanking } from '@/hooks/useCompatibilizacaoIA';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCORE_COR = (s: number) =>
  s >= 75 ? 'text-green-700' : s >= 50 ? 'text-yellow-700' : 'text-red-700';

const SCORE_BAR = (s: number) =>
  s >= 75 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : 'bg-red-500';

const POSICAO_CLS = (p: number): string => {
  const m: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    2: 'bg-gray-100 text-gray-700 border-gray-300',
    3: 'bg-orange-100 text-orange-800 border-orange-300',
  };
  return m[p] ?? 'bg-muted text-muted-foreground border-border';
};

function MercadoBadge({ diff }: { diff: number | null }) {
  if (diff === null) return null;
  if (diff > 10)  return <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs gap-1"><TrendingUp className="h-3 w-3" />{`+${diff.toFixed(1)}% acima`}</Badge>;
  if (diff < -10) return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs gap-1"><TrendingDown className="h-3 w-3" />{`${diff.toFixed(1)}% abaixo`}</Badge>;
  return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">Dentro do mercado</Badge>;
}

// ── Card de empresa ───────────────────────────────────────────────────────────

interface EmpresaCardProps {
  emp:           EmpresaRanking;
  recomendada:   boolean;
  // Ajuste de ranking
  editMode?:     boolean;
  posIaOriginal?: number | null;  // posição original da IA (null = sem ajuste)
  onSubir?:      () => void;
  onDescer?:     () => void;
  isFirst?:      boolean;
  isLast?:       boolean;
}

function EmpresaCard({
  emp, recomendada,
  editMode = false, posIaOriginal = null,
  onSubir, onDescer, isFirst, isLast,
}: EmpresaCardProps) {
  const foiMovida = posIaOriginal !== null && posIaOriginal !== emp.posicao;

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-all
      ${recomendada && !editMode ? 'border-green-400 bg-green-50/50' : 'border-border bg-card'}
      ${editMode ? 'border-blue-200 bg-blue-50/30' : ''}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Posição atual */}
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${POSICAO_CLS(emp.posicao)}`}>
            {emp.posicao}
          </span>
          <span className="font-semibold text-sm">{emp.empresa}</span>

          {/* Badge IA original se foi movida */}
          {foiMovida && (
            <Badge variant="outline" className="text-xs text-muted-foreground border-dashed gap-1">
              <History className="h-3 w-3" />
              IA: #{posIaOriginal}
            </Badge>
          )}

          {recomendada && !editMode && (
            <Badge className="bg-green-600 text-white text-xs gap-1">
              <Star className="h-3 w-3" /> Recomendada
            </Badge>
          )}
          <MercadoBadge diff={emp.diferenca_mercado ?? null} />
        </div>

        <div className="flex items-center gap-1">
          {/* Botões de reordenação */}
          {editMode && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={onSubir}
                disabled={isFirst}
                className="p-1 rounded hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Mover para cima"
              >
                <ChevronUp className="h-4 w-4 text-blue-600" />
              </button>
              <button
                onClick={onDescer}
                disabled={isLast}
                className="p-1 rounded hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Mover para baixo"
              >
                <ChevronDown className="h-4 w-4 text-blue-600" />
              </button>
            </div>
          )}

          {/* Score */}
          <div className="text-right ml-2">
            <p className={`text-2xl font-bold ${SCORE_COR(emp.score_composto)}`}>{emp.score_composto}</p>
            <p className="text-xs text-muted-foreground">score IA</p>
          </div>
        </div>
      </div>

      {/* Barra score composto */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Score composto</span>
          <span>{emp.score_composto}/100</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${SCORE_BAR(emp.score_composto)}`} style={{ width: `${emp.score_composto}%` }} />
        </div>
      </div>

      {/* Sub-scores */}
      {!editMode && (
        <Accordion type="single" collapsible>
          <AccordionItem value="sub" className="border-none">
            <AccordionTrigger className="text-xs text-muted-foreground py-1 hover:no-underline">
              Ver sub-scores
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-1">
                {[
                  { label: 'Qualidade (30%)', value: emp.score_qualidade },
                  { label: 'Preço (25%)',     value: emp.score_preco     },
                  { label: 'Risco (20%)',     value: emp.score_risco     },
                  { label: 'Escopo (15%)',    value: emp.score_escopo    },
                  { label: 'Clareza (10%)',   value: emp.score_clareza   },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="text-xs w-32 text-muted-foreground shrink-0">{s.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${SCORE_BAR(s.value)}`} style={{ width: `${s.value}%` }} />
                    </div>
                    <span className={`text-xs font-medium w-6 text-right ${SCORE_COR(s.value)}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Valor */}
      {emp.valor_proposta && (
        <p className="text-xs text-muted-foreground">
          Valor: <span className="font-medium text-foreground">
            {emp.valor_proposta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </p>
      )}

      {/* Pontos fortes / fracos (ocultos no editMode para compactar) */}
      {!editMode && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-xs font-medium text-green-700 mb-1">Pontos fortes</p>
            <ul className="space-y-0.5">
              {emp.pontos_fortes.map((p, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1">
                  <span className="text-green-500 shrink-0">+</span>{p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-red-700 mb-1">Pontos fracos</p>
            <ul className="space-y-0.5">
              {emp.pontos_fracos.map((p, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1">
                  <span className="text-red-400 shrink-0">-</span>{p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Justificativa */}
      {!editMode && (
        <div className="rounded bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground italic">{emp.justificativa_posicao}</p>
        </div>
      )}
    </div>
  );
}

// ── Editor de ranking ─────────────────────────────────────────────────────────

interface RankingEditorProps {
  rankingOriginalIA:  EmpresaRanking[];   // imutável — referência sempre
  rankingAtual:       EmpresaRanking[];   // pode ser ajustado anterior
  onSalvar:           (ranking: EmpresaRanking[], justificativa: string) => Promise<void>;
  onCancelar:         () => void;
}

function RankingEditor({ rankingOriginalIA, rankingAtual, onSalvar, onCancelar }: RankingEditorProps) {
  const [local,         setLocal]         = useState<EmpresaRanking[]>(() =>
    [...rankingAtual].sort((a, b) => a.posicao - b.posicao)
  );
  const [justificativa, setJustificativa] = useState('');
  const [salvando,      setSalvando]      = useState(false);

  const ordemMudou = useMemo(() => {
    const idsLocal = local.map(e => e.candidatura_id);
    const idsAtual = [...rankingAtual].sort((a, b) => a.posicao - b.posicao).map(e => e.candidatura_id);
    return idsLocal.some((id, i) => id !== idsAtual[i]);
  }, [local, rankingAtual]);

  const mover = (idx: number, dir: -1 | 1) => {
    const novo = [...local];
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
    setLocal(novo.map((e, i) => ({ ...e, posicao: i + 1 })));
  };

  const handleSalvar = async () => {
    if (!ordemMudou) { toast.info('A ordem não foi alterada.'); return; }
    if (!justificativa.trim()) { toast.error('Justificativa é obrigatória para alterar o ranking.'); return; }
    setSalvando(true);
    try {
      await onSalvar(local, justificativa);
      toast.success('Ajuste de ranking salvo.');
    } catch {
      toast.error('Erro ao salvar ajuste.');
    } finally {
      setSalvando(false);
    }
  };

  // Mapeia posição IA original por candidatura_id
  const posIaMap = useMemo(() =>
    Object.fromEntries(rankingOriginalIA.map(e => [e.candidatura_id, e.posicao])),
    [rankingOriginalIA]
  );

  return (
    <div className="space-y-3">
      {/* Banner de modo edição */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
        <Pencil className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-800">
          Use as setas para reordenar. A análise da IA permanece inalterada.
        </p>
      </div>

      {/* Cards reordenáveis */}
      {local.map((emp, idx) => (
        <EmpresaCard
          key={emp.candidatura_id}
          emp={emp}
          recomendada={false}
          editMode={true}
          posIaOriginal={posIaMap[emp.candidatura_id] ?? null}
          onSubir={() => mover(idx, -1)}
          onDescer={() => mover(idx, 1)}
          isFirst={idx === 0}
          isLast={idx === local.length - 1}
        />
      ))}

      {/* Justificativa (obrigatória se mudou) */}
      {ordemMudou && (
        <div className="space-y-1.5 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
            <label className="text-xs font-semibold text-orange-800">Justificativa obrigatória</label>
          </div>
          <Textarea
            rows={3}
            placeholder="Explique o motivo da alteração da ordem. Ex: a empresa X, apesar do score ligeiramente inferior, tem histórico comprovado de entrega no prazo que o cliente priorizou..."
            value={justificativa}
            onChange={e => setJustificativa(e.target.value)}
            className="text-sm resize-none bg-white"
          />
          <p className="text-xs text-orange-700">
            Esta justificativa fica registrada internamente. O cliente vê apenas a ordem final como "revisão técnica".
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSalvar}
          disabled={salvando || !ordemMudou || !justificativa.trim()}
          className="gap-1"
        >
          {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Salvar ajuste
        </Button>
        <Button size="sm" variant="outline" onClick={onCancelar} className="gap-1">
          <X className="h-3 w-3" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

// ── Trilha de auditoria ───────────────────────────────────────────────────────

function AuditTrail({ compat }: { compat: CompatibilizacaoIA }) {
  const { ranking_ajustado, justificativa_ajuste, ajuste_em, analise_completa: ac } = compat;
  if (!ranking_ajustado || !ac) return null;

  const idsIA     = [...ac.ranking].sort((a, b) => a.posicao - b.posicao).map(e => e.candidatura_id);
  const idsAjust  = [...ranking_ajustado].sort((a, b) => a.posicao - b.posicao).map(e => e.candidatura_id);
  const mudancas  = idsAjust.map((id, i) => {
    const posIA   = idsIA.indexOf(id) + 1;
    const posAdj  = i + 1;
    const empresa = ac.ranking.find(e => e.candidatura_id === id)?.empresa ?? id;
    return { empresa, posIA, posAdj, mudou: posIA !== posAdj };
  }).filter(m => m.mudou);

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="audit" className="border rounded-lg px-4 border-orange-200 bg-orange-50/40">
        <AccordionTrigger className="text-xs text-orange-800 hover:no-underline gap-2">
          <div className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Revisão tecnica aplicada
            {ajuste_em && (
              <span className="text-orange-600">
                — {format(new Date(ajuste_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-2 pt-1 pb-3">
          {mudancas.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-orange-900">Movimentações:</p>
              {mudancas.map(m => (
                <p key={m.empresa} className="text-xs text-orange-800">
                  {m.empresa}: #{m.posIA} → #{m.posAdj}
                </p>
              ))}
            </div>
          )}
          {justificativa_ajuste && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-orange-900">Justificativa (interna):</p>
              <p className="text-xs text-orange-800 italic leading-relaxed">{justificativa_ajuste}</p>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

interface Props {
  compat:              CompatibilizacaoIA;
  orcamentoNome:       string;
  open:                boolean;
  onClose:             () => void;
  onSalvarAjuste:      (ranking: EmpresaRanking[], justificativa: string) => Promise<void>;
  onSalvarNota:        (nota: string, ajuste: string) => Promise<void>;
  onAprovar:           () => Promise<void>;
  onMarcarEnviado:     () => Promise<void>;
}

export function ModalCompatibilizacao({
  compat, orcamentoNome, open, onClose,
  onSalvarAjuste, onSalvarNota, onAprovar, onMarcarEnviado,
}: Props) {
  const ac = compat.analise_completa;
  const [nota,       setNota]       = useState(compat.nota_consultor ?? '');
  const [ajuste,     setAjuste]     = useState(compat.ajuste_leitura ?? '');
  const [editRanking, setEditRanking] = useState(false);
  const [salvando,   setSalvando]   = useState(false);
  const [aprovando,  setAprovando]  = useState(false);
  const [enviando,   setEnviando]   = useState(false);

  const canEdit    = !['aprovado', 'enviado'].includes(compat.status);
  // COMPAT-003: 'concluida' é o estado terminal pós-bloco2 (antes era 'completed')
  const canAprovar = ['concluida', 'completed', 'pendente_revisao', 'revisado'].includes(compat.status);
  const canEnviar  = compat.status === 'aprovado';

  // Ranking ativo para exibição: ajustado > IA original
  const rankingAtivo: EmpresaRanking[] = useMemo(() => {
    const base = compat.ranking_ajustado ?? ac?.ranking ?? [];
    return [...base].sort((a, b) => a.posicao - b.posicao);
  }, [compat.ranking_ajustado, ac?.ranking]);

  const rankingIaOriginal: EmpresaRanking[] = useMemo(() =>
    [...(ac?.ranking ?? [])].sort((a, b) => a.posicao - b.posicao),
    [ac?.ranking]
  );

  const comparDims = ac ? [
    { key: 'escopo',    label: 'Escopo',    text: ac.analise_comparativa.escopo },
    { key: 'preco',     label: 'Preco',     text: ac.analise_comparativa.preco },
    { key: 'prazo',     label: 'Prazo',     text: ac.analise_comparativa.prazo },
    { key: 'risco',     label: 'Risco',     text: ac.analise_comparativa.risco },
    { key: 'materiais', label: 'Materiais', text: ac.analise_comparativa.materiais },
  ] : [];

  const handleSalvarNota = async () => {
    setSalvando(true);
    try {
      await onSalvarNota(nota, ajuste);
      toast.success('Nota salva.');
    } catch {
      toast.error('Erro ao salvar nota.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAprovar = async () => {
    setAprovando(true);
    try {
      await onAprovar();
      toast.success('Compatibilizacao aprovada para envio.');
    } catch {
      toast.error('Erro ao aprovar.');
    } finally {
      setAprovando(false);
    }
  };

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      await onMarcarEnviado();
      toast.success('Marcado como enviado ao cliente.');
    } catch {
      toast.error('Erro ao marcar como enviado.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header fixo */}
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base">{orcamentoNome}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Compatibilizacao IA — {ac?.ranking?.length ?? 0} empresas comparadas
              </SheetDescription>
            </div>
            <StatusBadge status={compat.status} />
          </div>
        </SheetHeader>

        {!ac ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {['pending', 'processando', 'compatibilizando'].includes(compat.status)
              ? 'IA processando...'
              : 'Análise não disponível.'}
          </div>
        ) : (
          <div className="px-6 py-4 space-y-6">

            {/* Recomendação geral */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Recomendacao geral</p>
              <p className="text-sm text-green-900">{ac.recomendacao_geral}</p>
              <p className="text-xs text-green-700 font-medium">{ac.justificativa_recomendacao}</p>
            </div>

            {/* Ranking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Ranking</p>
                {canEdit && !editRanking && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5 h-7"
                    onClick={() => setEditRanking(true)}
                  >
                    <Pencil className="h-3 w-3" />
                    Editar ordem
                  </Button>
                )}
              </div>

              {/* Trilha de auditoria (se houver ajuste) */}
              {compat.ranking_ajustado && !editRanking && (
                <AuditTrail compat={compat} />
              )}

              {editRanking ? (
                <RankingEditor
                  rankingOriginalIA={rankingIaOriginal}
                  rankingAtual={rankingAtivo}
                  onSalvar={async (r, j) => {
                    await onSalvarAjuste(r, j);
                    setEditRanking(false);
                  }}
                  onCancelar={() => setEditRanking(false)}
                />
              ) : (
                rankingAtivo.map((emp) => (
                  <EmpresaCard
                    key={emp.candidatura_id}
                    emp={emp}
                    recomendada={emp.candidatura_id === ac.empresa_recomendada_id}
                    posIaOriginal={
                      compat.ranking_ajustado
                        ? (rankingIaOriginal.find(e => e.candidatura_id === emp.candidatura_id)?.posicao ?? null)
                        : null
                    }
                  />
                ))
              )}
            </div>

            {/* Análise comparativa por dimensão */}
            {!editRanking && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Analise comparativa</p>
                <Tabs defaultValue="escopo">
                  <TabsList className="flex-wrap h-auto gap-1">
                    {comparDims.map((d) => (
                      <TabsTrigger key={d.key} value={d.key} className="text-xs">{d.label}</TabsTrigger>
                    ))}
                  </TabsList>
                  {comparDims.map((d) => (
                    <TabsContent key={d.key} value={d.key}>
                      <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed mt-2">
                        {d.text}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {/* Metodologia */}
            {!editRanking && (
              <Accordion type="single" collapsible>
                <AccordionItem value="met" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline gap-2">
                    <Info className="h-3 w-3" /> Metodologia de score
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ac.metodologia}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {!editRanking && <Separator />}

            {/* Camada do consultor */}
            {!editRanking && (
              <div className="space-y-4">
                <p className="text-sm font-semibold">Revisao do consultor</p>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Nota interna</label>
                  <Textarea
                    rows={3}
                    placeholder="Observacoes tecnicas para o time..."
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    disabled={!canEdit}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Ajuste de leitura para o cliente</label>
                  <Textarea
                    rows={3}
                    placeholder="Ex: destacar prazo diferenciado da empresa X..."
                    value={ajuste}
                    onChange={(e) => setAjuste(e.target.value)}
                    disabled={!canEdit}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={handleSalvarNota} disabled={salvando}>
                      {salvando ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Salvar nota
                    </Button>
                  )}
                  {canAprovar && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      onClick={handleAprovar}
                      disabled={aprovando}
                    >
                      {aprovando ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Aprovar para envio
                    </Button>
                  )}
                  {canEnviar && (
                    <Button size="sm" className="gap-1" onClick={handleEnviar} disabled={enviando}>
                      {enviando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Marcar como enviado
                    </Button>
                  )}
                </div>

                {compat.aprovado_em && (
                  <p className="text-xs text-muted-foreground">
                    Aprovado em {format(new Date(compat.aprovado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Badge de status ───────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    // Legado
    pending:          { label: 'Processando',     cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    completed:        { label: 'Pronta',           cls: 'bg-blue-100 text-blue-800 border-blue-300' },
    failed:           { label: 'Falha',            cls: 'bg-red-100 text-red-800 border-red-300' },
    // Canônicos
    processando:      { label: 'Processando',     cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    compatibilizando: { label: 'Compatibilizando', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
    concluida:        { label: 'Pronta',           cls: 'bg-blue-100 text-blue-800 border-blue-300' },
    erro:             { label: 'Erro',             cls: 'bg-red-100 text-red-800 border-red-300' },
    cancelada:        { label: 'Cancelada',        cls: 'bg-slate-100 text-slate-700 border-slate-300' },
    // Workflow consultor
    pendente_revisao: { label: 'Pend. revisão',   cls: 'bg-orange-100 text-orange-800 border-orange-300' },
    revisado:         { label: 'Revisado',         cls: 'bg-purple-100 text-purple-800 border-purple-300' },
    aprovado:         { label: 'Aprovado',         cls: 'bg-green-100 text-green-800 border-green-300' },
    enviado:          { label: 'Enviado',          cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={`text-xs ${s.cls}`}>{s.label}</Badge>;
}
