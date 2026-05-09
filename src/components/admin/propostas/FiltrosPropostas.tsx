import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { FiltrosPropostas as TipoFiltros } from '@/hooks/usePropostas';
import { supabase } from '@/integrations/supabase/client';

interface FiltrosPropostasProps {
  onAplicarFiltros: (filtros: TipoFiltros) => void;
  onLimparFiltros: () => void;
}

export const FiltrosPropostas: React.FC<FiltrosPropostasProps> = ({
  onAplicarFiltros,
  onLimparFiltros
}) => {
  const [filtros, setFiltros] = useState<TipoFiltros>({});
  const [orcamentos, setOrcamentos] = useState<Array<{id: string, codigo_orcamento: string, necessidade: string}>>([]);
  const [fornecedores, setFornecedores] = useState<Array<{id: string, nome: string, empresa: string}>>([]);

  useEffect(() => {
    carregarOrcamentos();
    carregarFornecedores();
  }, []);

  const carregarOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, codigo_orcamento, necessidade')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    }
  };

  const carregarFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, empresa')
        .eq('tipo_usuario', 'fornecedor')
        .eq('status', 'ativo')
        .order('nome')
        .limit(100);
      
      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const handleFiltroChange = (campo: keyof TipoFiltros, valor: string) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor || undefined
    }));
  };

  const handleAplicar = () => {
    onAplicarFiltros(filtros);
  };

  const handleLimpar = () => {
    setFiltros({});
    onLimparFiltros();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="orcamento">Orçamento</Label>
          <Select 
            value={filtros.orcamento_id || ""} 
            onValueChange={(value) => handleFiltroChange('orcamento_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um orçamento" />
            </SelectTrigger>
            <SelectContent>
              {orcamentos.map((orcamento) => (
                <SelectItem key={orcamento.id} value={orcamento.id}>
                  {orcamento.codigo_orcamento || `ORG-${orcamento.id.slice(0, 8)}`} - {orcamento.necessidade.slice(0, 30)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fornecedor">Fornecedor</Label>
          <Select 
            value={filtros.fornecedor_id || ""} 
            onValueChange={(value) => handleFiltroChange('fornecedor_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {fornecedores.map((fornecedor) => (
                <SelectItem key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.nome} - {fornecedor.empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={filtros.status || ""} 
            onValueChange={(value) => handleFiltroChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_inicio">Data Início</Label>
          <Input
            id="data_inicio"
            type="date"
            value={filtros.data_inicio || ""}
            onChange={(e) => handleFiltroChange('data_inicio', e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleAplicar} className="goodref-button-primary">
          <Search className="h-4 w-4 mr-2" />
          Aplicar Filtros
        </Button>
        <Button onClick={handleLimpar} variant="outline">
          <X className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      </div>
    </div>
  );
};