import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, PlayCircle, Package } from "lucide-react";

interface ItemProgress {
  id: string;
  nome: string;
  categoria: string;
  descricao?: string;
  percentualExecutado: number;
  percentualAcumulado: number;
  valorOriginal: number;
  valorExecutado: number;
  observacoes?: string;
}

interface ItemProgressDetailsProps {
  itens: ItemProgress[];
  titulo?: string;
}

export function ItemProgressDetails({ itens, titulo = "Progresso dos Itens" }: ItemProgressDetailsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getItemStatus = (percentual: number) => {
    if (percentual >= 100) return { status: 'completo', color: 'text-accent', icon: CheckCircle };
    if (percentual > 0) return { status: 'em_progresso', color: 'text-primary', icon: PlayCircle };
    return { status: 'nao_iniciado', color: 'text-muted-foreground', icon: Clock };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "hsl(var(--accent))";
    if (percentage > 0) return "hsl(var(--primary))";
    return "hsl(var(--muted-foreground))";
  };

  // Agrupar itens por categoria
  const itensPorCategoria = itens.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, ItemProgress[]>);

  if (itens.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum item detalhado encontrado para esta medição.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {titulo}
          <Badge variant="secondary" className="ml-auto">
            {itens.length} itens
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(itensPorCategoria).map(([categoria, itensCategoria]) => (
          <div key={categoria} className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground">{categoria}</h4>
              <Badge variant="outline" className="text-xs">
                {itensCategoria.length} itens
              </Badge>
            </div>
            
            <div className="space-y-3 pl-4">
              {itensCategoria.map((item) => {
                const itemStatus = getItemStatus(item.percentualAcumulado);
                const IconComponent = itemStatus.icon;
                
                return (
                  <div key={item.id} className="space-y-3 p-4 border border-border rounded-lg bg-background/50">
                    {/* Header do Item */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <IconComponent className={`h-4 w-4 ${itemStatus.color}`} />
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{item.nome}</h5>
                          {item.descricao && (
                            <p className="text-xs text-muted-foreground mt-1">{item.descricao}</p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${itemStatus.color}`}
                      >
                        {item.percentualAcumulado.toFixed(1)}%
                      </Badge>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso Acumulado</span>
                        <span>{item.percentualExecutado.toFixed(1)}% nesta medição</span>
                      </div>
                      <Progress 
                        value={item.percentualAcumulado} 
                        className="h-2"
                        style={{
                          '--progress-background': getProgressColor(item.percentualAcumulado)
                        } as React.CSSProperties}
                      />
                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Valor Original:</span>
                        <p className="font-medium">{formatCurrency(item.valorOriginal)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor Executado:</span>
                        <p className="font-medium text-primary">{formatCurrency(item.valorExecutado)}</p>
                      </div>
                    </div>

                    {/* Observações */}
                    {item.observacoes && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Observações:</p>
                        <p className="text-xs bg-muted/50 p-2 rounded">{item.observacoes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {categoria !== Object.keys(itensPorCategoria)[Object.keys(itensPorCategoria).length - 1] && (
              <Separator className="mt-4" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}