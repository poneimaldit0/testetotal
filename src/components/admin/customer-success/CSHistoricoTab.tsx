import { CSHistoricoPipeline, CSRitualSemanal } from '@/types/customerSuccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Calendar, User } from 'lucide-react';

interface CSHistoricoTabProps {
  historico: CSHistoricoPipeline[];
  rituais: CSRitualSemanal[];
}

export function CSHistoricoTab({ historico, rituais }: CSHistoricoTabProps) {
  const rituaisConcluidos = rituais.filter(r => r.concluido).sort((a, b) => b.semana - a.semana);

  return (
    <div className="space-y-6">
      {/* Movimentações no Pipeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Movimentações no Pipeline</CardTitle></CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada</p>
          ) : (
            <div className="space-y-3">
              {historico.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                  {h.etapa_anterior && (
                    <Badge variant="outline" className={h.etapa_anterior.cor}>{h.etapa_anterior.nome}</Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge className={h.etapa_nova?.cor}>{h.etapa_nova?.nome}</Badge>
                  <div className="flex-1 text-right text-xs text-muted-foreground">
                    <div className="flex items-center justify-end gap-1">
                      <User className="h-3 w-3" />{h.movido_por_nome}
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(h.data_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rituais Concluídos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Rituais Semanais Concluídos</CardTitle></CardHeader>
        <CardContent>
          {rituaisConcluidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ritual concluído ainda</p>
          ) : (
            <div className="space-y-2">
              {rituaisConcluidos.map(r => (
                <div key={r.id} className="p-3 bg-muted/50 rounded space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge>Semana {r.semana}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.data_conclusao && format(new Date(r.data_conclusao), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>Inscrições: {r.inscricoes_orcamentos}</div>
                    <div>Visitas: {r.visitas_realizadas}</div>
                    <div>Orçamentos: {r.orcamentos_enviados}</div>
                    <div>Contratos: {r.contratos_fechados}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
