import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar, Users, Cloud, Camera, Package, ZoomIn } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiarioObraClienteProps {
  contratoId?: string;
}

interface RegistroDiario {
  id: string;
  data_registro: string;
  atividades_realizadas: string;
  materiais_utilizados?: string;
  funcionarios_presentes?: string;
  clima?: string;
  observacoes?: string;
  fotos?: any;
  visivel_cliente: boolean;
}

export const DiarioObraCliente: React.FC<DiarioObraClienteProps> = ({ contratoId }) => {
  const [imageViewer, setImageViewer] = useState<string | null>(null);
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['diario-obra-cliente', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      
      const { data, error } = await supabase
        .from('diario_obra')
        .select('*')
        .eq('contrato_id', contratoId)
        .eq('visivel_cliente', true)
        .order('data_registro', { ascending: false });

      if (error) throw error;
      return data as RegistroDiario[];
    },
    enabled: !!contratoId
  });

  const getClimaIcon = (clima: string) => {
    switch (clima) {
      case 'ensolarado':
        return '☀️';
      case 'nublado':
        return '☁️';
      case 'chuvoso':
        return '🌧️';
      case 'vento':
        return '💨';
      default:
        return '🌤️';
    }
  };

  const getClimaColor = (clima: string) => {
    switch (clima) {
      case 'ensolarado':
        return 'bg-yellow-100 text-yellow-800';
      case 'nublado':
        return 'bg-gray-100 text-gray-800';
      case 'chuvoso':
        return 'bg-blue-100 text-blue-800';
      case 'vento':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (!contratoId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Diário da Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contrato não encontrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Diário da Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando registros...</p>
        </CardContent>
      </Card>
    );
  }

  if (registros.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Diário da Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ainda não há registros no diário da obra.</p>
            <p className="text-sm">O fornecedor publicará os registros diários aqui.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Diário da Obra
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {registros.map((registro) => (
          <div
            key={registro.id}
            className="border rounded-lg p-4 space-y-4"
          >
            {/* Header com data e clima */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {format(new Date(registro.data_registro), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {registro.clima && (
                <Badge className={getClimaColor(registro.clima)} variant="outline">
                  {getClimaIcon(registro.clima)} {registro.clima}
                </Badge>
              )}
            </div>

            {/* Atividades realizadas */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Atividades Realizadas</h4>
              <p className="text-sm">{registro.atividades_realizadas}</p>
            </div>

            {/* Informações adicionais em grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registro.materiais_utilizados && (
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Materiais Utilizados
                  </h5>
                  <p className="text-sm mt-1">{registro.materiais_utilizados}</p>
                </div>
              )}

              {registro.funcionarios_presentes && (
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Funcionários Presentes
                  </h5>
                  <p className="text-sm mt-1">{registro.funcionarios_presentes}</p>
                </div>
              )}
            </div>

            {/* Observações */}
            {registro.observacoes && (
              <div>
                <h5 className="font-medium text-sm text-muted-foreground">Observações</h5>
                <p className="text-sm mt-1">{registro.observacoes}</p>
              </div>
            )}

            {/* Fotos */}
            {registro.fotos && registro.fotos.length > 0 && (
              <div>
                <h5 className="font-medium text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <Camera className="h-3 w-3" />
                  Fotos do Dia ({registro.fotos.length})
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {registro.fotos.map((foto: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => setImageViewer(foto)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      
      {/* Modal de Visualização de Imagem */}
      {imageViewer && (
        <Dialog open={!!imageViewer} onOpenChange={() => setImageViewer(null)}>
          <DialogContent className="max-w-4xl">
            <img
              src={imageViewer}
              alt="Visualização"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
