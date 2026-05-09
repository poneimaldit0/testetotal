import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { useEtapasConfig, TipoEtapa } from '@/hooks/useEtapasConfig';
import { EtapaConfigCard } from './EtapaConfigCard';
import { EditarEtapaModal } from './EditarEtapaModal';
import type { EtapaConfig } from '@/hooks/useEtapasConfig';
import { Badge } from '@/components/ui/badge';

export function GestaoEtapasCRM() {
  const [tipoCRM, setTipoCRM] = useState<TipoEtapa>('orcamentos');
  const [etapaEditando, setEtapaEditando] = useState<EtapaConfig | null>(null);

  const { etapas, isLoading, updateEtapa, toggleAtivo, isPending } = useEtapasConfig(tipoCRM);

  // Separar etapas normais e arquivadas
  const etapasNormais = etapas.filter(e => e.tipo === 'normal');
  const etapasArquivadas = etapas.filter(e => e.tipo === 'arquivado');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuração de Etapas CRM</h1>
        <p className="text-muted-foreground mt-1">
          Personalize a aparência e o comportamento das etapas do Kanban
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          As alterações nas etapas afetam apenas a visualização no Kanban. O código interno das etapas 
          não pode ser modificado para manter a integridade dos dados.
        </AlertDescription>
      </Alert>

      <Tabs value={tipoCRM} onValueChange={(v) => setTipoCRM(v as TipoEtapa)} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="orcamentos">CRM Orçamentos</TabsTrigger>
          <TabsTrigger value="marcenaria">🪚 CRM Marcenaria</TabsTrigger>
        </TabsList>

        <TabsContent value={tipoCRM} className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Carregando configurações...</p>
            </div>
          ) : (
            <>
              {/* Etapas Normais */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Etapas Ativas</CardTitle>
                      <CardDescription>Etapas do funil de vendas principal</CardDescription>
                    </div>
                    <Badge variant="secondary">{etapasNormais.length} etapas</Badge>
                  </div>
                </CardHeader>
                <div className="p-6 pt-0 space-y-3">
                  {etapasNormais.map(etapa => (
                    <EtapaConfigCard
                      key={etapa.id}
                      etapa={etapa}
                      onEdit={() => setEtapaEditando(etapa)}
                      onToggleAtivo={() => toggleAtivo(etapa.id)}
                    />
                  ))}
                </div>
              </Card>

              {/* Etapas Arquivadas */}
              {etapasArquivadas.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Etapas Arquivadas</CardTitle>
                        <CardDescription>Etapas finais do processo (Ganho/Perdido)</CardDescription>
                      </div>
                      <Badge variant="secondary">{etapasArquivadas.length} etapas</Badge>
                    </div>
                  </CardHeader>
                  <div className="p-6 pt-0 space-y-3">
                    {etapasArquivadas.map(etapa => (
                      <EtapaConfigCard
                        key={etapa.id}
                        etapa={etapa}
                        onEdit={() => setEtapaEditando(etapa)}
                        onToggleAtivo={() => toggleAtivo(etapa.id)}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Edição */}
      {etapaEditando && (
        <EditarEtapaModal
          etapa={etapaEditando}
          open={!!etapaEditando}
          onClose={() => setEtapaEditando(null)}
          onSave={(id, dados) => {
            updateEtapa({ id, dados });
            setEtapaEditando(null);
          }}
        />
      )}
    </div>
  );
}