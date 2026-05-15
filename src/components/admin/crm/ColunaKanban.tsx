import { OrcamentoCRMComChecklist, StatusContato } from '@/types/crm';
import { ConfiguracaoEtapa } from '@/types/crm';
import { OrcamentoCRMCard } from './OrcamentoCRMCard';
import { OrcamentoCRMCardMinimizado } from './OrcamentoCRMCardMinimizado';
import type { EtapaConfig } from '@/hooks/useEtapasConfig';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Snowflake } from 'lucide-react';
import { useState } from 'react';
import { crmEtapaColor } from '@/styles/tokens';

interface ColunaKanbanProps {
  etapa: ConfiguracaoEtapa;
  orcamentos: OrcamentoCRMComChecklist[];
  onAtualizarStatusContato: (orcamentoId: string, novoStatus: StatusContato) => void;
  onAtualizarValorLead: (orcamentoId: string, valor: number | null) => void;
  onAbrirDetalhes: (orcamento: OrcamentoCRMComChecklist) => void;
  onCompatibilizacao?: (orcamento: OrcamentoCRMComChecklist) => void;
  cardsSelecionados?: Set<string>;
  onToggleSelect?: (id: string) => void;
  modoSelecao?: boolean;
  arquivada?: boolean;
  configEtapa?: EtapaConfig;
}

export const ColunaKanban = ({
  etapa,
  orcamentos,
  onAtualizarStatusContato,
  onAtualizarValorLead,
  onAbrirDetalhes,
  onCompatibilizacao,
  cardsSelecionados = new Set(),
  onToggleSelect,
  modoSelecao = false,
  arquivada = false,
  configEtapa
}: ColunaKanbanProps) => {
  const [congeladosAberto, setCongeladosAberto] = useState(false);

  // Separar orçamentos ativos e congelados
  const orcamentosAtivos = orcamentos.filter(o => !o.congelado);
  const orcamentosCongelados = orcamentos.filter(o => o.congelado);

  const corEtapa = crmEtapaColor[etapa.valor] ?? '#9CA3AF';

  return (
    <div
      className={`crm-kanban-column bg-white rounded-xl flex flex-col h-full r100-press ${arquivada ? 'opacity-90 border-2 border-dashed border-border' : 'border border-border'}`}
      style={{ borderTop: `3px solid ${corEtapa}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.07)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      {/* Header da coluna — hierarquia premium */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-border/50">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className="text-lg leading-none mt-0.5" aria-hidden>{etapa.icone}</span>
            <h3
              className="font-bold text-sm leading-tight line-clamp-2 text-foreground"
              style={{ fontFamily: "'Syne', sans-serif" }}
              title={etapa.titulo}
            >
              {etapa.titulo}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-2 rounded-full text-xs font-bold text-white tabular-nums"
              style={{ background: corEtapa, fontFamily: "'Syne', sans-serif" }}
            >
              {orcamentosAtivos.length}
            </span>
            {orcamentosCongelados.length > 0 && (
              <span
                className="inline-flex items-center gap-1 h-[22px] px-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold"
                title={`${orcamentosCongelados.length} congelado(s)`}
              >
                <Snowflake className="h-3 w-3" />
                {orcamentosCongelados.length}
              </span>
            )}
            {arquivada && <Badge variant="outline" className="text-[10px] h-[22px]">Arquivada</Badge>}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug pl-7">{etapa.descricao}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        <div className="space-y-3">
          {orcamentosAtivos.length === 0 && orcamentosCongelados.length === 0 ? (
            <div className="r100-empty">
              <div className="r100-empty-icon" aria-hidden>{etapa.icone || '—'}</div>
              <div className="r100-empty-title">Nada nesta etapa</div>
              <div className="r100-empty-sub">Cards aparecem aqui ao serem movidos para <strong>{etapa.titulo}</strong>.</div>
            </div>
          ) : (
            <>
              {/* Orçamentos ativos — entrada em cascata */}
              {orcamentosAtivos.map((orc, idx) => (
                <div key={orc.id} className="r100-stagger" style={{ ['--i' as any]: Math.min(idx, 10) }}>
                  <OrcamentoCRMCard
                    orcamento={orc}
                    onAtualizarStatusContato={onAtualizarStatusContato}
                    onAtualizarValorLead={onAtualizarValorLead}
                    onClick={() => onAbrirDetalhes(orc)}
                    isSelected={cardsSelecionados.has(orc.id)}
                    onToggleSelect={() => onToggleSelect?.(orc.id)}
                    modoSelecao={modoSelecao}
                    configEtapa={configEtapa}
                    onCompatibilizacao={onCompatibilizacao ? () => onCompatibilizacao(orc) : undefined}
                  />
                </div>
              ))}

              {/* Seção de congelados */}
              {orcamentosCongelados.length > 0 && (
                <Collapsible 
                  open={congeladosAberto} 
                  onOpenChange={setCongeladosAberto}
                  className="mt-4"
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Snowflake className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        Congelados ({orcamentosCongelados.length})
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${congeladosAberto ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {orcamentosCongelados.map((orc) => (
                      <OrcamentoCRMCardMinimizado
                        key={orc.id}
                        orcamento={orc}
                        onClick={() => onAbrirDetalhes(orc)}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};