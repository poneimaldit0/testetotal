
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Orcamento } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Mail, Users, Calendar } from 'lucide-react';

interface ModalFornecedoresOrcamentoProps {
  orcamento: Orcamento | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ModalFornecedoresOrcamento: React.FC<ModalFornecedoresOrcamentoProps> = ({
  orcamento,
  isOpen,
  onClose
}) => {
  const abrirWhatsApp = (telefone: string, nome: string) => {
    const mensagem = `Olá ${nome}, entrando em contato sobre o orçamento ${orcamento?.id}.`;
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const telefoneComCodigo = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`;
    const url = `https://api.whatsapp.com/send/?phone=${telefoneComCodigo}&text=${encodeURIComponent(mensagem)}&type=phone_number&app_absent=0`;
    window.open(url, '_blank');
  };

  if (!orcamento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            Fornecedores Inscritos - {orcamento.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <h3 className="font-medium text-primary mb-2">Detalhes do Orçamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium">Necessidade:</span> {orcamento.necessidade}
              </div>
              <div>
                <span className="font-medium">Local:</span> {orcamento.local}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <Badge className={orcamento.status === 'aberto' ? 'bg-primary ml-2' : 'bg-accent ml-2'}>
                  {orcamento.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Data Publicação:</span> 
                {format(orcamento.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-secondary mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Fornecedores Inscritos ({orcamento.fornecedoresInscritos.length}/3)
            </h3>

            {orcamento.fornecedoresInscritos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum fornecedor inscrito ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orcamento.fornecedoresInscritos.map((fornecedor) => (
                  <div key={fornecedor.id} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-secondary">{fornecedor.empresa}</h4>
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(fornecedor.dataInscricao, "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div><strong>Responsável:</strong> {fornecedor.nome}</div>
                          <div><strong>Email:</strong> {fornecedor.email}</div>
                          <div><strong>Telefone:</strong> {fornecedor.telefone}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => abrirWhatsApp(fornecedor.telefone, fornecedor.nome)}
                          size="sm"
                          className="goodref-button-primary"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          onClick={() => window.open(`mailto:${fornecedor.email}`, '_blank')}
                          variant="outline"
                          size="sm"
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          E-mail
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {orcamento.dadosContato && (
            <div className="bg-secondary/10 p-4 rounded-lg border-l-4 border-secondary">
              <h4 className="font-medium text-secondary mb-2">Dados do Cliente</h4>
              <div className="text-sm text-secondary/80">
                <div><strong>Nome:</strong> {orcamento.dadosContato.nome}</div>
                <div><strong>Telefone:</strong> {orcamento.dadosContato.telefone}</div>
                <div><strong>Email:</strong> {orcamento.dadosContato.email}</div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
