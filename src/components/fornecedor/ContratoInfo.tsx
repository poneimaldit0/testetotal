
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ContratoInfo: React.FC = () => {
  const { profile } = useAuth();
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiasRestantes = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase.rpc('calcular_dias_restantes_contrato', {
          user_id: profile.id
        });

        if (error) {
          console.error('Erro ao calcular dias restantes:', error);
          return;
        }

        setDiasRestantes(data);
      } catch (error) {
        console.error('Erro ao buscar dias restantes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiasRestantes();
  }, [profile?.id]);

  if (loading || !profile) {
    return null;
  }

  // Se não tem data de término, não mostrar nada
  if (!profile.data_termino_contrato) {
    return null;
  }

  // Definir cor e ícone baseado nos dias restantes
  const getCardStyle = () => {
    if (diasRestantes === null) return { color: 'text-gray-600', bg: 'bg-gray-50', icon: Clock };
    if (diasRestantes <= 0) return { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
    if (diasRestantes <= 7) return { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
    if (diasRestantes <= 30) return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock };
    return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle };
  };

  const { color, bg, icon: Icon } = getCardStyle();

  const getMessage = () => {
    if (diasRestantes === null) return 'Verificando contrato...';
    if (diasRestantes <= 0) return 'Contrato expirado';
    if (diasRestantes === 1) return '1 dia restante';
    return `${diasRestantes} dias restantes`;
  };

  return (
    <Card className={`${bg} border-0 shadow-md`}>
      <CardContent className="p-2 md:p-4">
        <div className="flex items-center space-x-1.5 md:space-x-3">
          <Icon className={`h-3.5 w-3.5 md:h-5 md:w-5 ${color} flex-shrink-0`} />
          <div className="min-w-0">
            <p className={`text-[10px] md:text-sm font-medium ${color}`}>
              Contrato
            </p>
            <p className={`text-sm md:text-lg font-bold ${color} truncate`}>
              {getMessage()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
