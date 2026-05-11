import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, BarChart2, AlertCircle, CheckCircle2, Send,
  ChevronUp, ChevronDown, History, Star, TrendingUp, TrendingDown,
  Pencil, X, Info, ShieldCheck, ShieldAlert, ThumbsUp, ThumbsDown,
  ExternalLink, RefreshCw, Plus, Upload, FileText, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompatibilizacaoIA, type EmpresaRanking, type CompatibilizacaoCompleta, type DecisaoEstrategica } from '@/hooks/useCompatibilizacaoIA';
import { StatusBadge } from './ModalCompatibilizacao';
import { gerarHtmlCompatibilizacao } from '@/utils/gerarHtmlCompatibilizacao';
import { EstimativaTecnicaCard } from './EstimativaTecnicaCard';

// ── Tipos internos ────────────────────────────────────────────────────────────

interface OrcamentoResumo {
  id:            string;
  nome_contato?: string | null;
  necessidade?:  string | null;
}

interface CandidaturaResumo {
  id:                    string;
  empresa:               string;
  temProposta:           boolean;
  statusAnalise:         string | null;
  valorProposta:         number | null;
  qualidadeLeitura:      string | null;
  compatibilidadeEscopo: string | null;
  tipoProposta:          string | null;
  analiseCreatedAt:      string | null;
}

type MotivoIgnorado =
  | 'removida_manualmente'
  | 'sem_valor'
  | 'analise_incompleta'
  | 'cancelada'
  | 'falhou'
  | 'sem_analise'
  | 'pendente'
  | 'escopo_incompativel';

const MOTIVO_LABEL: Record<MotivoIgnorado, string> = {
  removida_manualmente: 'removida desta análise',
  sem_valor:            'sem valor declarado',
  analise_incompleta:   'proposta incompleta',
  cancelada:            'análise cancelada',
  falhou:               'análise falhou',
  sem_analise:          'sem análise disponível',
  pendente:             'análise em andamento',
  escopo_incompativel:  'escopo incompatível com o orçamento principal',
};

function classificarCandidatura(
  c: CandidaturaResumo,
  excluidos: Set<string>,
): { valida: boolean; motivo?: MotivoIgnorado } {
  if (excluidos.has(c.id))                             return { valida: false, motivo: 'removida_manualmente' };
  if (!c.statusAnalise)                                return { valida: false, motivo: 'sem_analise' };
  if (c.statusAnalise === 'pending')                   return { valida: false, motivo: 'pendente' };
  if (c.statusAnalise === 'cancelada')                                                      return { valida: false, motivo: 'cancelada' };
  if (c.statusAnalise === 'invalid')                                                        return { valida: false, motivo: 'sem_valor' };
  if (c.statusAnalise === 'failed' && c.qualidadeLeitura === 'proposta_incompleta')       return { valida: false, motivo: 'sem_valor' };
  if (c.statusAnalise === 'failed')                                                        return { valida: false, motivo: 'falhou' };
  if (c.qualidadeLeitura === 'proposta_incompleta')                                        return { valida: false, motivo: 'analise_incompleta' };
  if (c.compatibilidadeEscopo === 'incompativel')                                          return { valida: false, motivo: 'escopo_incompativel' };
  if (c.tipoProposta === 'projeto_arquitetonico')                                          return { valida: false, motivo: 'escopo_incompativel' };
  if (!c.valorProposta)                                return { valida: false, motivo: 'sem_valor' };
  return { valida: true };
}

// ── Helpers visuais ───────────────────────────────────────────────────────────

const SCORE_COR  = (s: number) => s >= 75 ? 'text-green-700' : s >= 50 ? 'text-yellow-700' : 'text-red-700';
const SCORE_BAR  = (s: number) => s >= 75 ? 'bg-green-500'  : s >= 50 ? 'bg-yellow-500'  : 'bg-red-500';
const POS_CLS    = (p: number): string => ({
  1: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  2: 'bg-gray-100 text-gray-700 border-gray-300',
  3: 'bg-orange-100 text-orange-800 border-orange-300',
}[p] ?? 'bg-muted text-muted-foreground border-border');

function MercadoBadge({ diff }: { diff: number | null | undefined }) {
  if (diff == null) return null;
  if (diff >  10) return <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs gap-1"><TrendingUp className="h-3 w-3" />+{diff.toFixed(1)}% acima</Badge>;
  if (diff < -10) return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs gap-1"><TrendingDown className="h-3 w-3" />{diff.toFixed(1)}% abaixo</Badge>;
  return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs gap-1"><ShieldCheck className="h-3 w-3" />Dentro do mercado</Badge>;
}

const scorePorDim = (emp: EmpresaRanking, key: string): number => {
  const map: Record<string, number | undefined> = {
    escopo:    emp.score_escopo,
    preco:     emp.score_preco,
    prazo:     emp.score_clareza,
    risco:     emp.score_risco,
    materiais: emp.score_escopo,
  };
  return map[key] ?? emp.score_composto;
};

type DimStatus = 'ok' | 'atencao' | 'critico' | 'sem_dados';

function detectDimStatus(text: string): DimStatus {
  if (!text?.trim()) return 'sem_dados';
  const t = text.toLowerCase();
  if (t.includes('risco alto') || t.includes('crítico') || t.includes('preocupante') || t.includes('grave')) return 'critico';
  if (t.includes('atenção') || t.includes('cuidado') || t.includes('verificar') || t.includes('alerta')) return 'atencao';
  return 'ok';
}

function DimStatusBadge({ status }: { status: DimStatus }) {
  if (status === 'critico')   return <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs gap-1"><ShieldAlert className="h-3 w-3" />crítico</Badge>;
  if (status === 'atencao')   return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs gap-1"><AlertCircle className="h-3 w-3" />atenção</Badge>;
  if (status === 'sem_dados') return <Badge variant="outline" className="text-gray-400 border-gray-200 text-xs">sem dados</Badge>;
  return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />ok</Badge>;
}

// ── PriceBarChart (Isabella vchart style) ────────────────────────────────────

const CHART_CORES = ['#2D3395', '#F7A226', '#1B7A4A', '#8B2252', '#0D7377', '#B5451B'];

