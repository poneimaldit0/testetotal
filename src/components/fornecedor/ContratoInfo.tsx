
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDiasRestantesContrato } from '@/hooks/useDiasRestantesContrato';

export const ContratoInfo: React.FC = () => {
  const { profile } = useAuth();
  const { diasRestantes, loading } = useDiasRestantesContrato(profile?.id);

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
