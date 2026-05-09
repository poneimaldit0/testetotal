
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calendar, Users } from 'lucide-react';
import { useUserStats } from '@/hooks/useUserStats';

export const UserStatsCards: React.FC = () => {
  const { stats, loading } = useUserStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[1, 2].map((i) => (
          <Card key={i} className="bg-white shadow-lg border border-gray-100 rounded-xl">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 w-16 bg-gray-200 rounded mb-1"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-secondary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold">{stats.inscricoesMesAtual}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Minhas Inscrições Este Mês</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 md:h-8 md:w-8 text-accent flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold">{stats.inscricoesTotais}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Total de Inscrições</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
