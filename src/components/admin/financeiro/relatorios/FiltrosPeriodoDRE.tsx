import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Loader2 } from 'lucide-react';

interface FiltrosPeriodoDREProps {
  onPeriodoChange: (inicio: string, fim: string) => void;
  loading?: boolean;
}

export const FiltrosPeriodoDRE = ({ onPeriodoChange, loading }: FiltrosPeriodoDREProps) => {
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [tipoFiltro, setTipoFiltro] = useState('personalizado');

  const aplicarFiltroRapido = (tipo: string) => {
    const hoje = new Date();
    let inicio: Date, fim: Date;

    switch (tipo) {
      case 'mes_atual':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case 'trimestre_atual':
        const mesAtual = hoje.getMonth();
        const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
        inicio = new Date(hoje.getFullYear(), inicioTrimestre, 1);
        fim = new Date(hoje.getFullYear(), inicioTrimestre + 3, 0);
        break;
      case 'ano_atual':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    const inicioStr = inicio.toISOString().split('T')[0];
    const fimStr = fim.toISOString().split('T')[0];
    
    setDataInicio(inicioStr);
    setDataFim(fimStr);
    onPeriodoChange(inicioStr, fimStr);
  };

  const aplicarFiltroPersonalizado = () => {
    onPeriodoChange(dataInicio, dataFim);
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="space-y-2">
            <Label>Filtro Rápido</Label>
            <Select value={tipoFiltro} onValueChange={(value) => {
              setTipoFiltro(value);
              if (value !== 'personalizado') {
                aplicarFiltroRapido(value);
              }
            }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                <SelectItem value="trimestre_atual">Trimestre Atual</SelectItem>
                <SelectItem value="ano_atual">Ano Atual</SelectItem>
                <SelectItem value="personalizado">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipoFiltro === 'personalizado' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="data-inicio">Data Início</Label>
                <Input
                  id="data-inicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-fim">Data Fim</Label>
                <Input
                  id="data-fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-40"
                />
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={aplicarFiltroPersonalizado}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};