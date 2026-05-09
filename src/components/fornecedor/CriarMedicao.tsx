import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileText, Plus } from 'lucide-react';
import { useMedicoes } from '@/hooks/useMedicoes';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CriarMedicaoProps {
  contratoId?: string;
}

export const CriarMedicao: React.FC<CriarMedicaoProps> = ({ contratoId }) => {
  const { medicoes, loading, criarMedicao } = useMedicoes(contratoId);
  const [modalAberto, setModalAberto] = useState(false);
  const [formData, setFormData] = useState({
    numero_medicao: (medicoes?.length || 0) + 1,
    descricao: '',
    data_medicao: new Date().toISOString().split('T')[0],
    valor_medicao: 0,
    observacoes_fornecedor: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contratoId) return;

    try {
      // Buscar fornecedor_id do profile atual
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select('fornecedor_id')
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;

      await criarMedicao({
        ...formData,
        contrato_id: contratoId,
        fornecedor_id: contrato.fornecedor_id,
        status: 'enviada',
        arquivos_comprobatorios: null,
        data_aprovacao: null,
        data_pagamento: null,
        observacoes_cliente: null,
      });

      setFormData({
        numero_medicao: (medicoes?.length || 0) + 2,
        descricao: '',
        data_medicao: new Date().toISOString().split('T')[0],
        valor_medicao: 0,
        observacoes_fornecedor: '',
      });
      setModalAberto(false);
    } catch (error: any) {
      console.error('Erro ao criar medição:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovada':
        return 'bg-green-500';
      case 'reprovada':
        return 'bg-red-500';
      case 'paga':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medições Tradicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando medições...</p>
        </CardContent>
      </Card>
    );
  }

  // Filtrar apenas medições tradicionais (não baseadas em itens)
  const medicoesTradiconais = medicoes?.filter(m => !m.baseado_em_itens) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Medições Tradicionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Medição Tradicional</h4>
          <p className="text-sm text-muted-foreground">
            Crie uma medição informando o valor total manualmente. 
            Ideal para contratos sem detalhamento por itens ou para ajustes específicos.
          </p>
        </div>
        
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Nova Medição Tradicional
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Medição Tradicional</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Número da Medição:</label>
                  <Input
                    type="number"
                    value={formData.numero_medicao}
                    onChange={(e) => setFormData({...formData, numero_medicao: parseInt(e.target.value) || 1})}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Data da Medição:</label>
                  <Input
                    type="date"
                    value={formData.data_medicao}
                    onChange={(e) => setFormData({...formData, data_medicao: e.target.value})}
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Descrição:</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Descreva os serviços executados nesta medição..."
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Valor da Medição (R$):</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_medicao}
                    onChange={(e) => setFormData({...formData, valor_medicao: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Observações:</label>
                  <Textarea
                    value={formData.observacoes_fornecedor}
                    onChange={(e) => setFormData({...formData, observacoes_fornecedor: e.target.value})}
                    placeholder="Observações sobre esta medição..."
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Enviar Medição</Button>
                <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lista das medições tradicionais existentes */}
        {medicoesTradiconais.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Histórico de Medições Tradicionais</h4>
            {medicoesTradiconais.map((medicao) => (
              <div
                key={medicao.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(medicao.status)} variant="secondary">
                      Medição #{medicao.numero_medicao}
                    </Badge>
                    <span className="font-medium capitalize">
                      {medicao.status.replace('_', ' ')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Tradicional
                    </Badge>
                  </div>
                  <span className="font-bold text-lg">
                    {formatCurrency(medicao.valor_medicao)}
                  </span>
                </div>
                
                <h4 className="font-medium">{medicao.descricao}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data da medição:</span>
                    <p>
                      {format(new Date(medicao.data_medicao), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {medicao.data_aprovacao && (
                    <div>
                      <span className="text-muted-foreground">Data aprovação:</span>
                      <p>
                        {format(new Date(medicao.data_aprovacao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {medicao.data_pagamento && (
                    <div>
                      <span className="text-muted-foreground">Data pagamento:</span>
                      <p>
                        {format(new Date(medicao.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
                
                {medicao.observacoes_fornecedor && (
                  <div>
                    <span className="text-muted-foreground text-sm">Suas observações:</span>
                    <p className="text-sm mt-1">{medicao.observacoes_fornecedor}</p>
                  </div>
                )}
                
                {medicao.observacoes_cliente && (
                  <div>
                    <span className="text-muted-foreground text-sm">Observações do cliente:</span>
                    <p className="text-sm mt-1">{medicao.observacoes_cliente}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {medicoesTradiconais.length === 0 && (
          <p className="text-muted-foreground text-center py-6">
            Nenhuma medição tradicional enviada ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
};