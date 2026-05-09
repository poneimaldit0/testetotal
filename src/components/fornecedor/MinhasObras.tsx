import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useObras, Obra } from '@/hooks/useObras';
import { MapPin, Calendar, DollarSign, User, Phone, Mail, PlayCircle, PauseCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StatusBadge = ({ status }: { status: Obra['status'] }) => {
  const statusConfig = {
    aguardando_inicio: { label: 'Aguardando Início', variant: 'secondary' as const, icon: PlayCircle },
    em_andamento: { label: 'Em Andamento', variant: 'default' as const, icon: PlayCircle },
    pausada: { label: 'Pausada', variant: 'outline' as const, icon: PauseCircle },
    finalizada: { label: 'Finalizada', variant: 'default' as const, icon: CheckCircle },
    cancelada: { label: 'Cancelada', variant: 'destructive' as const, icon: PauseCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center gap-1 ${status === 'finalizada' ? 'bg-green-100 text-green-800' : ''}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

export const MinhasObras = () => {
  const { obras, loading, iniciarObra, finalizarObra, atualizarObra } = useObras();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Minhas Obras</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
          <PlayCircle className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma obra encontrada</h3>
        <p className="text-muted-foreground">
          Suas obras aparecerão aqui quando os clientes aceitarem suas propostas.
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

  const handleIniciarObra = async (obraId: string) => {
    const dataInicio = new Date().toISOString().split('T')[0];
    await iniciarObra(obraId, dataInicio);
  };

  const handlePausarObra = async (obraId: string) => {
    await atualizarObra(obraId, { status: 'pausada' });
  };

  const handleRetomarObra = async (obraId: string) => {
    await atualizarObra(obraId, { status: 'em_andamento' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Minhas Obras</h2>
        <Badge variant="outline" className="text-sm">
          {obras.length} obra{obras.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {obras.map((obra) => (
          <Card key={obra.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {obra.cliente?.nome || 'Cliente'}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Criada {formatDistanceToNow(new Date(obra.created_at), { 
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

              {/* Contato do Cliente */}
              {obra.cliente && (
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    <span>{obra.cliente.nome}</span>
                  </div>
                  {obra.cliente.telefone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{obra.cliente.telefone}</span>
                    </div>
                  )}
                  {obra.cliente.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{obra.cliente.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                {obra.status === 'aguardando_inicio' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleIniciarObra(obra.id)}
                    className="flex-1"
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Iniciar
                  </Button>
                )}
                
                {obra.status === 'em_andamento' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handlePausarObra(obra.id)}
                      className="flex-1"
                    >
                      <PauseCircle className="w-4 h-4 mr-1" />
                      Pausar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => finalizarObra(obra.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Finalizar
                    </Button>
                  </>
                )}
                
                {obra.status === 'pausada' && (
                  <Button 
                    size="sm"
                    onClick={() => handleRetomarObra(obra.id)}
                    className="flex-1"
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Retomar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};