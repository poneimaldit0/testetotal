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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useSolicitacoesMateriais } from '@/hooks/useSolicitacoesMateriais';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SolicitarMateriaisProps {
  contratoId: string;
}

export const SolicitarMateriais: React.FC<SolicitarMateriaisProps> = ({ contratoId }) => {
  const { solicitacoes, loading, criarSolicitacao } = useSolicitacoesMateriais(contratoId);
  const [modalAberto, setModalAberto] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'inicial',
    descricao: '',
    valor_estimado: 0,
    observacoes_cliente: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await criarSolicitacao(formData);
    setFormData({
      tipo: 'inicial',
      descricao: '',
      valor_estimado: 0,
      observacoes_cliente: '',
    });
    setModalAberto(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-500';
      case 'rejeitado':
        return 'bg-red-500';
      case 'em_analise':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4" />;
      case 'em_analise':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'inicial':
        return 'bg-blue-100 text-blue-800';
      case 'extra':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <CardTitle>Materiais e Itens Extras</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando solicitações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materiais e Itens Extras
          </div>
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Material ou Item Extra</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tipo de solicitação:</label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({...formData, tipo: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inicial">Material Inicial</SelectItem>
                      <SelectItem value="extra">Item Extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Descrição:</label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Descreva o material ou item extra necessário..."
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Valor Estimado (R$):</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_estimado}
                    onChange={(e) => setFormData({...formData, valor_estimado: parseFloat(e.target.value) || 0})}
                    placeholder="Valor estimado do material/item"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Observações:</label>
                  <Textarea
                    value={formData.observacoes_cliente}
                    onChange={(e) => setFormData({...formData, observacoes_cliente: e.target.value})}
                    placeholder="Informações adicionais..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit">Enviar Solicitação</Button>
                  <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {solicitacoes.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhuma solicitação de material ou item extra foi feita ainda.
          </p>
        ) : (
          solicitacoes.map((solicitacao) => (
            <div
              key={solicitacao.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(solicitacao.status)} variant="secondary">
                    {getStatusIcon(solicitacao.status)}
                    <span className="ml-1 capitalize">
                      {solicitacao.status.replace('_', ' ')}
                    </span>
                  </Badge>
                  <Badge className={getTipoColor(solicitacao.tipo)} variant="outline">
                    {solicitacao.tipo === 'inicial' ? 'Material Inicial' : 'Item Extra'}
                  </Badge>
                </div>
                {solicitacao.valor_estimado && (
                  <span className="font-bold">
                    {formatCurrency(solicitacao.valor_estimado)}
                  </span>
                )}
              </div>
              
              <h4 className="font-medium">{solicitacao.descricao}</h4>
              
              <div className="text-sm">
                <span className="text-muted-foreground">Solicitado em:</span>{' '}
                {format(new Date(solicitacao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              
              {solicitacao.data_aprovacao && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Aprovado em:</span>{' '}
                  {format(new Date(solicitacao.data_aprovacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
              
              {solicitacao.data_necessidade && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Data necessidade:</span>{' '}
                  {format(new Date(solicitacao.data_necessidade), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              )}
              
              {solicitacao.observacoes_cliente && (
                <div>
                  <span className="text-muted-foreground text-sm">Suas observações:</span>
                  <p className="text-sm mt-1">{solicitacao.observacoes_cliente}</p>
                </div>
              )}
              
              
              {solicitacao.observacoes_fornecedor && (
                <div>
                  <span className="text-muted-foreground text-sm">Observações do fornecedor:</span>
                  <p className="text-sm mt-1">{solicitacao.observacoes_fornecedor}</p>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};