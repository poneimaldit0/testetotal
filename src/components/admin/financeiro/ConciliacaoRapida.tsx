import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { useConciliacaoRapida } from '@/hooks/useConciliacaoRapida';
import { useConfiguracaoFinanceira } from '@/hooks/useConfiguracaoFinanceira';
import { ContaBancaria, CategoriaFinanceira, FornecedorCliente } from '@/types/financeiro';
import type { ItemExtratoBanco, ContaParaVincular, SugestaoVinculo } from '@/types/conciliacao';
import { 
  Upload, 
  ArrowRight, 
  Check, 
  X, 
  Link2, 
  Unlink, 
  Sparkles, 
  FileSpreadsheet,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Plus,
  EyeOff,
  RotateCcw,
  CalendarClock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format, parseISO, addMonths, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FornecedorClienteCombobox } from './FornecedorClienteCombobox';
import { SubcategoriaSelector } from './SubcategoriaSelector';
import { Checkbox } from '@/components/ui/checkbox';

interface ConciliacaoRapidaProps {
  contas: ContaBancaria[];
  onClose: () => void;
  onConcluido: () => void;
}

export function ConciliacaoRapida({ contas, onClose, onConcluido }: ConciliacaoRapidaProps) {
  const [contaSelecionada, setContaSelecionada] = useState<string>(contas[0]?.id || '');
  const [itemSelecionado, setItemSelecionado] = useState<ItemExtratoBanco | null>(null);
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [contaParaVincular, setContaParaVincular] = useState<ContaParaVincular | null>(null);
  const [showConfirmarValorModal, setShowConfirmarValorModal] = useState(false);
  const [corrigirValor, setCorrigirValor] = useState(true);
  const [showCriarContaModal, setShowCriarContaModal] = useState(false);
  const [novaContaClienteFornecedor, setNovaContaClienteFornecedor] = useState('');
  const [novaContaDescricao, setNovaContaDescricao] = useState('');
  const [marcarComoBaixado, setMarcarComoBaixado] = useState(true);

  // Novos estados para modal completo
  const [tipoFornecedor, setTipoFornecedor] = useState<'cadastrado' | 'novo'>('cadastrado');
  const [fornecedorSelecionadoId, setFornecedorSelecionadoId] = useState('');
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [subcategoriaSelecionada, setSubcategoriaSelecionada] = useState('');
  const [fornecedores, setFornecedores] = useState<FornecedorCliente[]>([]);
  const [clientes, setClientes] = useState<FornecedorCliente[]>([]);
  const [tipoLancamento, setTipoLancamento] = useState<'unico' | 'recorrente'>('unico');
  const [frequenciaRecorrencia, setFrequenciaRecorrencia] = useState<'mensal' | 'semanal' | 'quinzenal'>('mensal');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2');
  const [loadingDados, setLoadingDados] = useState(false);
  const [criandoConta, setCriandoConta] = useState(false);

  const {
    loading,
    itensExtrato,
    contasDisponiveis,
    vinculos,
    sugestoes,
    importarExtrato,
    vincularItem,
    desvincularItem,
    aceitarSugestao,
    conciliarVinculados,
    calcularResumo,
    limpar,
    ignorarItem,
    restaurarItem,
    criarContaDoExtrato
  } = useConciliacaoRapida(contaSelecionada);

  const { buscarCategorias, buscarFornecedoresClientes } = useConfiguracaoFinanceira();

  const resumo = calcularResumo();

  // Carregar dados quando o modal de criar conta abre
  useEffect(() => {
    if (showCriarContaModal && itemSelecionado) {
      const carregarDados = async () => {
        setLoadingDados(true);
        try {
          const [cats, forns, clis] = await Promise.all([
            buscarCategorias(),
            buscarFornecedoresClientes('fornecedor'),
            buscarFornecedoresClientes('cliente')
          ]);

          // Filtrar categorias pelo tipo correto
          const tipoCategoria = itemSelecionado.tipo === 'entrada' ? 'receita' : 'despesa';
          setCategorias(cats.filter(c => c.ativa && c.tipo === tipoCategoria));
          setFornecedores(forns.filter(f => f.ativo !== false));
          setClientes(clis.filter(c => c.ativo !== false));
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
        } finally {
          setLoadingDados(false);
        }
      };
      carregarDados();
    }
  }, [showCriarContaModal, itemSelecionado, buscarCategorias, buscarFornecedoresClientes]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await importarExtrato(acceptedFiles[0]);
    }
  }, [importarExtrato]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/x-ofx': ['.ofx'],
      'application/ofx': ['.ofx']
    },
    maxFiles: 1
  });

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    try {
      return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return data;
    }
  };

  const handleVincular = (item: ItemExtratoBanco) => {
    setItemSelecionado(item);
    setShowVincularModal(true);
  };

  const handleSelecionarConta = (conta: ContaParaVincular) => {
    if (!itemSelecionado) return;
    
    // Verificar se valores são diferentes
    const diferenca = Math.abs(itemSelecionado.valor - conta.valor);
    if (diferenca > 0.01) {
      // Valores diferentes - mostrar modal de confirmação
      setContaParaVincular(conta);
      setShowVincularModal(false);
      setCorrigirValor(true);
      setShowConfirmarValorModal(true);
    } else {
      // Valores iguais - vincular direto
      vincularItem(itemSelecionado.id, conta.id, conta.tipo);
      setShowVincularModal(false);
      setItemSelecionado(null);
    }
  };

  const handleConfirmarVinculacao = () => {
    if (itemSelecionado && contaParaVincular) {
      vincularItem(
        itemSelecionado.id, 
        contaParaVincular.id, 
        contaParaVincular.tipo,
        corrigirValor,
        itemSelecionado.valor
      );
      setShowConfirmarValorModal(false);
      setItemSelecionado(null);
      setContaParaVincular(null);
    }
  };

  const handleConciliar = async () => {
    const sucesso = await conciliarVinculados();
    if (sucesso) {
      onConcluido();
    }
  };

  const handleCriarConta = (item: ItemExtratoBanco) => {
    setItemSelecionado(item);
    setNovaContaDescricao(item.descricao);
    setNovaContaClienteFornecedor('');
    setMarcarComoBaixado(true);
    // Reset novos estados
    setTipoFornecedor('cadastrado');
    setFornecedorSelecionadoId('');
    setCategoriaSelecionada('');
    setSubcategoriaSelecionada('');
    setTipoLancamento('unico');
    setFrequenciaRecorrencia('mensal');
    setQuantidadeParcelas('2');
    setShowCriarContaModal(true);
  };

  // Obter nome do fornecedor/cliente selecionado
  const getNomeFornecedorCliente = () => {
    if (tipoFornecedor === 'novo') {
      return novaContaClienteFornecedor;
    }
    const lista = itemSelecionado?.tipo === 'entrada' ? clientes : fornecedores;
    const selecionado = lista.find(f => f.id === fornecedorSelecionadoId);
    return selecionado?.nome || '';
  };

  // Gerar preview das parcelas recorrentes
  const gerarPreviewParcelas = () => {
    if (!itemSelecionado || tipoLancamento !== 'recorrente') return [];
    const parcelas: { numero: number; data: Date; valor: number }[] = [];
    const qtd = parseInt(quantidadeParcelas) || 2;
    const dataBase = parseISO(itemSelecionado.data);
    
    for (let i = 0; i < Math.min(qtd, 5); i++) {
      let dataParcela: Date;
      if (frequenciaRecorrencia === 'mensal') {
        dataParcela = addMonths(dataBase, i);
      } else if (frequenciaRecorrencia === 'quinzenal') {
        dataParcela = addWeeks(dataBase, i * 2);
      } else {
        dataParcela = addWeeks(dataBase, i);
      }
      parcelas.push({
        numero: i + 1,
        data: dataParcela,
        valor: itemSelecionado.valor
      });
    }
    return parcelas;
  };

  const handleConfirmarCriarConta = async () => {
    if (criandoConta) return; // Evitar duplo clique
    
    const nomeFornecedor = getNomeFornecedorCliente();
    if (!itemSelecionado || !nomeFornecedor.trim()) return;

    // Verificar se item já está vinculado
    if (itemSelecionado.vinculado) {
      toast({
        title: "Item já processado",
        description: "Este item do extrato já foi vinculado a uma conta.",
        variant: "destructive"
      });
      return;
    }
    
    setCriandoConta(true);
    try {
      const sucesso = await criarContaDoExtrato(itemSelecionado, {
        clienteFornecedor: nomeFornecedor,
        fornecedorClienteId: tipoFornecedor === 'cadastrado' ? fornecedorSelecionadoId : undefined,
        descricao: novaContaDescricao || itemSelecionado.descricao,
        categoriaId: categoriaSelecionada || undefined,
        subcategoriaId: subcategoriaSelecionada || undefined,
        marcarComoBaixado,
        tipoLancamento,
        frequenciaRecorrencia: tipoLancamento === 'recorrente' ? frequenciaRecorrencia : undefined,
        quantidadeParcelas: tipoLancamento === 'recorrente' ? parseInt(quantidadeParcelas) : undefined
      });

      if (sucesso) {
        setShowCriarContaModal(false);
        setItemSelecionado(null);
      }
    } finally {
      setCriandoConta(false);
    }
  };

  // Validar se pode criar a conta
  const podecriarConta = () => {
    if (tipoFornecedor === 'cadastrado') {
      return !!fornecedorSelecionadoId;
    }
    return novaContaClienteFornecedor.trim().length > 0;
  };

  // Filtrar contas compatíveis com o item selecionado
  const contasCompativeis = itemSelecionado 
    ? contasDisponiveis
        .filter(c => 
          (itemSelecionado.tipo === 'entrada' && c.tipo === 'receber') ||
          (itemSelecionado.tipo === 'saida' && c.tipo === 'pagar')
        )
        .sort((a, b) => {
          // Ordenar por data de vencimento (mais próxima primeiro)
          const dataA = new Date(a.dataVencimento).getTime();
          const dataB = new Date(b.dataVencimento).getTime();
          return dataA - dataB;
        })
    : [];

  // Verificar se uma conta já está vinculada a outro item do extrato
  const getItemVinculadoAConta = (contaId: string): ItemExtratoBanco | undefined => {
    return itensExtrato.find(item => 
      item.contaVinculadaId === contaId && 
      item.id !== itemSelecionado?.id // Não considerar o item atual
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Conciliação Rápida
          </h2>
          <p className="text-muted-foreground">
            Importe seu extrato bancário e vincule automaticamente às contas do sistema
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Voltar
        </Button>
      </div>

      {/* Seleção de Conta */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label>Conta Bancária</Label>
              <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.filter(c => c.ativa).map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome} - {conta.banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {itensExtrato.length > 0 && (
              <Button variant="ghost" onClick={limpar} className="mt-6">
                <X className="h-4 w-4 mr-2" />
                Limpar Extrato
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload de Extrato */}
      {itensExtrato.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {isDragActive ? "Solte o arquivo aqui" : "Arraste o extrato bancário"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Formatos aceitos: OFX, CSV
              </p>
              <Button variant="outline" className="mt-4">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      {itensExtrato.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Itens no Extrato</div>
              <div className="text-2xl font-bold">{resumo.totalItensExtrato}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Vinculados</div>
              <div className="text-2xl font-bold text-green-600">{resumo.itensVinculados}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Créditos</div>
              <div className="text-2xl font-bold text-blue-600">{formatarValor(resumo.totalCreditos)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Débitos</div>
              <div className="text-2xl font-bold text-red-600">{formatarValor(resumo.totalDebitos)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sugestões Automáticas */}
      {sugestoes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Sugestões de Vinculação
            </CardTitle>
            <CardDescription>
              Encontramos {sugestoes.length} possíveis correspondências
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {sugestoes.slice(0, 5).map((sugestao, idx) => (
                  <div 
                    key={`${sugestao.extratoItem.id}-${sugestao.conta.id}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {sugestao.extratoItem.tipo === 'entrada' 
                            ? <ArrowDownCircle className="h-4 w-4 text-green-600 shrink-0" />
                            : <ArrowUpCircle className="h-4 w-4 text-red-600 shrink-0" />
                          }
                          <span className="font-medium truncate">{sugestao.extratoItem.descricao}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatarValor(sugestao.extratoItem.valor)}
                          </span>
                        </div>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="shrink-0">
                            {sugestao.conta.tipo === 'receber' ? 'Receber' : 'Pagar'}
                          </Badge>
                          <span className="truncate">{sugestao.conta.cliente_fornecedor}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {sugestao.motivoSugestao}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      onClick={() => aceitarSugestao(sugestao)}
                      className="shrink-0 ml-4"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Lista de Itens do Extrato */}
      {itensExtrato.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Extrato Importado</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {itensExtrato.filter(i => !i.ignorado).map(item => (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      item.vinculado ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-card"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {item.tipo === 'entrada' 
                        ? <ArrowDownCircle className="h-5 w-5 text-green-600" />
                        : <ArrowUpCircle className="h-5 w-5 text-red-600" />
                      }
                      <div>
                        <div className="font-medium">{item.descricao}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatarData(item.data)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "font-bold",
                        item.tipo === 'entrada' ? "text-green-600" : "text-red-600"
                      )}>
                        {item.tipo === 'entrada' ? '+' : '-'}{formatarValor(item.valor)}
                      </span>

                      {item.vinculado ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Vinculado
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => desvincularItem(item.id)}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleVincular(item)}
                          >
                            <Link2 className="h-4 w-4 mr-1" />
                            Vincular
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCriarConta(item)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Criar Conta
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => ignorarItem(item.id)}
                            title="Ignorar este item"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Itens Ignorados */}
                {itensExtrato.filter(i => i.ignorado).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">
                      Itens Ignorados ({itensExtrato.filter(i => i.ignorado).length})
                    </div>
                    {itensExtrato.filter(i => i.ignorado).map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 opacity-60"
                      >
                        <div className="flex items-center gap-4">
                          {item.tipo === 'entrada' 
                            ? <ArrowDownCircle className="h-5 w-5 text-muted-foreground" />
                            : <ArrowUpCircle className="h-5 w-5 text-muted-foreground" />
                          }
                          <div>
                            <div className="font-medium text-muted-foreground">{item.descricao}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatarData(item.data)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-muted-foreground">
                            {item.tipo === 'entrada' ? '+' : '-'}{formatarValor(item.valor)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => restaurarItem(item.id)}
                            title="Restaurar item"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Botão de Conciliar */}
      {vinculos.size > 0 && (
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConciliar} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Conciliar {vinculos.size} {vinculos.size === 1 ? 'Item' : 'Itens'}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Botão de Concluir quando itens foram criados diretamente */}
      {vinculos.size === 0 && itensExtrato.filter(i => i.vinculado).length > 0 && (
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => {
            toast({ 
              title: "Conciliação concluída", 
              description: `${itensExtrato.filter(i => i.vinculado).length} itens foram processados com sucesso` 
            });
            onConcluido();
          }}>
            <Check className="h-4 w-4 mr-2" />
            Concluir ({itensExtrato.filter(i => i.vinculado).length} itens processados)
          </Button>
        </div>
      )}

      {/* Modal de Vinculação */}
      <Dialog open={showVincularModal} onOpenChange={setShowVincularModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular Transação</DialogTitle>
            <DialogDescription>
              Selecione a conta correspondente a esta movimentação
            </DialogDescription>
          </DialogHeader>

          {itemSelecionado && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  {itemSelecionado.tipo === 'entrada' 
                    ? <ArrowDownCircle className="h-5 w-5 text-green-600" />
                    : <ArrowUpCircle className="h-5 w-5 text-red-600" />
                  }
                  <div>
                    <div className="font-medium">{itemSelecionado.descricao}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatarData(itemSelecionado.data)} • {formatarValor(itemSelecionado.valor)}
                    </div>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                {contasCompativeis.length > 0 ? (
                  <div className="space-y-2">
                    {contasCompativeis.map(conta => {
                      const itemVinculado = getItemVinculadoAConta(conta.id);
                      const jaVinculada = !!itemVinculado;
                      
                      return (
                        <div 
                          key={conta.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                            jaVinculada 
                              ? "bg-muted/50 border-dashed opacity-75 hover:opacity-100" 
                              : "hover:bg-muted"
                          )}
                          onClick={() => handleSelecionarConta(conta)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">
                                {conta.tipo === 'receber' ? 'A Receber' : 'A Pagar'}
                              </Badge>
                              <span className="font-medium">{conta.cliente_fornecedor}</span>
                              {jaVinculada && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                  <Link2 className="h-3 w-3 mr-1" />
                                  Já vinculado
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {conta.descricao} • Venc: {formatarData(conta.dataVencimento)}
                            </div>
                            {jaVinculada && itemVinculado && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                                <span>Vinculado a:</span>
                                <span className="truncate max-w-[200px] font-medium">{itemVinculado.descricao}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            <div className="font-bold">{formatarValor(conta.valor)}</div>
                            <Badge variant={conta.status === 'vencido' ? 'destructive' : 'secondary'}>
                              {conta.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      Nenhuma conta {itemSelecionado.tipo === 'entrada' ? 'a receber' : 'a pagar'} encontrada
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVincularModal(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Valor Diferente */}
      <Dialog open={showConfirmarValorModal} onOpenChange={setShowConfirmarValorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Valores Diferentes
            </DialogTitle>
            <DialogDescription>
              O valor do extrato é diferente do valor cadastrado na conta
            </DialogDescription>
          </DialogHeader>

          {itemSelecionado && contaParaVincular && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Extrato Bancário</div>
                  <div className="font-bold text-lg">{formatarValor(itemSelecionado.valor)}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Conta no Sistema</div>
                  <div className="font-bold text-lg">{formatarValor(contaParaVincular.valor)}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Diferença: {formatarValor(Math.abs(itemSelecionado.valor - contaParaVincular.valor))}
                </div>
              </div>

              <RadioGroup 
                value={corrigirValor ? 'corrigir' : 'manter'} 
                onValueChange={(v) => setCorrigirValor(v === 'corrigir')}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="corrigir" id="corrigir" className="mt-0.5" />
                  <Label htmlFor="corrigir" className="cursor-pointer flex-1">
                    <div className="font-medium">Corrigir valor da conta</div>
                    <div className="text-sm text-muted-foreground">
                      O valor de {formatarValor(contaParaVincular.valor)} estava errado. 
                      Corrigir para {formatarValor(itemSelecionado.valor)}
                    </div>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="manter" id="manter" className="mt-0.5" />
                  <Label htmlFor="manter" className="cursor-pointer flex-1">
                    <div className="font-medium">Manter valores diferentes</div>
                    <div className="text-sm text-muted-foreground">
                      Baixar com o valor do extrato, mas manter o valor original da conta
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowConfirmarValorModal(false);
              setContaParaVincular(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarVinculacao}>
              Confirmar Vinculação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar Conta - Completo */}
      <Dialog open={showCriarContaModal} onOpenChange={setShowCriarContaModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Criar Nova Conta
            </DialogTitle>
            <DialogDescription>
              Criar uma {itemSelecionado?.tipo === 'entrada' ? 'conta a receber' : 'conta a pagar'} a partir deste item do extrato
            </DialogDescription>
          </DialogHeader>

          {itemSelecionado && (
            <div className="space-y-4">
              {/* Item do Extrato */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  {itemSelecionado.tipo === 'entrada' 
                    ? <ArrowDownCircle className="h-4 w-4 text-green-600" />
                    : <ArrowUpCircle className="h-4 w-4 text-red-600" />
                  }
                  <span className="text-sm text-muted-foreground">Item do Extrato</span>
                </div>
                <div className="font-medium">{itemSelecionado.descricao}</div>
                <div className="flex justify-between text-sm mt-1">
                  <span>{formatarData(itemSelecionado.data)}</span>
                  <span className={cn(
                    "font-bold",
                    itemSelecionado.tipo === 'entrada' ? "text-green-600" : "text-red-600"
                  )}>
                    {formatarValor(itemSelecionado.valor)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Tipo de Fornecedor/Cliente */}
                <div className="space-y-2">
                  <Label>{itemSelecionado.tipo === 'entrada' ? 'Cliente' : 'Fornecedor'}</Label>
                  <RadioGroup
                    value={tipoFornecedor}
                    onValueChange={(v) => {
                      setTipoFornecedor(v as 'cadastrado' | 'novo');
                      setFornecedorSelecionadoId('');
                      setNovaContaClienteFornecedor('');
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cadastrado" id="cadastrado" />
                      <Label htmlFor="cadastrado" className="cursor-pointer">Cadastrado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="novo" id="novo" />
                      <Label htmlFor="novo" className="cursor-pointer">Novo</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Buscar ou Digitar Fornecedor/Cliente */}
                {tipoFornecedor === 'cadastrado' ? (
                  <div>
                    {loadingDados ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando...
                      </div>
                    ) : (
                      <FornecedorClienteCombobox
                        fornecedores={(itemSelecionado.tipo === 'entrada' ? clientes : fornecedores).map(f => ({
                          id: f.id,
                          nome: f.nome,
                          email: f.email || undefined,
                          telefone: f.telefone || undefined
                        }))}
                        value={fornecedorSelecionadoId}
                        onValueChange={setFornecedorSelecionadoId}
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <Input
                      value={novaContaClienteFornecedor}
                      onChange={(e) => setNovaContaClienteFornecedor(e.target.value)}
                      placeholder={itemSelecionado.tipo === 'entrada' ? 'Nome do cliente' : 'Nome do fornecedor'}
                    />
                  </div>
                )}

                {/* Descrição */}
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={novaContaDescricao}
                    onChange={(e) => setNovaContaDescricao(e.target.value)}
                    placeholder="Descrição da conta"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoriaSelecionada} onValueChange={(v) => {
                    setCategoriaSelecionada(v);
                    setSubcategoriaSelecionada('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategoria */}
                {categoriaSelecionada && (
                  <SubcategoriaSelector
                    categoriaId={categoriaSelecionada}
                    value={subcategoriaSelecionada}
                    onValueChange={setSubcategoriaSelecionada}
                    label="Subcategoria"
                  />
                )}

                {/* Tipo de Lançamento */}
                <div className="space-y-2">
                  <Label>Tipo de Lançamento</Label>
                  <RadioGroup
                    value={tipoLancamento}
                    onValueChange={(v) => setTipoLancamento(v as 'unico' | 'recorrente')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="unico" id="unico" />
                      <Label htmlFor="unico" className="cursor-pointer">Único</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="recorrente" id="recorrente" />
                      <Label htmlFor="recorrente" className="cursor-pointer flex items-center gap-1">
                        <CalendarClock className="h-4 w-4" />
                        Recorrente
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Campos de Recorrência */}
                {tipoLancamento === 'recorrente' && (
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Frequência</Label>
                        <Select value={frequenciaRecorrencia} onValueChange={(v) => setFrequenciaRecorrencia(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="quinzenal">Quinzenal</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min="2"
                          max="60"
                          value={quantidadeParcelas}
                          onChange={(e) => setQuantidadeParcelas(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Preview das parcelas */}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Preview das parcelas:</div>
                      <div className="space-y-1 text-sm">
                        {gerarPreviewParcelas().map((p) => (
                          <div key={p.numero} className="flex justify-between text-muted-foreground">
                            <span>{p.numero}ª - {format(p.data, 'dd/MM/yyyy')}</span>
                            <span>{formatarValor(p.valor)}</span>
                          </div>
                        ))}
                        {parseInt(quantidadeParcelas) > 5 && (
                          <div className="text-xs text-muted-foreground">
                            ... e mais {parseInt(quantidadeParcelas) - 5} parcelas
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Marcar como baixado */}
                <div className="flex items-start space-x-3 p-3 rounded-lg border">
                  <Checkbox
                    id="marcarBaixado"
                    checked={marcarComoBaixado}
                    onCheckedChange={(checked) => setMarcarComoBaixado(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="marcarBaixado" className="cursor-pointer font-medium">
                      Marcar como {itemSelecionado.tipo === 'entrada' ? 'recebido' : 'pago'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {tipoLancamento === 'recorrente' 
                        ? 'A primeira parcela será criada já baixada na data do extrato'
                        : 'A conta será criada já baixada na data do extrato'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCriarContaModal(false);
              setItemSelecionado(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarCriarConta}
              disabled={loading || !podecriarConta()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Criar {tipoLancamento === 'recorrente' ? `${quantidadeParcelas} Parcelas` : 'e Vincular'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
