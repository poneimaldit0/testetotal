
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC = () => (
  <Card className="goodref-card">
    <CardContent className="p-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
      <p className="text-muted-foreground">Carregando seus orçamentos...</p>
    </CardContent>
  </Card>
);

export const NotAuthenticatedState: React.FC = () => (
  <Card className="goodref-card">
    <CardContent className="p-6 text-center text-muted-foreground">
      Você precisa estar logado para ver seus orçamentos.
    </CardContent>
  </Card>
);

export const EmptyState: React.FC = () => (
  <Card className="goodref-card">
    <CardContent className="p-6 text-center text-muted-foreground">
      Você ainda não se inscreveu em nenhum orçamento.
    </CardContent>
  </Card>
);
