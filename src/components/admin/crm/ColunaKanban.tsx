import { OrcamentoCRMComChecklist, StatusContato } from '@/types/crm';
import { ConfiguracaoEtapa } from '@/types/crm';
import { OrcamentoCRMCard } from './OrcamentoCRMCard';
import { OrcamentoCRMCardMinimizado } from './OrcamentoCRMCardMinimizado';
import type { EtapaConfig } from '@/hooks/useEtapasConfig';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Snowflake } from 'lucide-react';
import { useState } from 'react';

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

  return (
    <div className={`crm-kanban-column bg-muted/50 rounded-lg p-4 flex flex-col h-full ${arquivada ? 'opacity-90 border-2 border-dashed' : ''}`}>
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{etapa.icone}</span>
            <h3 className="font-semibold">{etapa.titulo}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{orcamentosAtivos.length}</Badge>
            {orcamentosCongelados.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Snowflake className="h-3 w-3 mr-1" />
                {orcamentosCongelados.length}
              </Badge>
            )}
            {arquivada && <Badge variant="outline" className="text-xs">Arquivada</Badge>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{etapa.descricao}</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-0">
        <div className="space-y-3">
          {orcamentosAtivos.length === 0 && orcamentosCongelados.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhum orçamento nesta etapa
            </div>
          ) : (
            <>
              {/* Orçamentos ativos */}
              {orcamentosAtivos.map((orc) => (
                <OrcamentoCRMCard
                  key={orc.id}
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