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
import type { ContaPagar, CategoriaFinanceira } from '@/types/financeiro';
import { SubcategoriaSelector } from './SubcategoriaSelector';

interface EditarContaPagarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaPagar;
  onSuccess: () => void;
}

export const EditarContaPagarModal = ({ open, onOpenChange, conta, onSuccess }: EditarContaPagarModalProps) => {
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedorEmail, setFornecedorEmail] = useState('');
  const [fornecedorTelefone, setFornecedorTelefone] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [dataVencimento, setDataVencimento] = useState<Date | undefined>();
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [subcategoriaId, setSubcategoriaId] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [valorPago, setValorPago] = useState('');
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [statusConciliacao, setStatusConciliacao] = useState<{ podeEditar: boolean; motivo: string }>({ podeEditar: false, motivo: '' });
  const [loadingConciliacao, setLoadingConciliacao] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const { editarContaPagar, buscarCategorias, verificarContaEditavelValor, loading } = useFinanceiro();
  const isMountedRef = useRef(true);

  // Memoizar funções para evitar re-criações
  const verificarEdicao = useCallback(async () => {
    if (conta?.status === 'pago') {
      setLoadingConciliacao(true);
      try {
        const resultado = await verificarContaEditavelValor(conta.id, 'pagar');
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
      setStatusConciliacao({ podeEditar: false, motivo: 'Conta não está paga' });
    }
  }, [conta?.id, conta?.status, verificarContaEditavelValor]);

  const loadCategorias = useCallback(async () => {
    console.log('🔄 Carregando categorias...');
    try {
      const categoriasData = await buscarCategorias();
      if (isMountedRef.current) {
        console.log('✅ Categorias carregadas:', categoriasData.length);
        setCategorias(categoriasData);
        return categoriasData;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
    }
    return [];
  }, [buscarCategorias]);

  const initializeFormData = useCallback(async () => {
    if (!conta) return;
    
    console.log('🚀 Inicializando dados do modal com conta:', {
      id: conta.id,
      categoria_id: conta.categoria_id,
      subcategoria_id: conta.subcategoria_id
    });

    setLoadingData(true);
    
    try {
      // Primeiro carregar as categorias
      const categoriasCarregadas = await loadCategorias();
      
      // Aguardar um pouco para garantir que o state foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Depois preencher os campos com os dados da conta
      setFornecedorNome(conta.fornecedor_nome || '');
      setFornecedorEmail(conta.fornecedor_email || '');
      setFornecedorTelefone(conta.fornecedor_telefone || '');
      setDescricao(conta.descricao || '');
      setValorOriginal(conta.valor_original.toString());
      setValorPago(conta.valor_pago?.toString() || '');
      setDataVencimento(criarDataLocal(conta.data_vencimento));
      setObservacoes(conta.observacoes || '');
      
      // Definir categoria_id e subcategoria_id apenas após categorias carregadas
      const categoriaIdValue = conta.categoria_id || '';
      const subcategoriaIdValue = conta.subcategoria_id || '';
      
      console.log('📋 Configurando categoria e subcategoria:', {
        categoria_id: categoriaIdValue,
        subcategoria_id: subcategoriaIdValue,
        categorias_disponiveis: categoriasCarregadas.length,
        categoria_encontrada: categoriasCarregadas.find(c => c.id === categoriaIdValue)?.nome
      });
      
      // Definir categoria e subcategoria simultaneamente
      setCategoriaId(categoriaIdValue);
      setSubcategoriaId(subcategoriaIdValue);
      
      // Executar verificação de edição se necessário
      verificarEdicao();
      
    } catch (error) {
      console.error('❌ Erro ao inicializar dados:', error);
    } finally {
      setLoadingData(false);
    }
  }, [conta, loadCategorias, verificarEdicao]);

  useEffect(() => {
    if (open && conta) {
      initializeFormData();
    }
  }, [open, conta?.id, initializeFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataVencimento) {
      alert('Por favor, selecione a data de vencimento');
      return;
    }

    const dadosAtualizados = {
      fornecedor_nome: fornecedorNome,
      fornecedor_email: fornecedorEmail || undefined,
      fornecedor_telefone: fornecedorTelefone || undefined,
      descricao,
      valor_original: parseFloat(valorOriginal),
      data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
      categoria_id: categoriaId || undefined,
      subcategoria_id: subcategoriaId || undefined,
      observacoes: observacoes || undefined,
    };

    const sucesso = await editarContaPagar(conta.id, dadosAtualizados);
    
    if (sucesso) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleSubmitValorPago = async () => {
    if (!valorPago) {
      alert('Por favor, informe o valor pago');
      return;
    }

    const sucesso = await editarContaPagar(conta.id, {
      valor_pago: parseFloat(valorPago)
    });
    
    if (sucesso) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setFornecedorNome('');
    setFornecedorEmail('');
    setFornecedorTelefone('');
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar Conta a Pagar</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 max-h-[calc(90vh-8rem)] pr-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 pb-8">
              {/* Coluna 1: Dados do Fornecedor */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground border-b pb-1">Dados do Fornecedor</h3>
                
                <div>
                  <Label htmlFor="fornecedor_nome">Nome do Fornecedor *</Label>
                  <Input
                    id="fornecedor_nome"
                    value={fornecedorNome}
                    onChange={(e) => setFornecedorNome(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="fornecedor_email">Email</Label>
                  <Input
                    id="fornecedor_email"
                    type="email"
                    value={fornecedorEmail}
                    onChange={(e) => setFornecedorEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="fornecedor_telefone">Telefone</Label>
                  <Input
                    id="fornecedor_telefone"
                    value={fornecedorTelefone}
                    onChange={(e) => setFornecedorTelefone(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Coluna 2: Dados Financeiros */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground border-b pb-1">Dados Financeiros</h3>
                
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
                  />
                </div>

                <div>
                  <Label>Data de Vencimento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataVencimento && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataVencimento ? format(dataVencimento, "dd/MM/yyyy") : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataVencimento}
                        onSelect={setDataVencimento}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select 
                    value={categoriaId} 
                    onValueChange={(value) => {
                      console.log('🏷️ Categoria selecionada:', value);
                      setCategoriaId(value);
                      setSubcategoriaId(''); // Limpar subcategoria ao trocar categoria
                    }}
                    disabled={loadingData}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={loadingData ? "Carregando categorias..." : "Selecione uma categoria"} 
                      />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      {categorias
                        .filter(cat => cat.tipo === 'despesa' && cat.ativa)
                        .map(categoria => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {loadingData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Carregando dados...
                    </p>
                  )}
                  {categoriaId && !loadingData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Categoria selecionada: {categorias.find(c => c.id === categoriaId)?.nome || 'Não encontrada'}
                    </p>
                  )}
                </div>

                {/* Sempre renderizar o SubcategoriaSelector, ele mesmo decide se deve aparecer */}
                <SubcategoriaSelector
                  categoriaId={categoriaId}
                  value={subcategoriaId}
                  onValueChange={(value) => {
                    console.log('🏷️ Subcategoria selecionada:', value);
                    setSubcategoriaId(value);
                  }}
                  disabled={loadingData}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Seção expandida: Valor Pago */}
            {conta.status === 'pago' && (
              <div className="mt-3 p-2 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm text-muted-foreground border-b pb-1 mb-2">Editar Valor Pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="valor_pago">Valor Pago *</Label>
                    <Input
                      id="valor_pago"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorPago}
                      onChange={(e) => setValorPago(e.target.value)}
                      disabled={!statusConciliacao.podeEditar || loadingConciliacao}
                    />
                    {loadingConciliacao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Verificando status de conciliação...
                      </p>
                    )}
                    {!loadingConciliacao && !statusConciliacao.podeEditar && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {statusConciliacao.motivo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end">
                    {!loadingConciliacao && statusConciliacao.podeEditar && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleSubmitValorPago}
                        disabled={loading}
                        className="w-full"
                      >
                        Atualizar Valor Pago
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seção expandida: Observações */}
            <div className="mt-3 pb-8">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={1}
                className="mt-1"
              />
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 pb-2 mt-2 border-t bg-background flex-shrink-0">
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