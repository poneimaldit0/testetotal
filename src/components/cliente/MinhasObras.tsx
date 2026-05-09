import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useObras, Obra } from '@/hooks/useObras';
import { MapPin, Calendar, DollarSign, Building, Phone, Mail, PlayCircle, Settings, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const StatusBadge = ({ status }: { status: Obra['status'] }) => {
  const statusConfig = {
    aguardando_inicio: { label: 'Aguardando Início', variant: 'secondary' as const },
    em_andamento: { label: 'Em Andamento', variant: 'default' as const },
    pausada: { label: 'Pausada', variant: 'outline' as const },
    finalizada: { label: 'Finalizada', variant: 'default' as const },
    cancelada: { label: 'Cancelada', variant: 'destructive' as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={status === 'finalizada' ? 'bg-green-100 text-green-800' : ''}>
      {config.label}
    </Badge>
  );
};

export const MinhasObras = () => {
  const { obras, loading } = useObras();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Minhas Obras</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (obras.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Building className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma obra encontrada</h3>
        <p className="text-muted-foreground">
          Suas obras aparecerão aqui quando você aceitar propostas de fornecedores.
        </p>
      </div>
    );
  }

  const formatarEndereco = (endereco: any) => {
    if (!endereco) return 'Endereço não informado';
    return `${endereco.logradouro}, ${endereco.numero} - ${endereco.bairro}, ${endereco.cidade}/${endereco.uf}`;
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Minhas Obras</h2>
        <Badge variant="outline" className="text-sm">
          {obras.length} obra{obras.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {obras.map((obra) => (
          <Card key={obra.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    Obra com {obra.fornecedor?.empresa || obra.fornecedor?.nome || 'Fornecedor'}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Iniciada {formatDistanceToNow(new Date(obra.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </div>
                </div>
                <StatusBadge status={obra.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Valor */}
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-600">
                  {formatarValor(obra.valor_total)}
                </span>
              </div>

              {/* Endereço */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground line-clamp-2">
                  {formatarEndereco(obra.endereco_obra)}
                </span>
              </div>

              {/* Progresso */}
              {obra.status === 'em_andamento' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{obra.porcentagem_conclusao}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${obra.porcentagem_conclusao}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Datas importantes */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {obra.data_inicio && (
                  <div>
                    <span className="text-muted-foreground">Iniciada em:</span>
                    <div className="font-medium">
                      {new Date(obra.data_inicio).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
                {obra.data_fim_prevista && (
                  <div>
                    <span className="text-muted-foreground">Previsão:</span>
                    <div className="font-medium">
                      {new Date(obra.data_fim_prevista).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>

              {/* Contato do Fornecedor */}
              {obra.fornecedor && (
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4" />
                    <span>{obra.fornecedor.empresa || obra.fornecedor.nome}</span>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/cliente/obra/${obra.id}/cronograma`)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Cronograma
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/cliente/obra/${obra.id}/medicoes`)}
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Medições
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};