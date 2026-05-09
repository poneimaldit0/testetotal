import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { usePenalidadesFornecedor, PenalidadesAtivas as PenalidadesAtivasType } from '@/hooks/usePenalidadesFornecedor';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PENALIDADE_ICONS = {
  bloqueio_temporario: XCircle,
  reducao_propostas: AlertTriangle,
  impacto_avaliacao: AlertCircle,
  suspensao_completa: XCircle
};

const PENALIDADE_LABELS = {
  bloqueio_temporario: 'Bloqueio Temporário',
  reducao_propostas: 'Redução de Propostas',
  impacto_avaliacao: 'Impacto na Avaliação',
  suspensao_completa: 'Suspensão Completa'
};

const PENALIDADE_VARIANTS = {
  bloqueio_temporario: 'destructive',
  reducao_propostas: 'secondary',
  impacto_avaliacao: 'outline',
  suspensao_completa: 'destructive'
} as const;

export const PenalidadesAtivas = () => {
  const { user } = useAuth();
  const { verificarPenalidadesAtivas } = usePenalidadesFornecedor();
  const [penalidades, setPenalidades] = useState<PenalidadesAtivasType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarPenalidades = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const result = await verificarPenalidadesAtivas(user.id);
        setPenalidades(result);
      } catch (error) {
        console.error('Erro ao carregar penalidades:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarPenalidades();
  }, [user?.id, verificarPenalidadesAtivas]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Verificando penalidades...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!penalidades?.temPenalidades) {
    return null;
  }

  const temBloqueio = penalidades.tipos.includes('bloqueio_temporario') || 
                     penalidades.tipos.includes('suspensao_completa');

  return (
    <Alert variant={temBloqueio ? 'destructive' : 'default'} className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Penalidades Ativas</AlertTitle>
      <AlertDescription>
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            Você possui penalidades ativas que podem afetar sua capacidade de se inscrever em novos orçamentos:
          </p>
          
          <div className="space-y-2">
            {penalidades.detalhes.map((detalhe, index) => {
              const Icon = PENALIDADE_ICONS[detalhe.tipo as keyof typeof PENALIDADE_ICONS];
              const label = PENALIDADE_LABELS[detalhe.tipo as keyof typeof PENALIDADE_LABELS];
              const variant = PENALIDADE_VARIANTS[detalhe.tipo as keyof typeof PENALIDADE_VARIANTS];
              
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-background/50">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Badge variant={variant} className="text-xs">
                        {label}
                      </Badge>
                      {detalhe.observacoes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {detalhe.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-muted-foreground">Expira em:</div>
                    <div className="font-medium">
                      {format(new Date(detalhe.expiraEm), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {temBloqueio && (
            <div className="p-3 border border-destructive/20 rounded-lg bg-destructive/5">
              <p className="text-sm font-medium text-destructive">
                ⚠️ Você está temporariamente impedido de se inscrever em novos orçamentos
              </p>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};