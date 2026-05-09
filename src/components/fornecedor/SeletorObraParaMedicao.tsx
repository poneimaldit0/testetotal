import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, User, DollarSign, Calendar, Phone, MapPin } from 'lucide-react';
import { useContratosAtivos } from '@/hooks/useContratosAtivos';
import { Skeleton } from '@/components/ui/skeleton';

interface SeletorObraParaMedicaoProps {
  onSelecionarObra: (contratoId: string) => void;
}

export const SeletorObraParaMedicao: React.FC<SeletorObraParaMedicaoProps> = ({
  onSelecionarObra
}) => {
  const { contratos, loading, estatisticas } = useContratosAtivos();

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'assinado': return 'default';
      case 'aprovado_inicio': return 'secondary';
      case 'aguardando_assinatura': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assinado': return 'Assinado';
      case 'aprovado_inicio': return 'Em Andamento';
      case 'aguardando_assinatura': return 'Aguardando Assinatura';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Filtrar contratos assinados, aprovados para início, ou obras já em andamento
  const obrasDisponiveis = contratos.filter(contrato => 
    contrato.status_assinatura === 'assinado' || 
    contrato.status_assinatura === 'aprovado_inicio' ||
    contrato.obra?.status === 'em_andamento'
  );

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{estatisticas.total}</p>
                <p className="text-sm text-muted-foreground">Total de Contratos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{estatisticas.obras_em_andamento}</p>
                <p className="text-sm text-muted-foreground">Obras em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(estatisticas.valor_total)}</p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Obras */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Selecione uma obra para criar medição:</h3>
        
        {obrasDisponiveis.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma obra disponível para medição.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As obras precisam estar assinadas para criar medições.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {obrasDisponiveis.map((contrato) => (
              <Card key={contrato.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {contrato.cliente?.nome || 'Cliente não informado'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(contrato.status_assinatura)}>
                          {getStatusLabel(contrato.status_assinatura)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Contrato #{contrato.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => onSelecionarObra(contrato.id)}
                      size="sm"
                      className="shrink-0"
                    >
                      Criar Medição
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{contrato.cliente?.email || 'Email não informado'}</span>
                      </div>
                      
                      {contrato.cliente?.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{contrato.cliente.telefone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">Obra #{contrato.obra?.id.slice(0, 8) || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(contrato.valor_contrato || 0)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Criado em {new Date(contrato.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>Status da Obra:</strong> {contrato.obra?.status || 'Em andamento'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};