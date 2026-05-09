import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart2, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompatibilizacaoIA, type CompatibilizacaoIA } from '@/hooks/useCompatibilizacaoIA';
import { ModalCompatibilizacao, StatusBadge } from './ModalCompatibilizacao';

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
            id:               row.id,
            orcamento_id:     row.orcamento_id,
            candidaturas_ids: row.candidaturas_ids ?? [],
            status:           row.status,
            nota_consultor:   row.nota_consultor ?? null,
            ajuste_leitura:   row.ajuste_leitura ?? null,
            aprovado_em:      row.aprovado_em ?? null,
            analise_completa: row.analise_completa ?? null,
            created_at:       row.created_at,
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
  const needsAction = ['completed', 'pendente_revisao'].includes(compat.status);

  return (
    <div className={`flex items-start justify-between gap-4 p-4 border rounded-lg transition-colors
      ${needsAction ? 'border-orange-200 bg-orange-50/40 hover:bg-orange-50' : 'bg-muted/20 hover:bg-muted/40'}`}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{orcamentoNome}</p>
          <StatusBadge status={compat.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {compat.candidaturas_ids.length} empresa{compat.candidaturas_ids.length !== 1 ? 's' : ''} comparadas
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(compat.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
        {compat.analise_completa?.empresa_recomendada_id && (
          <p className="text-xs text-green-700 font-medium">
            Recomendada: {
              compat.analise_completa.ranking?.find(
                r => r.candidatura_id === compat.analise_completa!.empresa_recomendada_id
              )?.empresa ?? '—'
            }
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant={needsAction ? 'default' : 'outline'}
        className="shrink-0 text-xs"
        onClick={() => onAbrir(item)}
        disabled={compat.status === 'pending'}
      >
        {compat.status === 'pending' ? 'Processando...' : 'Revisar'}
      </Button>
    </div>
  );
}

// ── Wrapper com hook por orcamento (para ações dentro do modal) ───────────────

function ModalWrapper({
  item,
  onClose,
  onAtualizar,
}: {
  item:        CompatItem;
  onClose:     () => void;
  onAtualizar: () => void;
}) {
  const { salvarAjusteRanking, salvarNotaConsultor, aprovarCompatibilizacao, marcarEnviado } =
    useCompatibilizacaoIA(item.compat.orcamento_id);

  const wrap = (fn: () => Promise<void>) => async () => {
    await fn();
    onAtualizar();
  };

  return (
    <ModalCompatibilizacao
      compat={item.compat}
      orcamentoNome={item.orcamentoNome}
      open={true}
      onClose={onClose}
      onSalvarAjuste={async (ranking, justificativa) => {
        await salvarAjusteRanking(ranking, justificativa);
        onAtualizar();
      }}
      onSalvarNota={(nota, ajuste) => salvarNotaConsultor(nota, ajuste)}
      onAprovar={wrap(aprovarCompatibilizacao)}
      onMarcarEnviado={wrap(marcarEnviado)}
    />
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────

export function PainelCompatibilizacaoIA() {
  const { items, loading, recarregar } = useListaCompatibilizacoes();
  const [aberto, setAberto] = useState<CompatItem | null>(null);

  const pendentesRevisao = items.filter(i =>
    ['completed', 'pendente_revisao'].includes(i.compat.status)
  ).length;

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
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma compatibilizacao gerada ainda.
            </p>
          )}

          {!loading && items.length > 0 && (
            <div className="space-y-3">
              {items.map(item => (
                <CompatRow
                  key={item.compat.id}
                  item={item}
                  onAbrir={setAberto}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {aberto && (
        <ModalWrapper
          item={aberto}
          onClose={() => setAberto(null)}
          onAtualizar={() => {
            recarregar();
            setAberto(null);
          }}
        />
      )}
    </div>
  );
}
