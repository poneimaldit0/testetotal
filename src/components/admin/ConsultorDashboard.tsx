import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Clock, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { listPendingCompatRequests, PendingCompatRequest } from '@/lib/rota100Storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PainelCompatibilizacaoIA } from '@/components/admin/consultor/PainelCompatibilizacaoIA';

export function ConsultorDashboard() {
  const { profile } = useAuth();
  const [pendentes, setPendentes] = useState<PendingCompatRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPendingCompatRequests(profile?.id)
      .then(setPendentes)
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const copiarLink = (token: string) => {
    const url = `${window.location.origin}/rota100/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Painel do Consultor</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Solicitações de compatibilização e análises IA dos seus clientes.
        </p>
      </div>

      {/* Análises IA de Compatibilização */}
      <PainelCompatibilizacaoIA />

      {/* Contador */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Inbox className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : pendentes.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Solicitações pendentes
            {pendentes.length > 0 && (
              <Badge variant="destructive" className="ml-auto">{pendentes.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          )}

          {!loading && pendentes.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma solicitação pendente. 🎉
            </p>
          )}

          {!loading && pendentes.length > 0 && (
            <div className="space-y-3">
              {pendentes.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{req.clienteNome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Token: <span className="font-mono">{req.token.slice(0, 8)}…</span>
                    </p>
                    {req.orcamentoId && (
                      <p className="text-xs text-muted-foreground">
                        Orçamento: <span className="font-mono">{req.orcamentoId.slice(0, 8)}…</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(req.solicitadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1"
                      onClick={() => copiarLink(req.token)}
                    >
                      <Copy className="h-3 w-3" />
                      Copiar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
                      <a href={`/rota100/${req.token}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        Abrir
                      </a>
                    </Button>
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