function PriceBarChart({ ranking }: { ranking: EmpresaRanking[] }) {
  const withValue = ranking.filter(e => e.valor_proposta != null);
  if (withValue.length < 1) return null;

  const refVals = withValue
    .filter(e => e.diferenca_mercado != null)
    .map(e => e.valor_proposta! / (1 + e.diferenca_mercado! / 100));
  const mercadoMedio = refVals.length
    ? Math.round(refVals.reduce((a, b) => a + b, 0) / refVals.length)
    : null;
  const mercadoAlto = mercadoMedio ? Math.round(mercadoMedio * 1.30) : null;

  const data: { name: string; value: number; color: string; isRef: boolean }[] = [
    ...withValue.map((e, i) => ({
      name:  e.empresa.split(/[\s(]/)[0].slice(0, 12),
      value: e.valor_proposta!,
      color: CHART_CORES[i] ?? '#2D3395',
      isRef: false,
    })),
    ...(mercadoMedio != null ? [{ name: 'Mercado Médio', value: mercadoMedio, color: '#9CA3AF', isRef: true }] : []),
    ...(mercadoAlto  != null ? [{ name: 'Alto Padrão',   value: mercadoAlto,  color: '#A78BFA', isRef: true }] : []),
  ];

  const maxVal = Math.max(...data.map(d => d.value));
  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '18px 18px 12px', boxShadow: '0 1px 6px rgba(0,0,0,.07)', marginBottom: 4 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#2D3395', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <BarChart2 style={{ width: 13, height: 13 }} />
        Comparativo de valores
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '0 4px', position: 'relative' }}>
        {data.map((d, i) => {
          const h = Math.max(4, Math.round((d.value / maxVal) * 100));
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%' }}>
              <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 4, whiteSpace: 'nowrap', textAlign: 'center', color: '#374151' }}>{fmt(d.value)}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div style={{ width: '100%', borderRadius: '5px 5px 0 0', background: d.color, opacity: d.isRef ? 0.6 : 1, height: `${h}%`, transition: 'height .8s cubic-bezier(.25,.46,.45,.94)' }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#444', textAlign: 'center', marginTop: 7, lineHeight: 1.3, padding: '0 2px', wordBreak: 'break-word' as const }}>{d.name}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
        {data.map((d, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#555' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block', opacity: d.isRef ? 0.6 : 1 }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── DecisaoEstrategicaCard ────────────────────────────────────────────────────

const CONFIANCA_CFG = {
  alta:  { label: 'Confiança Alta',  cls: 'border-green-400 bg-green-50/60',  badge: 'bg-green-600 text-white' },
  media: { label: 'Confiança Média', cls: 'border-yellow-400 bg-yellow-50/60', badge: 'bg-yellow-500 text-white' },
  baixa: { label: 'Confiança Baixa', cls: 'border-red-400 bg-red-50/60',      badge: 'bg-red-600 text-white'   },
};

const TIPO_CFG = {
  forte:       { label: 'Recomendação Forte',       cls: 'text-green-700'  },
  moderada:    { label: 'Recomendação Moderada',     cls: 'text-yellow-700' },
  condicional: { label: 'Recomendação Condicional',  cls: 'text-orange-700' },
};

function DecisaoEstrategicaCard({ decisao }: { decisao: DecisaoEstrategica }) {
  const conf = CONFIANCA_CFG[decisao.nivel_confianca] ?? CONFIANCA_CFG.media;
  const tipo = TIPO_CFG[decisao.tipo_recomendacao]   ?? TIPO_CFG.moderada;

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${conf.cls}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold text-gray-800">Decisão Estratégica</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${conf.badge}`}>{conf.label}</Badge>
          <span className={`text-xs font-medium ${tipo.cls}`}>{tipo.label}</span>
        </div>
      </div>

      {/* Recomendação */}
      <div>
        <p className="text-xs text-muted-foreground mb-0.5">Recomendação</p>
        <p className="text-sm font-semibold text-gray-900">{decisao.recomendacao}</p>
      </div>

      {/* Justificativa */}
      <p className="text-sm leading-relaxed text-gray-800">{decisao.justificativa}</p>

      {/* Critério desempate (só se relevante) */}
      {decisao.criterio_de_desempate && (
        <div className="text-xs text-gray-600 italic border-l-2 border-gray-300 pl-2">
          Critério de desempate: {decisao.criterio_de_desempate}
        </div>
      )}

      {/* Quando escolher cada opção */}
      <Accordion type="single" collapsible>
        <AccordionItem value="cenarios" className="border-0">
          <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-1">
            Ver cenários de escolha
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-1">
            <div className="rounded-lg bg-green-50 border border-green-200 p-2.5">
              <p className="text-xs font-semibold text-green-800 mb-0.5 flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" /> Escolha a recomendada se:
              </p>
              <p className="text-xs text-green-700 leading-relaxed">{decisao.quando_escolher_recomendada}</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5">
              <p className="text-xs font-semibold text-blue-800 mb-0.5 flex items-center gap-1">
                <ThumbsDown className="h-3 w-3" /> Considere outra opção se:
              </p>
              <p className="text-xs text-blue-700 leading-relaxed">{decisao.quando_escolher_alternativa}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Risco da decisão */}
      <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5">
        <p className="text-xs font-semibold text-orange-800 mb-0.5 flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" /> Risco da decisão
        </p>
        <p className="text-xs text-orange-700 leading-relaxed">{decisao.risco_da_decisao}</p>
      </div>

      {/* Próximo passo */}
      <div className="rounded-lg bg-gray-900 p-2.5">
        <p className="text-xs font-semibold text-white mb-0.5">→ Próximo passo obrigatório</p>
        <p className="text-xs text-gray-200 leading-relaxed">{decisao.proximo_passo_obrigatorio}</p>
      </div>
    </div>
  );
}

// ── RecommendationCard ────────────────────────────────────────────────────────

function RecommendationCard({ ac, rankingAtivo }: { ac: CompatibilizacaoCompleta; rankingAtivo: EmpresaRanking[] }) {
  const recomendada = rankingAtivo.find(e => e.candidatura_id === ac.empresa_recomendada_id);
  const score = recomendada?.score_composto ?? 0;
  const empIdx = rankingAtivo.findIndex(e => e.candidatura_id === ac.empresa_recomendada_id);
  const empColor = CHART_CORES[empIdx] ?? '#2D3395';

  const darkGrad = empIdx === 1
    ? 'linear-gradient(150deg,#b8620a 0%,#e09020 100%)'
    : empIdx === 2
      ? 'linear-gradient(150deg,#155d38 0%,#1f7a4a 100%)'
      : `linear-gradient(150deg,${empColor}dd 0%,${empColor} 100%)`;

  return (
    <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,.10)' }}>
      {/* Header gradiente escuro */}
      <div style={{ background: darkGrad, padding: '18px 20px', color: '#fff' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', opacity: .65, marginBottom: 8 }}>Recomendação da IA</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 400, lineHeight: 1.3 }}>
            {recomendada?.empresa ?? '—'}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 9, opacity: .7 }}>score</div>
          </div>
        </div>
      </div>
      {/* Corpo */}
      <div className="p-4 space-y-2 bg-card border border-t-0 rounded-b-xl border-gray-100">
        <p className="text-sm leading-relaxed text-gray-800 line-clamp-3">{ac.recomendacao_geral}</p>
        <p className="text-xs text-gray-600 italic leading-relaxed border-l-2 border-gray-300 pl-2">{ac.justificativa_recomendacao}</p>
      </div>
    </div>
  );
}

// ── RankingCard (modo visualização) ──────────────────────────────────────────

function RankingCard({
  emp, recomendada, posIaOriginal, onRemover,
}: {
  emp: EmpresaRanking; recomendada: boolean; posIaOriginal?: number | null;
  onRemover?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const foiMovida = posIaOriginal != null && posIaOriginal !== emp.posicao;
  const temRiscoAlto    = emp.score_risco != null && emp.score_risco < 50;
  const melhorCustoBeneficio = (
    emp.diferenca_mercado != null && emp.diferenca_mercado < -5 && emp.score_composto >= 70
  );

  const cardColor = CHART_CORES[emp.posicao - 1] ?? '#2D3395';

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-all ${
        recomendada ? 'bg-green-50/50 shadow-md' : 'bg-card'
      }`}
      style={{
        borderTopWidth: 4,
        borderTopStyle: 'solid',
        borderTopColor: cardColor,
        borderColor: recomendada ? '#86efac' : undefined,
        boxShadow: recomendada ? '0 4px 16px rgba(27,122,74,.1)' : undefined,
      }}
    >
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 shrink-0 ${POS_CLS(emp.posicao)}`}>
          #{emp.posicao}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-sm ${recomendada ? 'text-green-800' : ''}`}>{emp.empresa}</span>
            {recomendada && (
              <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs gap-1 px-2">
                <Star className="h-3 w-3" />Recomendada
              </Badge>
            )}
            {melhorCustoBeneficio && (
              <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs gap-1 px-2">
                <Zap className="h-3 w-3" />Melhor custo-beneficio
              </Badge>
            )}
            {temRiscoAlto && (
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs gap-1">
                <ShieldAlert className="h-3 w-3" />Risco alto
              </Badge>
            )}
            {foiMovida && (
              <Badge variant="outline" className="text-xs text-muted-foreground border-dashed gap-1">
                <History className="h-3 w-3" />IA: #{posIaOriginal}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <MercadoBadge diff={emp.diferenca_mercado} />
            {emp.valor_proposta ? (
              <span className="text-xs text-muted-foreground">
                {emp.valor_proposta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            ) : (
              <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">valor nao informado</Badge>
            )}
          </div>
        </div>
        <div className="flex items-start gap-1 shrink-0">
          {onRemover && (
            <button
              onClick={onRemover}
              className="mt-1 p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
              title="Remover desta compatibilizacao"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="text-right">
            <p className={`text-3xl font-black leading-none ${SCORE_COR(emp.score_composto)}`}>{emp.score_composto}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        </div>
      </div>

      {/* Barra principal */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${SCORE_BAR(emp.score_composto)}`}
          style={{ width: `${emp.score_composto}%` }}
        />
      </div>

      {/* Justificativa — campo principal nas análises novas */}
      <div className="space-y-1">
        <p className={`text-xs text-gray-700 leading-relaxed ${!expanded ? 'line-clamp-4' : ''}`}>
          {emp.justificativa_posicao}
        </p>
        {(emp.justificativa_posicao?.length ?? 0) > 220 && (
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </div>

      {/* Pontos fortes / atenção — legado: análises antigas que ainda têm os arrays */}
      {((emp.pontos_fortes?.length ?? 0) > 0 || (emp.pontos_fracos?.length ?? 0) > 0) && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          {(emp.pontos_fortes?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3 text-green-600 shrink-0" />
                <p className="text-xs font-semibold text-green-700">Pontos fortes</p>
              </div>
              <ul className="space-y-0.5">
                {emp.pontos_fortes!.slice(0, 4).map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5 leading-relaxed">
                    <span className="text-green-500 shrink-0 mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(emp.pontos_fracos?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <ThumbsDown className="h-3 w-3 text-orange-600 shrink-0" />
                <p className="text-xs font-semibold text-orange-700">Pontos de atenção</p>
              </div>
              <ul className="space-y-0.5">
                {emp.pontos_fracos!.slice(0, 4).map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5 leading-relaxed">
                    <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ComparisonTabs ────────────────────────────────────────────────────────────

function ComparisonTabs({
  comparDims,
  rankingAtivo,
}: {
  comparDims: { key: string; label: string; text: string }[];
  rankingAtivo: EmpresaRanking[];
}) {
  return (
    <Tabs defaultValue={comparDims[0]?.key}>
      <TabsList className="flex-wrap h-auto gap-1 bg-muted/50">
        {comparDims.map(d => (
          <TabsTrigger key={d.key} value={d.key} className="text-xs">
            {d.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {comparDims.map(d => {
        const status = detectDimStatus(d.text);
        return (
          <TabsContent key={d.key} value={d.key} className="mt-3 space-y-3">
            {/* Análise comparativa da IA */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d.label}</p>
                <DimStatusBadge status={status} />
              </div>
              <p className="text-sm leading-relaxed text-foreground">{d.text}</p>
            </div>

            {/* Score por empresa nessa dimensão */}
            <div className={`grid gap-2 ${rankingAtivo.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {rankingAtivo.map(emp => {
                const sc = scorePorDim(emp, d.key);
                return (
                  <div key={emp.candidatura_id} className="rounded-lg border bg-card p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 ${POS_CLS(emp.posicao)}`}>
                          {emp.posicao}
                        </span>
                        <span className="text-xs font-medium truncate">{emp.empresa}</span>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${SCORE_COR(sc)}`}>{sc}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${SCORE_BAR(sc)}`} style={{ width: `${sc}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

// ── EmpresaCard (somente para modo edição do RankingEditor) ──────────────────

function EmpresaCardEdit({
  emp, posIaOriginal, onSubir, onDescer, isFirst, isLast,
}: {
  emp: EmpresaRanking; posIaOriginal?: number | null;
  onSubir?: () => void; onDescer?: () => void;
  isFirst?: boolean; isLast?: boolean;
}) {
  const foiMovida = posIaOriginal != null && posIaOriginal !== emp.posicao;
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold ${POS_CLS(emp.posicao)}`}>
            {emp.posicao}
          </span>
          <span className="font-semibold text-sm">{emp.empresa}</span>
          {foiMovida && (
            <Badge variant="outline" className="text-xs text-muted-foreground border-dashed gap-1">
              <History className="h-3 w-3" />IA: #{posIaOriginal}
            </Badge>
          )}
          <MercadoBadge diff={emp.diferenca_mercado} />
        </div>
        <div className="flex items-center gap-1">
          <div className="flex flex-col gap-0.5">
            <button onClick={onSubir} disabled={isFirst} className="p-1 rounded hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronUp className="h-4 w-4 text-blue-600" />
            </button>
            <button onClick={onDescer} disabled={isLast} className="p-1 rounded hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronDown className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          <div className="text-right ml-1">
            <p className={`text-xl font-bold ${SCORE_COR(emp.score_composto)}`}>{emp.score_composto}</p>
            <p className="text-xs text-muted-foreground">score</p>
          </div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${SCORE_BAR(emp.score_composto)}`} style={{ width: `${emp.score_composto}%` }} />
      </div>
    </div>
  );
}

// ── RankingEditor ─────────────────────────────────────────────────────────────

function RankingEditor({
  rankingIA, rankingAtual, onSalvar, onCancelar,
}: {
  rankingIA: EmpresaRanking[]; rankingAtual: EmpresaRanking[];
  onSalvar: (r: EmpresaRanking[], j: string) => Promise<void>; onCancelar: () => void;
}) {
  const [local, setLocal] = useState(() => [...rankingAtual].sort((a, b) => a.posicao - b.posicao));
  const [just, setJust]   = useState('');
  const [saving, setSaving] = useState(false);

  const idsAtual   = [...rankingAtual].sort((a, b) => a.posicao - b.posicao).map(e => e.candidatura_id);
  const ordemMudou = local.some((e, i) => e.candidatura_id !== idsAtual[i]);
  const posIaMap   = Object.fromEntries(rankingIA.map(e => [e.candidatura_id, e.posicao]));

  const mover = (idx: number, dir: -1 | 1) => {
    const n = [...local]; const t = idx + dir;
    if (t < 0 || t >= n.length) return;
    [n[idx], n[t]] = [n[t], n[idx]];
    setLocal(n.map((e, i) => ({ ...e, posicao: i + 1 })));
  };

  const handleSalvar = async () => {
    if (!ordemMudou)  { toast.info('A ordem não foi alterada.'); return; }
    if (!just.trim()) { toast.error('Justificativa obrigatória.'); return; }
    setSaving(true);
    try { await onSalvar(local, just); toast.success('Ajuste salvo.'); }
    catch { toast.error('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
        <Pencil className="h-3.5 w-3.5 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-800">Use as setas para reordenar. A análise original da IA não é alterada.</p>
      </div>
      {local.map((emp, idx) => (
        <EmpresaCardEdit
          key={emp.candidatura_id}
          emp={emp}
          posIaOriginal={posIaMap[emp.candidatura_id] ?? null}
          onSubir={() => mover(idx, -1)}
          onDescer={() => mover(idx, 1)}
          isFirst={idx === 0}
          isLast={idx === local.length - 1}
        />
      ))}
      {ordemMudou && (
        <div className="space-y-1.5 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
            <label className="text-xs font-semibold text-orange-800">Justificativa obrigatória</label>
          </div>
          <Textarea rows={3} placeholder="Explique o motivo da alteração de ordem..." value={just}
            onChange={e => setJust(e.target.value)} className="text-sm resize-none bg-white" />
          <p className="text-xs text-orange-700">Registro interno. O cliente vê apenas a ordem final como revisão técnica.</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSalvar} disabled={saving || !ordemMudou || !just.trim()} className="gap-1">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Salvar ajuste
        </Button>
        <Button size="sm" variant="outline" onClick={onCancelar} className="gap-1">
          <X className="h-3 w-3" />Cancelar
        </Button>
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

interface Props {
  orcamento: OrcamentoResumo | null;
  isOpen:    boolean;
  onClose:   () => void;
}

export function ModalCompatibilizacaoConsultor({ orcamento, isOpen, onClose }: Props) {
  const orcId = isOpen ? (orcamento?.id ?? '') : '';

  // ── State ────────────────────────────────────────────────────────────────────
  const [candidaturas,  setCandidaturas]  = useState<CandidaturaResumo[]>([]);
  const [loadingCands,  setLoadingCands]  = useState(false);
  const [gerando,       setGerando]       = useState(false);
  const [editRanking,   setEditRanking]   = useState(false);
  const [ajusteLeitura, setAjusteLeitura] = useState('');
  const [salvandoNota,  setSalvandoNota]  = useState(false);
  const [enviando,      setEnviando]      = useState(false);
  const [excluidos,     setExcluidos]     = useState<Set<string>>(new Set());
  const [atualizando,   setAtualizando]   = useState(false);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [addingExternal,  setAddingExternal]  = useState(false);
  const [formEmpresa,    setFormEmpresa]    = useState('');
  const [formContato,    setFormContato]    = useState('');
  const [formArquivo,    setFormArquivo]    = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Hook (lógica intacta) ────────────────────────────────────────────────────
  const {
    compat, statusCompat,
    solicitarCompatibilizacao,
    salvarAjusteRanking,
    salvarNotaConsultor,
    marcarEnviado,
    recarregar,
  } = useCompatibilizacaoIA(orcId);

  // Carrega candidaturas — extraído em callback para permitir recarga manual
  const carregarCandidaturas = useCallback(async () => {
    if (!orcamento?.id) { setCandidaturas([]); return; }
    setLoadingCands(true);

    // Busca candidaturas sem depender da coluna ignorada_na_compatibilizacao
    // (que pode não existir se a migration ainda não foi aplicada)
    const { data: cands, error: candsError } = await (supabase as any)
      .from('candidaturas_fornecedores')
      .select('id, empresa')
      .eq('orcamento_id', orcamento.id);

    console.log('[compat] orcamento.id', orcamento.id);
    console.log('[compat] candidaturas encontradas', cands);
    console.log('[compat] erro candidaturas', candsError);

    if (!cands || cands.length === 0) {
      setCandidaturas([]);
      setLoadingCands(false);
      return;
    }

    const ids = cands.map((c: any) => c.id as string);

    // Deriva quais candidaturas têm arquivo de proposta — sem depender de coluna proposta_enviada
    const { data: arquivosData } = await (supabase as any)
      .from('propostas_arquivos')
      .select('candidatura_id')
      .in('candidatura_id', ids);
    const comArquivoSet = new Set<string>((arquivosData ?? []).map((a: any) => a.candidatura_id as string));

    // Tenta restaurar exclusões persistidas — falha silenciosamente se a coluna não existir
    const { data: exclusoesData, error: exclusoesError } = await (supabase as any)
      .from('candidaturas_fornecedores')
      .select('id, ignorada_na_compatibilizacao')
      .in('id', ids)
      .eq('ignorada_na_compatibilizacao', true);

    if (!exclusoesError && exclusoesData && exclusoesData.length > 0) {
      setExcluidos(new Set(exclusoesData.map((c: any) => c.id as string)));
    }

    const { data: analises, error: analisesError } = await (supabase as any)
      .from('propostas_analises_ia')
      .select('candidatura_id, status, valor_proposta, qualidade_leitura, created_at, analise_completa')
      .in('candidatura_id', ids)
      .neq('status', 'cancelada')
      .neq('status', 'failed')
      .order('created_at', { ascending: false });

    console.log('[compat] ids candidaturas', ids);
    console.log('[compat] analises encontradas', analises);
    console.log('[compat] erro analises', analisesError);

    // Mantém apenas a análise mais recente por candidatura
    const analiseMap = new Map<string, any>();
    for (const a of (analises ?? [])) {
      if (!analiseMap.has(a.candidatura_id)) analiseMap.set(a.candidatura_id, a);
    }

    setCandidaturas(cands.map((c: any) => {
      const a = analiseMap.get(c.id);
      const ac = a?.analise_completa as any;
      return {
        id:                    c.id,
        empresa:               c.empresa,
        temProposta:           comArquivoSet.has(c.id) || analiseMap.has(c.id),
        statusAnalise:         a?.status             ?? null,
        valorProposta:         a?.valor_proposta      ?? null,
        qualidadeLeitura:      a?.qualidade_leitura   ?? null,
        compatibilidadeEscopo: ac?.compatibilidade_escopo ?? null,
        tipoProposta:          ac?.tipo_proposta          ?? null,
        analiseCreatedAt:      a?.created_at              ?? null,
      };
    }));
    setLoadingCands(false);
  }, [orcamento?.id]);

  useEffect(() => {
    if (!isOpen) { setCandidaturas([]); return; }
    carregarCandidaturas();
  }, [isOpen, carregarCandidaturas]);

  // Sincroniza correções quando compat carrega
  useEffect(() => {
    if (compat) {
      setAjusteLeitura(compat.ajuste_leitura ?? '');
    }
  }, [compat?.id]);

  // ── Proposta externa ─────────────────────────────────────────────────────────
  const handleAdicionarExternal = async () => {
    if (!formEmpresa.trim()) { toast.error('Nome da empresa é obrigatório'); return; }
    if (!formArquivo)        { toast.error('Arquivo da proposta é obrigatório'); return; }
    if (!orcamento?.id)      { toast.error('Orçamento não identificado'); return; }

    setAddingExternal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Usuário não autenticado'); return; }

      const { data: cand, error: candErr } = await (supabase as any)
        .from('candidaturas_fornecedores')
        .insert({
          orcamento_id:     orcamento.id,
          fornecedor_id:    user.id,
          empresa:          formEmpresa.trim(),
          nome:             formContato.trim() || formEmpresa.trim(),
          email:            'externo@reforma100.com',
          telefone:         '-',
          proposta_enviada: true,
        })
        .select('id')
        .single();

      if (candErr || !cand) {
        console.error('[addExternal] candErr completo:', candErr);
        toast.error(candErr?.message ?? 'Erro ao criar candidatura');
        return;
      }

      const fileExt    = formArquivo.name.split('.').pop();
      const fileName   = `${cand.id}_${Date.now()}.${fileExt}`;
      const filePath   = `${user.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('propostas-fornecedores')
        .upload(filePath, formArquivo);
      if (uploadErr) { toast.error('Erro ao fazer upload do arquivo'); return; }

      const { data: urlData } = supabase.storage.from('propostas-fornecedores').getPublicUrl(filePath);

      const { data: arquivo, error: arquivoErr } = await (supabase as any)
        .from('propostas_arquivos')
        .insert({
          candidatura_id:  cand.id,
          orcamento_id:    orcamento.id,
          fornecedor_id:   user.id,
          nome_arquivo:    formArquivo.name,
          url_arquivo:     urlData.publicUrl,
          caminho_storage: filePath,
          tipo_arquivo:    formArquivo.type,
          tamanho:         formArquivo.size,
        })
        .select('id')
        .single();

      if (arquivoErr || !arquivo) { toast.error('Erro ao registrar arquivo'); return; }

      await supabase.functions.invoke('analisar-proposta', {
        body: { candidatura_id: cand.id, arquivo_id: arquivo.id },
      });

      toast.success(`Proposta de "${formEmpresa.trim()}" adicionada. Análise iniciada.`);
      setShowAddExternal(false);
      setFormEmpresa('');
      setFormContato('');
      setFormArquivo(null);
      await carregarCandidaturas();
    } catch (err) {
      console.error('[addExternal]', err);
      toast.error('Erro inesperado ao adicionar proposta externa');
    } finally {
      setAddingExternal(false);
    }
  };

  // ── Handlers (lógica intacta) ────────────────────────────────────────────────
  const handleGerar = async () => {
    const idsValidos = candidaturas
      .filter(c => classificarCandidatura(c, excluidos).valida)
      .map(c => c.id);

    console.log('[compat] candidaturas no estado:', candidaturas);
    console.log('[compat] enviando IDs válidos:', idsValidos);

    if (idsValidos.length < 1) {
      toast.error('Nenhuma proposta válida disponível para compatibilização.');
      console.error('[compat] bloqueado: apenas', idsValidos.length, 'proposta(s) válida(s)');
      return;
    }

    setGerando(true);
    try {
      await solicitarCompatibilizacao(idsValidos);
    } catch (err) {
      toast.error('Erro ao gerar compatibilização.');
      console.error('[ModalCompatConsultor] gerar:', err);
    } finally {
      setGerando(false);
    }
  };

  const handleSalvarNota = async () => {
    setSalvandoNota(true);
    try { await salvarNotaConsultor('', ajusteLeitura); toast.success('Correções salvas.'); }
    catch { toast.error('Erro ao salvar correções.'); }
    finally { setSalvandoNota(false); }
  };

  const handleEnviar = async () => {
    setEnviando(true);
    try { await marcarEnviado(); toast.success('Marcado como enviado.'); }
    catch { toast.error('Erro ao marcar.'); }
    finally { setEnviando(false); }
  };

  const handleGerarHtmlCliente = () => {
    if (!compat || !orcamento) return;
    try {
      const html = gerarHtmlCompatibilizacao(
        { id: orcamento.id, nome_contato: orcamento.nome_contato, necessidade: orcamento.necessidade },
        compat,
      );
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('[gerarHtmlCliente]', err);
      toast.error('Erro ao gerar HTML do cliente.');
    }
  };

  const handleClose = useCallback(() => {
    setEditRanking(false);
    setExcluidos(new Set());
    onClose();
  }, [onClose]);

  const handleAtualizar = async () => {
    setAtualizando(true);
    setExcluidos(new Set());
    await Promise.all([carregarCandidaturas(), recarregar()]);
    setAtualizando(false);
    toast.success('Dados atualizados.');
  };

  const handleReprocessar = async () => {
    const validos = candidaturas
      .filter(c => classificarCandidatura(c, excluidos).valida)
      .map(c => c.id);

    if (validos.length < 1) {
      toast.error('Nenhuma proposta válida. Revise ou solicite nova proposta.');
      return;
    }

    setGerando(true);
    try {
      await solicitarCompatibilizacao(validos, ajusteLeitura || undefined);
    } catch (err) {
      toast.error('Erro ao reprocessar compatibilização.');
    } finally {
      setGerando(false);
    }
  };

  // ── Derivados ────────────────────────────────────────────────────────────────
  const ac      = compat?.analise_completa ?? null;
  const canEdit = compat ? compat.status !== 'enviado' : false;
  const canEnviar = compat
    ? ['concluida', 'completed', 'pendente_revisao', 'revisado', 'aprovado'].includes(compat.status)
    : false;

  const rankingAtivo = compat?.ranking_ajustado
    ? [...compat.ranking_ajustado].sort((a, b) => a.posicao - b.posicao)
    : ac ? [...(ac.ranking ?? [])].sort((a, b) => a.posicao - b.posicao) : [];
  const rankingIA    = ac ? [...(ac.ranking ?? [])].sort((a, b) => a.posicao - b.posicao) : [];
  const rankingVisivel = rankingAtivo.filter(e => !excluidos.has(e.candidatura_id));
  const ESTADOS_ATIVOS = ['pending', 'processando', 'compatibilizando'];
  const podeReprocessar = compat != null && !ESTADOS_ATIVOS.includes(statusCompat) && !editRanking;
  const propostasRecebidas   = candidaturas.filter(c => c.temProposta);
  const inscritosSemProposta = candidaturas.filter(c => !c.temProposta);
  const statusCandidaturas = propostasRecebidas.map(c => ({ cand: c, ...classificarCandidatura(c, excluidos) }));
  const validCount = statusCandidaturas.filter(s => s.valida).length;
  const ignoradasCount = statusCandidaturas.filter(s => !s.valida).length;
  const deveExibirCompat = validCount >= 1 && compat != null;

  const comparDims = ac?.analise_comparativa ? [
    { key: 'escopo',    label: 'Escopo',    text: ac.analise_comparativa.escopo    ?? '' },
    { key: 'preco',     label: 'Preço',     text: ac.analise_comparativa.preco     ?? '' },
    { key: 'prazo',     label: 'Prazo',     text: ac.analise_comparativa.prazo     ?? '' },
    { key: 'risco',     label: 'Risco',     text: ac.analise_comparativa.risco     ?? '' },
    { key: 'materiais', label: 'Materiais', text: ac.analise_comparativa.materiais ?? '' },
  ] : [];

  const dadosInvalidos = ac != null && (!ac.ranking?.length || !ac.analise_comparativa);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
    <Sheet open={isOpen} onOpenChange={v => !v && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">

        {/* ── Header fixo ── */}
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <SheetTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-500" />
                Compatibilização IA
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {orcamento?.nome_contato || orcamento?.necessidade?.slice(0, 50) || orcamento?.id?.slice(0, 8)}
              </SheetDescription>
            </div>
            {compat && <StatusBadge status={compat.status} />}
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-6">

          {/* ── Estimativa Técnica Reforma100 ── */}
          {orcamento?.id && <EstimativaTecnicaCard orcamentoId={orcamento.id} />}

          {/* ── Barra de controle operacional ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAtualizar}
              disabled={atualizando || ESTADOS_ATIVOS.includes(statusCompat)}
              className="gap-1.5 text-xs h-8"
            >
              {atualizando ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Atualizar dados
            </Button>
            {podeReprocessar && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReprocessar}
                disabled={gerando || atualizando || validCount < 1}
                title={validCount < 1 ? 'Nenhuma proposta válida para reprocessar' : 'Refaz a análise completa — inclui as correções salvas no campo abaixo'}
                className="gap-1.5 text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {gerando ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart2 className="h-3 w-3" />}
                Reprocessar compatibilização
              </Button>
            )}
          </div>

          {/* ── Propostas recebidas ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Propostas recebidas</p>
              <div className="flex items-center gap-2">
                {!loadingCands && propostasRecebidas.length > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    validCount >= 1
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {validCount} de {propostasRecebidas.length} válida{validCount !== 1 ? 's' : ''}
                  </span>
                )}
                {!loadingCands && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 h-6 text-xs px-2"
                    onClick={() => setShowAddExternal(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Proposta externa
                  </Button>
                )}
              </div>
            </div>

            {loadingCands ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando propostas...
              </div>
            ) : propostasRecebidas.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800">Nenhuma proposta anexada ainda.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {statusCandidaturas.map(({ cand, valida, motivo }) => {
                  const isPendenteLongo = motivo === 'pendente' &&
                    cand.analiseCreatedAt != null &&
                    (Date.now() - new Date(cand.analiseCreatedAt).getTime()) > 10 * 60 * 1000;
                  const isIncompat = motivo === 'escopo_incompativel';
                  const isRemovidaManual = motivo === 'removida_manualmente';

                  return (
                    <div key={cand.id} className="space-y-1">
                      <div
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                          valida
                            ? 'bg-muted/40 border-border'
                            : isIncompat
                              ? 'bg-red-50 border-red-200'
                              : 'bg-orange-50 border-orange-200'
                        }`}
                      >
                        {valida
                          ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          : isIncompat
                            ? <X className="h-3 w-3 text-red-500 shrink-0" />
                            : <AlertCircle className="h-3 w-3 text-orange-500 shrink-0" />
                        }
                        <span className="font-medium flex-1 min-w-0 truncate">{cand.empresa}</span>
                        {!valida && motivo && (
                          <span className={`ml-auto shrink-0 ${isIncompat ? 'text-red-600' : 'text-orange-600'}`}>
                            {MOTIVO_LABEL[motivo]}
                          </span>
                        )}
                        {!isRemovidaManual && (
                          <button
                            onClick={async () => {
                              await (supabase as any)
                                .from('candidaturas_fornecedores')
                                .update({ ignorada_na_compatibilizacao: true })
                                .eq('id', cand.id);
                              setExcluidos(prev => new Set([...prev, cand.id]));
                            }}
                            className="ml-auto shrink-0 p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Remover desta compatibilização"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {isRemovidaManual && (
                          <button
                            onClick={async () => {
                              await (supabase as any)
                                .from('candidaturas_fornecedores')
                                .update({ ignorada_na_compatibilizacao: false })
                                .eq('id', cand.id);
                              setExcluidos(prev => { const s = new Set(prev); s.delete(cand.id); return s; });
                            }}
                            className="ml-auto shrink-0 text-[10px] text-blue-600 hover:underline"
                          >
                            restaurar
                          </button>
                        )}
                      </div>
                      {isPendenteLongo && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Análise ainda em processamento ou travada. Atualize os dados ou reenvie a proposta.
                        </div>
                      )}
                    </div>
                  );
                })}

                {ignoradasCount > 0 && (
                  <p className="text-[11px] text-muted-foreground pl-1">
                    {ignoradasCount} proposta{ignoradasCount !== 1 ? 's' : ''} ignorada{ignoradasCount !== 1 ? 's' : ''} no reprocessamento
                  </p>
                )}

                {validCount === 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                    <p className="text-xs text-orange-800">Nenhuma proposta válida disponível.</p>
                  </div>
                )}
                {validCount === 1 && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-800">1 proposta — análise parcial com referência de mercado. Para compatibilização comparativa completa, aguarde 2 ou mais propostas.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Inscritos sem proposta ── */}
            {!loadingCands && inscritosSemProposta.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Inscritos sem proposta ({inscritosSemProposta.length})
                </p>
                {inscritosSemProposta.map(c => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground bg-muted/20">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="flex-1 truncate">{c.empresa}</span>
                    <span>sem proposta anexada</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Botão gerar ── */}
          {!compat && !loadingCands && (
            <Button
              onClick={handleGerar}
              disabled={gerando || validCount < 1}
              className="w-full gap-2"
              title={validCount < 1 ? 'Nenhuma proposta válida' : undefined}
            >
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
              {gerando ? 'Gerando análise IA...' : 'Gerar Análise de Compatibilização'}
            </Button>
          )}

          {/* ── Processando ── */}
          {ESTADOS_ATIVOS.includes(statusCompat) && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <div className="text-center">
                <p className="text-sm font-medium">IA analisando as propostas...</p>
                <p className="text-xs mt-1">{candidaturas.length} empresa{candidaturas.length !== 1 ? 's' : ''} sendo comparada{candidaturas.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* ── Erro ── */}
          {(statusCompat === 'erro' || statusCompat === 'failed') && (
            <div className="space-y-3">
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm font-semibold text-red-800">Reprocessamento falhou por timeout da IA.</p>
                </div>
                <p className="text-xs text-red-700 pl-6">
                  Tente novamente ou reduza as correções no campo abaixo.
                </p>
              </div>
              {validCount >= 1 && (
                <Button variant="outline" onClick={compat ? handleReprocessar : handleGerar} disabled={gerando} className="w-full gap-2">
                  {gerando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tentar novamente
                </Button>
              )}
            </div>
          )}

          {/* ── Análise completa — requer ao menos 2 propostas válidas ── */}
          {validCount >= 1 && ac && statusCompat !== 'pending' && (
            <>
              {/* Dados inválidos / incompletos — evita tela branca */}
              {dadosInvalidos && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
                    <p className="text-sm font-semibold text-orange-800">Análise salva com dados incompletos.</p>
                  </div>
                  <p className="text-xs text-orange-700 pl-6">
                    Reprocesse a compatibilização para obter o resultado completo.
                  </p>
                </div>
              )}

              {/* 1. Recomendação */}
              {!dadosInvalidos && <RecommendationCard ac={ac} rankingAtivo={rankingAtivo} />}

              {/* 1b. Decisão Estratégica (Camada 2) */}
              {ac.decisao_estrategica && (
                <DecisaoEstrategicaCard decisao={ac.decisao_estrategica} />
              )}

              {/* 2. Ajuste de ranking (auditoria) */}
              {compat?.ranking_ajustado && compat.ajuste_em && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="audit" className="border rounded-xl px-4 border-orange-200 bg-orange-50/40">
                    <AccordionTrigger className="text-xs text-orange-800 hover:no-underline gap-2 py-3">
                      <div className="flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5" />
                        Revisão técnica aplicada — {format(new Date(compat.ajuste_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      {compat.justificativa_ajuste && (
                        <p className="text-xs text-orange-800 italic leading-relaxed">{compat.justificativa_ajuste}</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* 3. Ranking */}
              <div className="space-y-3">
                {rankingVisivel.length >= 1 && (
                  <PriceBarChart ranking={rankingVisivel} />
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Ranking de empresas</p>
                  {canEdit && !editRanking && (
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7" onClick={() => setEditRanking(true)}>
                      <Pencil className="h-3 w-3" />Ajustar ordem
                    </Button>
                  )}
                </div>

                {editRanking ? (
                  <RankingEditor
                    rankingIA={rankingIA}
                    rankingAtual={rankingAtivo}
                    onSalvar={async (r, j) => { await salvarAjusteRanking(r, j); setEditRanking(false); }}
                    onCancelar={() => setEditRanking(false)}
                  />
                ) : (
                  <div className="space-y-3">
                    {rankingVisivel.length < 2 && rankingAtivo.length >= 2 && (
                      <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        <p className="text-xs text-orange-800">
                          Compatibilização exige pelo menos 2 propostas válidas. Revise ou solicite nova proposta.
                        </p>
                      </div>
                    )}
                    {rankingVisivel.map(emp => (
                      <RankingCard
                        key={emp.candidatura_id}
                        emp={emp}
                        recomendada={emp.candidatura_id === ac.empresa_recomendada_id}
                        posIaOriginal={
                          compat?.ranking_ajustado
                            ? (rankingIA.find(e => e.candidatura_id === emp.candidatura_id)?.posicao ?? null)
                            : null
                        }
                        onRemover={() => setExcluidos(prev => new Set([...prev, emp.candidatura_id]))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Comparativo por dimensão */}
              {!editRanking && comparDims.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Comparativo por dimensão</p>
                  <ComparisonTabs comparDims={comparDims} rankingAtivo={rankingVisivel} />
                </div>
              )}

              {/* 5. Metodologia */}
              {!editRanking && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="met" className="border rounded-xl px-4">
                    <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline gap-2 py-3">
                      <div className="flex items-center gap-1.5">
                        <Info className="h-3 w-3" />Metodologia de score
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">{ac.metodologia}</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {!editRanking && <Separator />}

              {/* 6. Correções para reanálise */}
              {!editRanking && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Correções para reanálise</p>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Instruções para a IA</label>
                    <Textarea
                      rows={3}
                      placeholder="Ex: empresa X informou que inclui telhado no escopo; empresa Y não inclui marcenaria; desconsiderar empresa Z por falta de CNPJ..."
                      value={ajusteLeitura}
                      onChange={e => setAjusteLeitura(e.target.value)}
                      disabled={!canEdit}
                      className="text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Salve as correções e clique em <strong>Reprocessar compatibilização</strong> (barra superior) para que a IA refaça a análise com essas instruções.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={handleSalvarNota} disabled={salvandoNota} className="gap-1">
                        {salvandoNota && <Loader2 className="h-3 w-3 animate-spin" />}
                        Salvar correções
                      </Button>
                    )}
                    {canEnviar && (
                      <Button size="sm" className="gap-1" onClick={handleEnviar} disabled={enviando}>
                        {enviando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Marcar como enviado
                      </Button>
                    )}
                    {(canEnviar || compat?.status === 'enviado') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                        onClick={handleGerarHtmlCliente}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Gerar versão para cliente
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* ── Dialog: adicionar proposta externa ── */}
    <Dialog open={showAddExternal} onOpenChange={v => !addingExternal && setShowAddExternal(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar proposta externa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Empresa *</label>
            <Input
              placeholder="Nome da empresa"
              value={formEmpresa}
              onChange={e => setFormEmpresa(e.target.value)}
              disabled={addingExternal}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Nome do contato</label>
            <Input
              placeholder="Opcional"
              value={formContato}
              onChange={e => setFormContato(e.target.value)}
              disabled={addingExternal}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Proposta (PDF, JPEG ou PNG — máx. 10MB) *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => setFormArquivo(e.target.files?.[0] ?? null)}
            />
            {formArquivo ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-xs">{formArquivo.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormArquivo(null)}
                  className="h-6 w-6 p-0"
                  disabled={addingExternal}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={addingExternal}
              >
                <Upload className="h-4 w-4" />
                Selecionar arquivo
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowAddExternal(false)} disabled={addingExternal}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdicionarExternal}
            disabled={addingExternal || !formEmpresa.trim() || !formArquivo}
            className="gap-2"
          >
            {addingExternal && <Loader2 className="h-4 w-4 animate-spin" />}
            Adicionar proposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
