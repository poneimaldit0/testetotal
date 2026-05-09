import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TabelaComparadorPropostas } from './TabelaComparadorPropostas';
import { useOrcamentosComPropostas } from '@/hooks/useOrcamentosComPropostas';
import { FileText, Filter } from 'lucide-react';

export const ListaOrcamentosComparador = () => {
  const { orcamentos, loading, carregarOrcamentosComPropostas } = useOrcamentosComPropostas();
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [valorMinimo, setValorMinimo] = useState<string>('');
  const [valorMaximo, setValorMaximo] = useState<string>('');

  const aplicarFiltros = () => {
    const filtros = {
      status: filtroStatus !== 'todos' ? filtroStatus : undefined,
      temPropostas: true, // Sempre mostrar apenas orçamentos com propostas
      valorMinimo: valorMinimo ? parseFloat(valorMinimo) : undefined,
      valorMaximo: valorMaximo ? parseFloat(valorMaximo) : undefined,
      busca: busca.trim() || undefined
    };
    
    carregarOrcamentosComPropostas(filtros);
  };

  const limparFiltros = () => {
    setFiltroStatus('todos');
    setBusca('');
    setValorMinimo('');
    setValorMaximo('');
    carregarOrcamentosComPropostas({ temPropostas: true });
  };

  const handleVerComparacao = (orcamentoId: string) => {
    console.log('Ver comparação do orçamento:', orcamentoId);
    // Esta função será implementada se necessário
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Comparador de Propostas
              </CardTitle>
              <CardDescription>
                Visualize e compare propostas recebidas pelos fornecedores para cada orçamento.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="busca">Buscar</Label>
              <Input
                id="busca"
                placeholder="Buscar orçamento ou fornecedor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filtro-status">Status do Orçamento</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="valor-minimo">Valor Mínimo (R$)</Label>
              <Input
                id="valor-minimo"
                type="number"
                placeholder="0,00"
                value={valorMinimo}
                onChange={(e) => setValorMinimo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="valor-maximo">Valor Máximo (R$)</Label>
              <Input
                id="valor-maximo"
                type="number"
                placeholder="999999,00"
                value={valorMaximo}
                onChange={(e) => setValorMaximo(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={aplicarFiltros} className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Orçamentos com Propostas */}
      <TabelaComparadorPropostas 
        orcamentos={orcamentos} 
        loading={loading}
        onVerComparacao={handleVerComparacao}
      />
    </div>
  );
};