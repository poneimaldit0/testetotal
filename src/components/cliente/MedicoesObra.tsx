import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, FileText, Eye, Calculator } from 'lucide-react';
import { useMedicoes } from '@/hooks/useMedicoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicoesObraProps {
  contratoId: string;
}

export const MedicoesObra: React.FC<MedicoesObraProps> = ({ contratoId }) => {
  const { medicoes, loading, aprovarMedicao, reprovarMedicao } = useMedicoes(contratoId);
  const [observacoes, setObservacoes] = useState('');
  const [medicaoSelecionada, setMedicaoSelecionada] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const handleAprovar = async (medicaoId: string) => {
    await aprovarMedicao(medicaoId, observacoes);
    setObservacoes('');
    setModalAberto(false);
    setMedicaoSelecionada(null);
  };

  const handleReprovar = async (medicaoId: string) => {
    if (!observacoes.trim()) {
      return;
    }
    await reprovarMedicao(medicaoId, observacoes);
    setObservacoes('');
    setModalAberto(false);
    setMedicaoSelecionada(null);
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
          <CardTitle>Medições da Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando medições...</p>
        </CardContent>
      </Card>
    );
  }

  if (medicoes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medições da Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ainda não há medições enviadas pelo fornecedor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Medições da Obra
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {medicoes.map((medicao) => (
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
                {medicao.baseado_em_itens && (
                  <Badge variant="outline" className="text-xs">
                    <Calculator className="h-3 w-3 mr-1" />
                    Detalhada por itens
                  </Badge>
                )}
              </div>
              <span className="font-bold text-lg">
                {formatCurrency(medicao.valor_medicao)}
              </span>
            </div>
            
            <h4 className="font-medium">{medicao.descricao}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                <span className="text-muted-foreground text-sm">Observações do fornecedor:</span>
                <p className="text-sm mt-1">{medicao.observacoes_fornecedor}</p>
              </div>
            )}
            
            {medicao.observacoes_cliente && (
              <div>
                <span className="text-muted-foreground text-sm">Suas observações:</span>
                <p className="text-sm mt-1">{medicao.observacoes_cliente}</p>
              </div>
            )}
            
            {/* Detalhamento por itens se baseado_em_itens for true */}
            {medicao.baseado_em_itens && medicao.itens && medicao.itens.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-medium text-sm">Detalhamento por Itens:</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {medicao.itens.map((item, index) => (
                    <div key={item.id} className="border rounded p-3 space-y-2 text-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">Item {index + 1}</p>
                          {item.observacoes && (
                            <p className="text-muted-foreground">{item.observacoes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(item.valor_item_medicao)}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.percentual_executado}% de {formatCurrency(item.valor_item_original)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progresso total do item:</span>
                          <span>{item.percentual_acumulado}%</span>
                        </div>
                        <Progress value={item.percentual_acumulado} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {medicao.status === 'enviada' && (
              <div className="flex gap-2 pt-2">
                <Dialog open={modalAberto && medicaoSelecionada === medicao.id} onOpenChange={setModalAberto}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => setMedicaoSelecionada(medicao.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aprovar Medição #{medicao.numero_medicao}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Tem certeza que deseja aprovar esta medição?</p>
                      <div>
                        <label className="text-sm font-medium">Observações (opcional):</label>
                        <Textarea
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          placeholder="Digite suas observações sobre a medição..."
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAprovar(medicao.id)}>
                          Aprovar Medição
                        </Button>
                        <Button variant="outline" onClick={() => setModalAberto(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={modalAberto && medicaoSelecionada === medicao.id} onOpenChange={setModalAberto}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => setMedicaoSelecionada(medicao.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reprovar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reprovar Medição #{medicao.numero_medicao}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Por favor, informe o motivo da reprovação:</p>
                      <div>
                        <label className="text-sm font-medium">Motivo da reprovação:</label>
                        <Textarea
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          placeholder="Descreva o motivo da reprovação..."
                          className="mt-1"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="destructive"
                          onClick={() => handleReprovar(medicao.id)}
                          disabled={!observacoes.trim()}
                        >
                          Reprovar Medição
                        </Button>
                        <Button variant="outline" onClick={() => setModalAberto(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};