import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useChecklistsAdmin } from '@/hooks/useChecklistsAdmin';
import { useEtapasConfig } from '@/hooks/useEtapasConfig';
import { ItemChecklistCard } from './ItemChecklistCard';
import { NovoItemChecklistModal } from './NovoItemChecklistModal';
import { EditarItemChecklistModal } from './EditarItemChecklistModal';
import { ChecklistStatistics } from './ChecklistStatistics';
import { GestaoEtapasCRM } from './GestaoEtapasCRM';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { ChecklistItem } from '@/hooks/useChecklistsAdmin';

type TipoCRM = 'orcamentos' | 'marcenaria';

export function GestaoChecklistsCRM() {
  const [tipoCRM, setTipoCRM] = useState<TipoCRM>('orcamentos');
  const [etapaFiltro, setEtapaFiltro] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<ChecklistItem | null>(null);

  const { items, statistics, isLoading, reorderItems } = useChecklistsAdmin(tipoCRM);
  const { etapas: etapasConfig } = useEtapasConfig(tipoCRM);

  // Filtrar itens
  const itensFiltrados = items.filter(item => {
    const etapaItem = tipoCRM === 'orcamentos' 
      ? (item as any).etapa_crm 
      : (item as any).etapa_marcenaria;

    const matchEtapa = etapaFiltro === 'todas' || etapaItem === etapaFiltro;
    const matchBusca = !busca || item.titulo.toLowerCase().includes(busca.toLowerCase());

    return matchEtapa && matchBusca;
  });

  // Agrupar por etapa
  const itemsPorEtapa: Record<string, ChecklistItem[]> = {};
  itensFiltrados.forEach(item => {
    const etapaItem = tipoCRM === 'orcamentos' 
      ? (item as any).etapa_crm 
      : (item as any).etapa_marcenaria;
    if (!itemsPorEtapa[etapaItem]) {
      itemsPorEtapa[etapaItem] = [];
    }
    itemsPorEtapa[etapaItem].push(item);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Checklists CRM</h1>
          <p className="text-muted-foreground mt-1">
            Configure os itens de checklist para cada etapa dos CRMs
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      {statistics && <ChecklistStatistics statistics={statistics} />}

      <Tabs defaultValue="itens" className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="itens">Itens de Checklist</TabsTrigger>
          <TabsTrigger value="etapas">Configuração de Etapas</TabsTrigger>
        </TabsList>

        {/* Tab de Itens de Checklist */}
        <TabsContent value="itens" className="space-y-4">
          <Tabs value={tipoCRM} onValueChange={(v) => setTipoCRM(v as TipoCRM)} className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="orcamentos">CRM Orçamentos</TabsTrigger>
              <TabsTrigger value="marcenaria">🪚 CRM Marcenaria</TabsTrigger>
            </TabsList>

        <TabsContent value={tipoCRM} className="space-y-4">
          {/* Filtros e Ações */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por título..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={etapaFiltro} onValueChange={setEtapaFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as etapas</SelectItem>
                    {etapasConfig.map(etapa => (
                      <SelectItem key={etapa.valor} value={etapa.valor}>
                        {etapa.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setModalNovoAberto(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </div>
          </Card>

          {/* Lista de Itens */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando itens...
            </div>
          ) : itensFiltrados.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {busca || etapaFiltro !== 'todas' 
                  ? 'Nenhum item encontrado com os filtros aplicados'
                  : 'Nenhum item de checklist cadastrado ainda'
                }
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(itemsPorEtapa)
                .sort(([etapaA], [etapaB]) => {
                  const ordemA = etapasConfig.find(e => e.valor === etapaA)?.ordem ?? 999;
                  const ordemB = etapasConfig.find(e => e.valor === etapaB)?.ordem ?? 999;
                  return ordemA - ordemB;
                })
                .map(([etapaValor, itemsEtapa]) => {
                  const configEtapa = etapasConfig.find(e => e.valor === etapaValor);
                  return (
                    <div key={etapaValor} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: configEtapa?.cor || '#6b7280' }}
                        />
                        <h3 className="text-lg font-semibold text-foreground">
                          {configEtapa?.titulo || etapaValor}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          ({itemsEtapa.length} {itemsEtapa.length === 1 ? 'item' : 'itens'})
                        </span>
                      </div>
                      <div className="grid gap-3">
                        {itemsEtapa.map(item => (
                          <ItemChecklistCard
                            key={item.id}
                            item={item}
                            tipoCRM={tipoCRM}
                            onEdit={() => setItemEditando(item)}
                          />
                        ))}
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
          </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab de Configuração de Etapas */}
        <TabsContent value="etapas">
          <GestaoEtapasCRM />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <NovoItemChecklistModal
        open={modalNovoAberto}
        onClose={() => setModalNovoAberto(false)}
        tipoCRM={tipoCRM}
      />

      {itemEditando && (
        <EditarItemChecklistModal
          open={!!itemEditando}
          onClose={() => setItemEditando(null)}
          item={itemEditando}
          tipoCRM={tipoCRM}
        />
      )}
    </div>
  );
}
