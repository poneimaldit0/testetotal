import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, DollarSign, User, Clock, Download, Trash2 } from 'lucide-react';
import { exportarContasVencimentoExcel } from '@/utils/exportacaoContasFinanceiras';
import { formatarDataParaExibicao } from '@/utils/dateUtils';
import type { ContaVencimento } from '@/types/financeiro';

interface DetalhesVencimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'hoje' | 'amanha' | 'proximos7Dias' | 'vencidas';
  contas: ContaVencimento[];
  onAcaoRapida: (conta: ContaVencimento, acao: 'pagar' | 'receber' | 'editar' | 'perda' | 'excluir') => void;
}

const getTituloModal = (tipo: string) => {
  switch (tipo) {
    case 'hoje':
      return 'Contas que vencem hoje';
    case 'amanha':
      return 'Contas que vencem amanhã';
    case 'proximos7Dias':
      return 'Contas que vencem nos próximos 7 dias';
    case 'vencidas':
      return 'Contas vencidas';
    default:
      return 'Contas';
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const DetalhesVencimentoModal = ({ 
  isOpen, 
  onClose, 
  tipo, 
  contas, 
  onAcaoRapida 
}: DetalhesVencimentoModalProps) => {
  const contasReceber = contas.filter(c => c.tipo === 'conta_receber');
  const contasPagar = contas.filter(c => c.tipo === 'conta_pagar');
  
  const totalReceber = contasReceber.reduce((sum, c) => sum + c.valor_pendente, 0);
  const totalPagar = contasPagar.reduce((sum, c) => sum + c.valor_pendente, 0);

  const renderConta = (conta: ContaVencimento) => (
    <div key={conta.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-medium">{conta.descricao}</h4>
          <Badge variant={conta.tipo === 'conta_receber' ? 'default' : 'secondary'}>
            {conta.tipo === 'conta_receber' ? 'A Receber' : 'A Pagar'}
          </Badge>
          {conta.status === 'vencido' && (
            <Badge variant="destructive">Vencida</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{conta.cliente_fornecedor}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatarDataParaExibicao(conta.data_vencimento)}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">{formatCurrency(conta.valor_pendente)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAcaoRapida(conta, 'editar')}
        >
          Editar
        </Button>
        <Button
          variant={conta.tipo === 'conta_receber' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onAcaoRapida(conta, conta.tipo === 'conta_receber' ? 'receber' : 'pagar')}
        >
          {conta.tipo === 'conta_receber' ? 'Receber' : 'Pagar'}
        </Button>
        {conta.tipo === 'conta_receber' && conta.status === 'vencido' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onAcaoRapida(conta, 'perda')}
          >
            Marcar como Perda
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onAcaoRapida(conta, 'excluir')}
          title="Excluir conta"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {getTituloModal(tipo)}
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportarContasVencimentoExcel(contas, tipo)}
              className="mr-6"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-120px)] pr-4">
          <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{contas.length}</div>
              <div className="text-sm text-muted-foreground">Total de contas</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceber)}</div>
              <div className="text-sm text-muted-foreground">A Receber</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalPagar)}</div>
              <div className="text-sm text-muted-foreground">A Pagar</div>
            </div>
          </div>

          {/* Contas a Receber */}
          {contasReceber.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600">
                Contas a Receber ({contasReceber.length})
              </h3>
              <div className="space-y-2">
                {contasReceber.map(renderConta)}
              </div>
            </div>
          )}

          {contasReceber.length > 0 && contasPagar.length > 0 && <Separator />}

          {/* Contas a Pagar */}
          {contasPagar.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-red-600">
                Contas a Pagar ({contasPagar.length})
              </h3>
              <div className="space-y-2">
                {contasPagar.map(renderConta)}
              </div>
            </div>
          )}

          {contas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta encontrada para este período</p>
            </div>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};