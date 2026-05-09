import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileEdit, Mail } from 'lucide-react';
import { PropostaComparacao } from '@/types/comparacao';
import { SolicitarRevisaoData } from '@/types/cliente';

interface SolicitarRevisaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: PropostaComparacao;
  onSolicitar: (dados: SolicitarRevisaoData) => void;
  loading?: boolean;
}

export const SolicitarRevisaoModal = ({
  open,
  onOpenChange,
  proposta,
  onSolicitar,
  loading = false
}: SolicitarRevisaoModalProps) => {
  const [email, setEmail] = useState('');
  const [motivoRevisao, setMotivoRevisao] = useState('');

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== MODAL DEBUG ===');
    console.log('Proposta completa:', proposta);
    console.log('ID da proposta:', proposta.id);
    console.log('Email cliente:', email);
    console.log('Motivo revisão:', motivoRevisao);
    
    onSolicitar({
      proposta_id: proposta.id,
      email_cliente: email,
      motivo_revisao: motivoRevisao
    });
  };

  const sugestoes = [
    "Preciso de ajustes no valor total da proposta",
    "Gostaria de incluir/remover alguns itens do orçamento",
    "Preciso de mais detalhes sobre os materiais utilizados",
    "Gostaria de alterar as condições de pagamento",
    "Preciso de esclarecimentos sobre o prazo de execução",
    "Gostaria de incluir garantias adicionais",
    "Outros (especificar no campo de observações)"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-orange-500" />
            Solicitar Revisão da Proposta
          </DialogTitle>
          <DialogDescription>
            Informe os ajustes necessários e o fornecedor será notificado para revisar a proposta
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da Proposta */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Proposta a ser Revisada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fornecedor</p>
                <p className="font-semibold">{proposta.fornecedor.empresa}</p>
                <p className="text-sm">{proposta.fornecedor.nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Atual</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatarValor(proposta.proposta.valor_total_estimado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados de Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Dados de Contato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="email">Seu E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Você receberá atualizações sobre a revisão neste e-mail
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Motivo da Revisão */}
          <Card>
            <CardHeader>
              <CardTitle>Motivo da Revisão</CardTitle>
              <p className="text-sm text-muted-foreground">
                Descreva detalhadamente quais ajustes você gostaria que fossem feitos na proposta
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sugestões */}
              <div>
                <Label className="text-sm font-medium">Sugestões (clique para usar):</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {sugestoes.map((sugestao, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto p-2 text-left whitespace-normal"
                      onClick={() => {
                        if (motivoRevisao && !motivoRevisao.includes(sugestao)) {
                          setMotivoRevisao(prev => prev + '\n\n' + sugestao);
                        } else {
                          setMotivoRevisao(sugestao);
                        }
                      }}
                    >
                      {sugestao}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Campo de texto */}
              <div>
                <Label htmlFor="motivo">Detalhes da Revisão *</Label>
                <Textarea
                  id="motivo"
                  value={motivoRevisao}
                  onChange={(e) => setMotivoRevisao(e.target.value)}
                  placeholder="Descreva em detalhes quais ajustes você gostaria na proposta..."
                  className="min-h-[120px]"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Seja específico para que o fornecedor possa atender melhor suas necessidades
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Como funciona a revisão:</p>
                <ul className="mt-2 space-y-1 text-blue-700">
                  <li>• O fornecedor será notificado sobre sua solicitação</li>
                  <li>• Ele poderá revisar e ajustar a proposta conforme solicitado</li>
                  <li>• Você receberá um e-mail quando a revisão estiver pronta</li>
                  <li>• Poderá visualizar a proposta atualizada através do mesmo link</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Solicitar Revisão'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};