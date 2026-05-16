import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart2, Clock, RefreshCw, AlertTriangle, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { type CompatibilizacaoIA } from '@/hooks/useCompatibilizacaoIA';
import { ModalCompatibilizacaoConsultor, StatusBadge } from './ModalCompatibilizacaoConsultor';

// Buckets de filtro derivados dos status canônicos da máquina de estados
type FiltroStatus = 'todos' | 'em_andamento' | 'pendente_revisao' | 'aprovados' | 'enviados' | 'erros';

const STATUS_PARA_BUCKET = (s: string): FiltroStatus => {
  if (['pending', 'processando', 'compatibilizando'].includes(s)) return 'em_andamento';
  if (['concluida', 'completed', 'pendente_revisao', 'revisado'].includes(s)) return 'pendente_revisao';
  if (s === 'aprovado') return 'aprovados';
  if (s === 'enviado') return 'enviados';
  if (['erro', 'failed', 'cancelada'].includes(s)) return 'erros';
  return 'todos';
};

function diasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

// ── Tipos internos ────────────────────────────────────────────────────────────

interface CompatItem {
  compat:       CompatibilizacaoIA;
  orcamentoNome: string;
}

// ── Hook de lista (todos os registros) ───────────────────────────────────────

function useListaCompatibilizacoes() {
  const [items,   setItems]   = useState<CompatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('compatibilizacoes_analises_ia')
        .select('*, orcamentos(nome_contato, descricao, cidade)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[PainelCompatibilizacaoIA] lista:', error);
        return;
      }

      setItems(
        (data ?? []).map((row: any) => ({
          compat: {
            id:                   row.id,
            orcamento_id:         row.orcamento_id,
            candidaturas_ids:     row.candidaturas_ids ?? [],
            status:               row.status,
            nota_consultor:       row.nota_consultor ?? null,
            ajuste_leitura:       row.ajuste_leitura ?? null,
            aprovado_em:          row.aprovado_em ?? null,
            analise_completa:     row.analise_completa ?? null,
            ranking_ajustado:     row.ranking_ajustado ?? null,
            justificativa_ajuste: row.justificativa_ajuste ?? null,
            ajuste_por:           row.ajuste_por ?? null,
            ajuste_em:            row.ajuste_em ?? null,
            created_at:           row.created_at,
          } as CompatibilizacaoIA,
          orcamentoNome:
            row.orcamentos?.nome_contato ||
            row.orcamentos?.descricao?.slice(0, 40) ||
            row.orcamentos?.cidade ||
            `Orçamento ${row.orcamento_id?.slice(0, 8)}`,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return { items, loading, recarregar: carregar };
}

// ── Linha da lista ────────────────────────────────────────────────────────────

function CompatRow({
  item,
  onAbrir,
}: {
  item: CompatItem;
  onAbrir: (item: CompatItem) => void;
}) {
  const { compat, orcamentoNome } = item;
  const needsAction = ['concluida', 'completed', 'pendente_revisao'].includes(compat.status);
  const ativo = ['pending', 'processando', 'compatibilizando'].includes(compat.status);
  const aguardandoCliente = compat.status === 'enviado';
  const dias = diasDesde(compat.created_at);
  const slaCritico = (ativo && dias > 1) || (needsAction && dias > 3) || (aguardandoCliente && dias > 5);

  // Top 3 do ranking (S3.4 mini-comparativo)
  const ranking = compat.ranking_ajustado && compat.ranking_ajustado.length > 0
    ? compat.ranking_ajustado
    : (compat.analise_completa?.ranking ?? []);
  const top3 = ranking.slice().sort((a, b) => a.posicao - b.posicao).slice(0, 3);
  const recomendadaId = compat.analise_completa?.empresa_recomendada_id ?? null;

  return (
    <div className={`flex flex-col gap-3 p-4 border rounded-lg transition-colors
      ${needsAction ? 'border-orange-200 bg-orange-50/40 hover:bg-orange-50' : 'bg-muted/20 hover:bg-muted/40'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{orcamentoNome}</p>
            <StatusBadge status={compat.status} />
            {slaCritico && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                {Math.floor(dias)}d aguardando
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {compat.candidaturas_ids.length} empresa{compat.candidaturas_ids.length !== 1 ? 's' : ''} comparadas
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(compat.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        <Button
          size="sm"
          variant={needsAction ? 'default' : 'outline'}
          className="shrink-0 text-xs"
          onClick={() => onAbrir(item)}
          disabled={ativo}
        >
          {ativo ? 'Processando...' : 'Revisar'}
        </Button>
      </div>

      {/* Mini ranking preview — S3.4 */}
      {top3.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pl-1">
          {top3.map(r => {
            const isRec = r.candidatura_id === recomendadaId;
            return (
              <span
                key={r.candidatura_id}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border
                  ${isRec
                    ? 'bg-green-50 border-green-300 text-green-800 font-bold'
                    : 'bg-white border-border text-foreground'}`}
              >
                {isRec && <Trophy className="h-3 w-3" />}
                <span className="font-bold">{r.posicao}º</span>
                <span className="truncate max-w-[150px]">{r.empresa}</span>
                {typeof r.score_composto === 'number' && (
                  <span className="text-muted-foreground">· {Math.round(r.score_composto)}</span>
                )}
              </span>
            );
          })}
          {ranking.length > 3 && (
            <span className="text-xs text-muted-foreground">+{ranking.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Wrapper que delega ao modal completo do consultor ────────────────────────
// O modal completo gerencia compat/handlers internamente via useCompatibilizacaoIA;
// aqui só passamos identificação do orçamento e callbacks de ciclo de vida.

function ModalWrapper({
  item,
  onClose,
}: {
  item:    CompatItem;
  onClose: () => void;
}) {
  return (
    <ModalCompatibilizacaoConsultor
      orcamento={{
        id:            item.compat.orcamento_id,
        nome_contato:  item.orcamentoNome,
      }}
      isOpen={true}
      onClose={onClose}
    />
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────

export function PainelCompatibilizacaoIA() {
  const { items, loading, recarregar } = useListaCompatibilizacoes();
  const [aberto, setAberto] = useState<CompatItem | null>(null);
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');

  const counts = useMemo(() => {
    const c: Record<FiltroStatus, number> = {
      todos: items.length,
      em_andamento: 0,
      pendente_revisao: 0,
      aprovados: 0,
      enviados: 0,
      erros: 0,
    };
    items.forEach(i => { c[STATUS_PARA_BUCKET(i.compat.status)]++; });
    return c;
  }, [items]);

  const itensFiltrados = useMemo(() => {
    if (filtro === 'todos') return items;
    return items.filter(i => STATUS_PARA_BUCKET(i.compat.status) === filtro);
  }, [items, filtro]);

  const pendentesRevisao = counts.pendente_revisao;

  const chips: Array<{ v: FiltroStatus; l: string; cor: string }> = [
    { v: 'todos',            l: 'Todas',           cor: 'bg-blue-500'   },
    { v: 'em_andamento',     l: 'Em andamento',    cor: 'bg-yellow-500' },
    { v: 'pendente_revisao', l: 'Pend. revisão',   cor: 'bg-orange-500' },
    { v: 'aprovados',        l: 'Aprovadas',       cor: 'bg-green-500'  },
    { v: 'enviados',         l: 'Enviadas',        cor: 'bg-slate-500'  },
    { v: 'erros',            l: 'Erros',           cor: 'bg-red-500'    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-500" />
              Compatibilizações IA
              {pendentesRevisao > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
                  {pendentesRevisao}
                </span>
              )}
            </CardTitle>
            <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={recarregar} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* S3.2: chips de filtro por bucket de status */}
          {!loading && items.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              {chips.map(c => {
                const ativo = filtro === c.v;
                const n = counts[c.v];
                return (
                  <button
                    key={c.v}
                    onClick={() => setFiltro(c.v)}
                    aria-pressed={ativo}
                    aria-label={`Filtrar por ${c.l}, ${n} item${n !== 1 ? 'ns' : ''}`}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5
                      ${ativo
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-foreground border-border hover:bg-muted'}`}
                  >
                    {c.l}
                    <span className={`text-[10px] font-bold px-1.5 py-0 rounded-full
                      ${ativo ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="r100-empty r100-fade">
              <div className="r100-empty-icon" aria-hidden>🤖</div>
              <div className="r100-empty-title">Nenhuma compatibilização gerada</div>
              <div className="r100-empty-sub">As análises de IA aparecerão aqui assim que forem disparadas.</div>
            </div>
          )}

          {!loading && items.length > 0 && itensFiltrados.length === 0 && (
            <div className="r100-empty r100-fade">
              <div className="r100-empty-icon" aria-hidden>🔎</div>
              <div className="r100-empty-title">Nada neste filtro</div>
              <div className="r100-empty-sub">
                {filtro === 'em_andamento'     ? 'Nenhuma compatibilização em andamento agora.'
                : filtro === 'pendente_revisao' ? 'Nenhuma compatibilização aguardando sua revisão.'
                : filtro === 'aprovados'        ? 'Nenhuma compatibilização aprovada ainda.'
                : filtro === 'enviados'         ? 'Nenhuma compatibilização enviada ao cliente.'
                : filtro === 'erros'            ? 'Nenhuma compatibilização com erro.'
                : 'Tente alterar o filtro acima.'}
              </div>
            </div>
          )}

          {!loading && itensFiltrados.length > 0 && (
            <div className="space-y-3">
              {itensFiltrados.map((item, idx) => (
                <div key={item.compat.id} className="r100-stagger" style={{ ['--i' as any]: Math.min(idx, 10) }}>
                  <CompatRow
                    item={item}
                    onAbrir={setAberto}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {aberto && (
        <ModalWrapper
          item={aberto}
          onClose={() => {
            setAberto(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
