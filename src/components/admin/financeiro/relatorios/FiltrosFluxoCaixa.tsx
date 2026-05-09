import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FiltrosFluxoCaixaProps {
  onFiltroChange: (inicio: string, fim: string, incluirPagas: boolean, incluirEntradasFuturas: boolean, statusSelecionados: string[]) => void;
  loading?: boolean;
}

export const FiltrosFluxoCaixa: React.FC<FiltrosFluxoCaixaProps> = ({
  onFiltroChange,
  loading = false
}) => {
  const [dataInicio, setDataInicio] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  });
  
  const [dataFim, setDataFim] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  
  const [incluirPagas, setIncluirPagas] = useState(true);
  const [incluirEntradasFuturas, setIncluirEntradasFuturas] = useState(true);
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);

  const statusOptions = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'pago', label: 'Pago' },
    { value: 'recebido', label: 'Recebido' },
    { value: 'perda', label: 'Perda' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'vencido', label: 'Vencido' }
  ];

  const aplicarFiltroRapido = (tipo: string) => {
    const hoje = new Date();
    let inicioStr = '';
    let fimStr = '';

    switch (tipo) {
      case 'proximos_7_dias':
        inicioStr = hoje.toISOString().split('T')[0];
        fimStr = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'proximos_15_dias':
        inicioStr = hoje.toISOString().split('T')[0];
        fimStr = new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'proximos_30_dias':
        inicioStr = hoje.toISOString().split('T')[0];
        fimStr = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'mes_atual':
        inicioStr = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
        fimStr = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'mes_anterior':
        inicioStr = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0];
        fimStr = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'trimestre_atual':
        const trimestreAtual = Math.floor(hoje.getMonth() / 3);
        inicioStr = new Date(hoje.getFullYear(), trimestreAtual * 3, 1).toISOString().split('T')[0];
        fimStr = new Date(hoje.getFullYear(), (trimestreAtual + 1) * 3, 0).toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setDataInicio(inicioStr);
    setDataFim(fimStr);
    onFiltroChange(inicioStr, fimStr, incluirPagas, incluirEntradasFuturas, statusSelecionados);
  };

  const aplicarFiltroPersonalizado = () => {
    onFiltroChange(dataInicio, dataFim, incluirPagas, incluirEntradasFuturas, statusSelecionados);
  };

  const handleIncluirPagasChange = (checked: boolean) => {
    setIncluirPagas(checked);
    onFiltroChange(dataInicio, dataFim, checked, incluirEntradasFuturas, statusSelecionados);
  };

  const handleIncluirEntradasFuturasChange = (checked: boolean) => {
    setIncluirEntradasFuturas(checked);
    onFiltroChange(dataInicio, dataFim, incluirPagas, checked, statusSelecionados);
  };

  const handleStatusChange = (status: string) => {
    const novosStatus = statusSelecionados.includes(status)
      ? statusSelecionados.filter(s => s !== status)
      : [...statusSelecionados, status];
    
    setStatusSelecionados(novosStatus);
    onFiltroChange(dataInicio, dataFim, incluirPagas, incluirEntradasFuturas, novosStatus);
  };

  const removerStatus = (status: string) => {
    const novosStatus = statusSelecionados.filter(s => s !== status);
    setStatusSelecionados(novosStatus);
    onFiltroChange(dataInicio, dataFim, incluirPagas, incluirEntradasFuturas, novosStatus);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filtro-rapido">Período Rápido</Label>
              <Select onValueChange={aplicarFiltroRapido}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proximos_7_dias">Próximos 7 dias</SelectItem>
                  <SelectItem value="proximos_15_dias">Próximos 15 dias</SelectItem>
                  <SelectItem value="proximos_30_dias">Próximos 30 dias</SelectItem>
                  <SelectItem value="mes_atual">Mês atual</SelectItem>
                  <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                  <SelectItem value="trimestre_atual">Trimestre atual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-inicio">Data Início</Label>
              <Input
                id="data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-fim">Data Fim</Label>
              <Input
                id="data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filtro-status">Status</Label>
              <Select onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem 
                      key={status.value} 
                      value={status.value}
                      disabled={statusSelecionados.includes(status.value)}
                    >
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {statusSelecionados.map((status) => {
                    const statusLabel = statusOptions.find(s => s.value === status)?.label || status;
                    return (
                      <Badge key={status} variant="secondary" className="text-xs">
                        {statusLabel}
                        <X 
                          className="w-3 h-3 ml-1 cursor-pointer" 
                          onClick={() => removerStatus(status)} 
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Opções</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluir-pagas"
                    checked={incluirPagas}
                    onCheckedChange={handleIncluirPagasChange}
                  />
                  <Label htmlFor="incluir-pagas" className="text-sm">
                    Incluir pagas/recebidas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluir-entradas-futuras"
                    checked={incluirEntradasFuturas}
                    onCheckedChange={handleIncluirEntradasFuturasChange}
                  />
                  <Label htmlFor="incluir-entradas-futuras" className="text-sm">
                    Incluir entradas futuras
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={aplicarFiltroPersonalizado} disabled={loading}>
              {loading ? "Carregando..." : "Aplicar Filtro Personalizado"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};