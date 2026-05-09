import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { criarDataLocal } from '@/utils/dateUtils';
import type { ContaReceber, CategoriaFinanceira } from '@/types/financeiro';
import { SubcategoriaSelector } from './SubcategoriaSelector';

interface EditarContaReceberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaReceber;
  onSuccess: () => void;
}

export const EditarContaReceberModal = ({ open, onOpenChange, conta, onSuccess }: EditarContaReceberModalProps) => {
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>();
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [subcategoriaId, setSubcategoriaId] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [valorRecebido, setValorRecebido] = useState('');
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [statusConciliacao, setStatusConciliacao] = useState<{ podeEditar: boolean; motivo: string }>({ podeEditar: false, motivo: '' });
  const [loadingConciliacao, setLoadingConciliacao] = useState(false);

  const { editarContaReceber, buscarCategorias, verificarContaEditavelValor, loading } = useFinanceiro();
  const isMountedRef = useRef(true);

  // Memoizar funções para evitar re-criações
  const verificarEdicao = useCallback(async () => {
    if (conta?.status === 'recebido') {
      setLoadingConciliacao(true);
      try {
        const resultado = await verificarContaEditavelValor(conta.id, 'receber');
        if (isMountedRef.current) {
          setStatusConciliacao(resultado);
        }
      } catch (error) {
        if (isMountedRef.current) {
          setStatusConciliacao({ podeEditar: false, motivo: 'Erro ao verificar status' });
        }
      } finally {
        setLoadingConciliacao(false);
      }
    } else {
      setStatusConciliacao({ podeEditar: false, motivo: 'Conta não está recebida' });
    }
  }, [conta?.id, conta?.status, verificarContaEditavelValor]);

  const loadCategorias = useCallback(async () => {
    try {
      const categoriasData = await buscarCategorias();
      if (isMountedRef.current) {
        setCategorias(categoriasData);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }, [buscarCategorias]);

  useEffect(() => {
    if (open && conta) {
      // Preencher os campos com os dados da conta
      setClienteNome(conta.cliente_nome || '');
      setClienteEmail(conta.cliente_email || '');
      setClienteTelefone(conta.cliente_telefone || '');
      setDescricao(conta.descricao || '');
      setValorOriginal(conta.valor_original.toString());
      setValorRecebido(conta.valor_recebido?.toString() || '');
      setDataVencimento(criarDataLocal(conta.data_vencimento));
      setCategoriaId(conta.categoria_id || '');
      setSubcategoriaId(conta.subcategoria_id || '');
      setObservacoes(conta.observacoes || '');
      
      // Executar verificações
      verificarEdicao();
      loadCategorias();
    }
  }, [open, conta?.id]); // Dependências mínimas

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataVencimento) {
      alert('Por favor, selecione a data de vencimento');
      return;
    }

    const dadosAtualizados = {
      cliente_nome: clienteNome,
      cliente_email: clienteEmail || undefined,
      cliente_telefone: clienteTelefone || undefined,
      descricao,
      valor_original: parseFloat(valorOriginal),
      data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
      categoria_id: categoriaId || undefined,
      subcategoria_id: subcategoriaId || undefined,
      observacoes: observacoes || undefined,
    };

    const sucesso = await editarContaReceber(conta.id, dadosAtualizados);
    
    if (sucesso) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleSubmitValorRecebido = async () => {
    if (!valorRecebido) {
      alert('Por favor, informe o valor recebido');
      return;
    }

    const sucesso = await editarContaReceber(conta.id, {
      valor_recebido: parseFloat(valorRecebido)
    });
    
    if (sucesso) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setClienteNome('');
    setClienteEmail('');
    setClienteTelefone('');
    setDescricao('');
    setValorOriginal('');
    setDataVencimento(undefined);
    setCategoriaId('');
    setObservacoes('');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) {
        resetForm();
        isMountedRef.current = false;
      } else {
        isMountedRef.current = true;
      }
    }}>
      <DialogContent className="max-w-2xl w-full max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="text-xl font-semibold">Editar Conta a Receber</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-6 py-4">
              {/* Seção Dados do Cliente */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">
                  Dados do Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
                    <Input
                      id="cliente_nome"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cliente_email">Email do Cliente</Label>
                    <Input
                      id="cliente_email"
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cliente_telefone">Telefone do Cliente</Label>
                    <Input
                      id="cliente_telefone"
                      value={clienteTelefone}
                      onChange={(e) => setClienteTelefone(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Dados Financeiros */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">
                  Dados Financeiros
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor">Valor Original *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorOriginal}
                      onChange={(e) => setValorOriginal(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Data de Vencimento *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !dataVencimento && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataVencimento ? format(dataVencimento, "dd/MM/yyyy") : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100] bg-background border shadow-lg pointer-events-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={dataVencimento}
                          onSelect={setDataVencimento}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={categoriaId} onValueChange={(value) => {
                      setCategoriaId(value);
                      setSubcategoriaId(''); // Reset subcategoria when categoria changes
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent 
                        className="z-[200] bg-background border shadow-lg pointer-events-auto"
                        position="popper"
                        sideOffset={4}
                      >
                        {categorias
                          .filter(cat => cat.ativa && cat.tipo === 'receita')
                          .map(categoria => (
                            <SelectItem key={categoria.id} value={categoria.id}>
                              {categoria.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <SubcategoriaSelector
                    categoriaId={categoriaId}
                    value={subcategoriaId}
                    onValueChange={setSubcategoriaId}
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={3}
                      className="mt-1 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Valor Recebido - apenas para contas recebidas */}
              {conta.status === 'recebido' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground border-b pb-2">
                    Valor Recebido
                  </h3>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="valor_recebido">Valor Recebido *</Label>
                        <Input
                          id="valor_recebido"
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorRecebido}
                          onChange={(e) => setValorRecebido(e.target.value)}
                          disabled={!statusConciliacao.podeEditar || loadingConciliacao}
                          className="mt-1"
                        />
                        {loadingConciliacao && (
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            Verificando status de conciliação...
                          </p>
                        )}
                        {!loadingConciliacao && !statusConciliacao.podeEditar && (
                          <p className="text-sm text-destructive mt-2">
                            {statusConciliacao.motivo}
                          </p>
                        )}
                      </div>
                      {!loadingConciliacao && statusConciliacao.podeEditar && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleSubmitValorRecebido}
                          disabled={loading}
                          className="w-full sm:w-auto"
                        >
                          {loading ? 'Atualizando...' : 'Atualizar Valor Recebido'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};