import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';

interface FiltrosFinalceiroProps {
  onFiltrar: (filtros: {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    busca?: string;
  }) => void;
  onLimpar: () => void;
  tipo: 'receber' | 'pagar';
}

export const FiltrosFinanceiro = ({ onFiltrar, onLimpar, tipo }: FiltrosFinalceiroProps) => {
  const [filtros, setFiltros] = useState({
    status: '',
    dataInicio: '',
    dataFim: '',
    busca: ''
  });

  const handleFiltrar = () => {
    const filtrosLimpos = Object.fromEntries(
      Object.entries(filtros).filter(([_, value]) => value !== '')
    );
    onFiltrar(filtrosLimpos);
  };

  const handleLimpar = () => {
    setFiltros({
      status: '',
      dataInicio: '',
      dataFim: '',
      busca: ''
    });
    onLimpar();
  };

  const statusOptions = tipo === 'receber' 
    ? [
        { value: 'pendente', label: 'Pendente' },
        { value: 'recebido', label: 'Recebido' },
        { value: 'vencido', label: 'Vencido' },
        { value: 'cancelado', label: 'Cancelado' }
      ]
    : [
        { value: 'pendente', label: 'Pendente' },
        { value: 'pago', label: 'Pago' },
        { value: 'vencido', label: 'Vencido' },
        { value: 'cancelado', label: 'Cancelado' }
      ];

  // Atalhos rápidos de período
  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const proximos7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const handleAtalho = (tipo: 'hoje' | 'amanha' | '7dias' | 'mes') => {
    let novosFiltros = { ...filtros };
    
    switch (tipo) {
      case 'hoje':
        novosFiltros = { ...filtros, dataInicio: hoje, dataFim: hoje };
        break;
      case 'amanha':
        novosFiltros = { ...filtros, dataInicio: amanha, dataFim: amanha };
        break;
      case '7dias':
        novosFiltros = { ...filtros, dataInicio: hoje, dataFim: proximos7Dias };
        break;
      case 'mes':
        novosFiltros = { ...filtros, dataInicio: inicioMes, dataFim: '' };
        break;
    }
    
    setFiltros(novosFiltros);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca por texto */}
        <div className="space-y-2">
          <Label htmlFor="busca">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="busca"
              placeholder={`Buscar por ${tipo === 'receber' ? 'cliente' : 'fornecedor'} ou descrição...`}
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Período */}
        <div className="space-y-3">
          <Label>Período de Vencimento</Label>
          
          {/* Atalhos rápidos */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAtalho('hoje')}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAtalho('amanha')}
            >
              Amanhã
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAtalho('7dias')}
            >
              Próximos 7 dias
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAtalho('mes')}
            >
              Este mês
            </Button>
          </div>

          {/* Datas customizadas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleFiltrar} className="flex-1">
            <Filter className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>
          <Button variant="outline" onClick={handleLimpar}>
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};