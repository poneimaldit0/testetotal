import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useConfiguracaoFinanceira } from '@/hooks/useConfiguracaoFinanceira';
import { CategoriaFinanceira, FornecedorCliente, CreateContaPagarInput, ParcelaVariavel } from '@/types/financeiro';
import { NovoFornecedorClienteModal } from './configuracoes/NovoFornecedorClienteModal';
import { SubcategoriaSelector } from './SubcategoriaSelector';
import { Checkbox } from '@/components/ui/checkbox';

interface NovaContaPagarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaContaPagarModal({ open, onOpenChange, onSuccess }: NovaContaPagarModalProps) {
  // Estados básicos da conta
  const [tipoFornecedor, setTipoFornecedor] = useState<'fornecedor_existente' | 'novo'>('fornecedor_existente');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedorEmail, setFornecedorEmail] = useState('');
  const [fornecedorTelefone, setFornecedorTelefone] = useState('');
  const [salvarFornecedor, setSalvarFornecedor] = useState(true);
  const [descricao, setDescricao] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [subcategoriaSelecionada, setSubcategoriaSelecionada] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Estados de tipo de fluxo
  type TipoFluxo = 'fixo' | 'recorrente' | 'variavel';
  const [tipoFluxo, setTipoFluxo] = useState<TipoFluxo>('fixo');
  const [frequenciaRecorrencia, setFrequenciaRecorrencia] = useState<'semanal' | 'quinzenal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'>('mensal');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2');

  // Estados para fluxo variável
  const [parcelasVariaveis, setParcelasVariaveis] = useState<ParcelaVariavel[]>([
    { valor: 0, data_vencimento: '', observacoes: '' }
  ]);

  // Estados dos dados carregados
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorCliente[]>([]);
  const [novoFornecedorModalAberto, setNovoFornecedorModalAberto] = useState(false);

  const { criarContaPagar, criarContaPagarVariavel, loading } = useFinanceiro();
  const { buscarCategorias, buscarFornecedoresClientes, criarFornecedorCliente } = useConfiguracaoFinanceira();

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      const [categoriasData, fornecedoresData] = await Promise.all([
        buscarCategorias(),
        buscarFornecedoresClientes('fornecedor')
      ]);
      
      setCategorias(categoriasData.filter(c => c.ativa && c.tipo === 'despesa'));
      setFornecedores(fornecedoresData);
    };

    if (open) {
      carregarDados();
    }
  }, [open]);

  // Reset do formulário
  const resetForm = () => {
    setTipoFornecedor('fornecedor_existente');
    setFornecedorSelecionado('');
    setFornecedorNome('');
    setFornecedorEmail('');
    setFornecedorTelefone('');
    setSalvarFornecedor(true);
    setDescricao('');
    setValorOriginal('');
    setDataVencimento('');
    setCategoriaSelecionada('');
    setSubcategoriaSelecionada('');
    setObservacoes('');
    setTipoFluxo('fixo');
    setFrequenciaRecorrencia('mensal');
    setQuantidadeParcelas('2');
    setParcelasVariaveis([{ valor: 0, data_vencimento: '', observacoes: '' }]);
  };

  // Calcular datas das parcelas para preview (recorrência)
  const calcularDatasParcelas = () => {
    if (!dataVencimento || tipoFluxo !== 'recorrente') return [];
    
    const datas = [];
    const dataBase = new Date(dataVencimento);
    const numParcelas = parseInt(quantidadeParcelas) || 1;
    
    for (let i = 0; i < Math.min(numParcelas, 12); i++) {
      const data = new Date(dataBase);
      
      switch (frequenciaRecorrencia) {
        case 'semanal':
          data.setDate(dataBase.getDate() + (i * 7));
          break;
        case 'quinzenal':
          data.setDate(dataBase.getDate() + (i * 15));
          break;
        case 'mensal':
          data.setMonth(dataBase.getMonth() + i);
          break;
        case 'trimestral':
          data.setMonth(dataBase.getMonth() + (i * 3));
          break;
        case 'semestral':
          data.setMonth(dataBase.getMonth() + (i * 6));
          break;
        case 'anual':
          data.setFullYear(dataBase.getFullYear() + i);
          break;
      }
      
      datas.push(data.toLocaleDateString('pt-BR'));
    }
    
    return datas;
  };

  // Funções para gerenciar parcelas variáveis
  const adicionarParcela = () => {
    setParcelasVariaveis([
      ...parcelasVariaveis,
      { valor: 0, data_vencimento: '', observacoes: '' }
    ]);
  };

  const removerParcela = (index: number) => {
    if (parcelasVariaveis.length > 1) {
      setParcelasVariaveis(parcelasVariaveis.filter((_, i) => i !== index));
    }
  };

  const atualizarParcela = (index: number, campo: keyof ParcelaVariavel, valor: string | number) => {
    const novasParcelas = [...parcelasVariaveis];
    novasParcelas[index] = {
      ...novasParcelas[index],
      [campo]: valor
    };
    setParcelasVariaveis(novasParcelas);
  };

  // Calcular soma das parcelas variáveis
  const somaParcelasVariaveis = parcelasVariaveis.reduce((acc, p) => acc + (p.valor || 0), 0);
  const valorTotalNumerico = parseFloat(valorOriginal) || 0;
  const diferencaParcelas = valorTotalNumerico - somaParcelasVariaveis;
  const parcelasValidas = tipoFluxo !== 'variavel' || 
    (parcelasVariaveis.length >= 2 && 
     parcelasVariaveis.every(p => p.valor > 0 && p.data_vencimento) && 
     Math.abs(diferencaParcelas) < 0.01);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!descricao || !valorOriginal) return;
    if (tipoFluxo !== 'variavel' && !dataVencimento) return;

    let dadosConta: CreateContaPagarInput;
    let fornecedorId: string | undefined;

    if (tipoFornecedor === 'fornecedor_existente' && fornecedorSelecionado) {
      const fornecedor = fornecedores.find(f => f.id === fornecedorSelecionado);
      dadosConta = {
        fornecedor_cliente_id: fornecedorSelecionado,
        fornecedor_nome: fornecedor?.nome || '',
        fornecedor_email: fornecedor?.email,
        fornecedor_telefone: fornecedor?.telefone,
        tipo_fornecedor: 'fornecedor_existente',
        descricao,
        valor_original: parseFloat(valorOriginal),
        data_vencimento: dataVencimento || parcelasVariaveis[0]?.data_vencimento || ''
      };
    } else {
      // Se é um novo fornecedor e deve ser salvo, salvá-lo primeiro
      if (salvarFornecedor && fornecedorNome.trim()) {
        const novoFornecedorData = {
          nome: fornecedorNome.trim(),
          email: fornecedorEmail.trim() || undefined,
          telefone: fornecedorTelefone.trim() || undefined,
          tipo: 'fornecedor' as const
        };

        const fornecedorSalvo = await criarFornecedorCliente(novoFornecedorData);
        if (fornecedorSalvo) {
          // Recarregar lista de fornecedores para pegar o ID do novo fornecedor
          const fornecedoresAtualizados = await buscarFornecedoresClientes('fornecedor');
          const fornecedorCriado = fornecedoresAtualizados.find(f => 
            f.nome === fornecedorNome.trim() && 
            f.email === (fornecedorEmail.trim() || null)
          );
          
          if (fornecedorCriado) {
            fornecedorId = fornecedorCriado.id;
            // Atualizar lista local
            setFornecedores(fornecedoresAtualizados);
          }
        }
      }

      dadosConta = {
        fornecedor_cliente_id: fornecedorId,
        fornecedor_nome: fornecedorNome,
        fornecedor_email: fornecedorEmail || undefined,
        fornecedor_telefone: fornecedorTelefone || undefined,
        tipo_fornecedor: 'novo',
        descricao,
        valor_original: parseFloat(valorOriginal),
        data_vencimento: dataVencimento || parcelasVariaveis[0]?.data_vencimento || ''
      };
    }

    dadosConta = {
      ...dadosConta,
      descricao,
      valor_original: parseFloat(valorOriginal),
      data_vencimento: dataVencimento || parcelasVariaveis[0]?.data_vencimento || '',
      categoria_id: categoriaSelecionada || undefined,
      subcategoria_id: subcategoriaSelecionada || undefined,
      observacoes: observacoes || undefined,
      tipo_fluxo: tipoFluxo,
      is_recorrente: tipoFluxo === 'recorrente',
      frequencia_recorrencia: tipoFluxo === 'recorrente' ? frequenciaRecorrencia : undefined,
      quantidade_parcelas: tipoFluxo === 'recorrente' ? parseInt(quantidadeParcelas) : undefined,
      parcelas_variaveis: tipoFluxo === 'variavel' ? parcelasVariaveis : undefined
    };

    let sucesso: boolean;
    
    if (tipoFluxo === 'variavel') {
      sucesso = await criarContaPagarVariavel(dadosConta);
    } else {
      sucesso = await criarContaPagar(dadosConta);
    }

    if (sucesso) {
      resetForm();
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleNovoFornecedorSuccess = async () => {
    setNovoFornecedorModalAberto(false);
    // Recarregar lista de fornecedores
    const fornecedoresData = await buscarFornecedoresClientes('fornecedor');
    setFornecedores(fornecedoresData);
  };

  const datasParcelas = calcularDatasParcelas();

  // Calcular quantidade de contas que serão criadas
  const getQuantidadeContas = () => {
    switch (tipoFluxo) {
      case 'fixo':
        return 1;
      case 'recorrente':
        return parseInt(quantidadeParcelas) || 1;
      case 'variavel':
        return parcelasVariaveis.length;
      default:
        return 1;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seleção do Tipo de Fornecedor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fornecedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={tipoFornecedor}
                  onValueChange={(value: 'fornecedor_existente' | 'novo') => setTipoFornecedor(value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fornecedor_existente" id="fornecedor_existente" />
                    <Label htmlFor="fornecedor_existente">Fornecedor Existente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="novo" id="novo_fornecedor" />
                    <Label htmlFor="novo_fornecedor">Novo Fornecedor</Label>
                  </div>
                </RadioGroup>

                {tipoFornecedor === 'fornecedor_existente' ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={fornecedorSelecionado} onValueChange={setFornecedorSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores.map((fornecedor) => (
                            <SelectItem key={fornecedor.id} value={fornecedor.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{fornecedor.nome} {fornecedor.email && `(${fornecedor.email})`}</span>
                                {!fornecedor.ativo && (
                                  <span className="text-xs text-muted-foreground">(Inativo)</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNovoFornecedorModalAberto(true)}
                      className="px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                 ) : (
                   <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                         <Label htmlFor="fornecedor_nome">Nome *</Label>
                         <Input
                           id="fornecedor_nome"
                           value={fornecedorNome}
                           onChange={(e) => setFornecedorNome(e.target.value)}
                           placeholder="Nome do fornecedor"
                           required={tipoFornecedor === 'novo'}
                         />
                       </div>
                       <div>
                         <Label htmlFor="fornecedor_email">Email</Label>
                         <Input
                           id="fornecedor_email"
                           type="email"
                           value={fornecedorEmail}
                           onChange={(e) => setFornecedorEmail(e.target.value)}
                           placeholder="email@exemplo.com"
                         />
                       </div>
                       <div>
                         <Label htmlFor="fornecedor_telefone">Telefone</Label>
                         <Input
                           id="fornecedor_telefone"
                           value={fornecedorTelefone}
                           onChange={(e) => setFornecedorTelefone(e.target.value)}
                           placeholder="(11) 99999-9999"
                         />
                       </div>
                     </div>
                     
                     <div className="flex items-center space-x-2 pt-2">
                       <Checkbox
                         id="salvar_fornecedor"
                         checked={salvarFornecedor}
                         onCheckedChange={(checked) => setSalvarFornecedor(checked as boolean)}
                       />
                       <Label htmlFor="salvar_fornecedor" className="text-sm">
                         Salvar este fornecedor para uso futuro
                       </Label>
                     </div>
                   </div>
                 )}
              </CardContent>
            </Card>

            {/* Dados da Conta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição da despesa"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="valor">Valor Total *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorOriginal}
                      onChange={(e) => setValorOriginal(e.target.value)}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  {tipoFluxo !== 'variavel' && (
                    <div>
                      <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                      <Input
                        id="data_vencimento"
                        type="date"
                        value={dataVencimento}
                        onChange={(e) => setDataVencimento(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={categoriaSelecionada} onValueChange={(value) => {
                      setCategoriaSelecionada(value);
                      setSubcategoriaSelecionada(''); // Reset subcategoria when categoria changes
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <SubcategoriaSelector
                    categoriaId={categoriaSelecionada}
                    value={subcategoriaSelecionada}
                    onValueChange={setSubcategoriaSelecionada}
                  />
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observações adicionais"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tipo de Fluxo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Fluxo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={tipoFluxo}
                  onValueChange={(value: 'fixo' | 'recorrente' | 'variavel') => setTipoFluxo(value)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixo" id="fluxo_fixo" />
                    <Label htmlFor="fluxo_fixo" className="cursor-pointer">
                      <span className="font-medium">Valor Fixo</span>
                      <span className="text-xs text-muted-foreground block">Uma única conta</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recorrente" id="fluxo_recorrente" />
                    <Label htmlFor="fluxo_recorrente" className="cursor-pointer">
                      <span className="font-medium">Recorrente</span>
                      <span className="text-xs text-muted-foreground block">Parcelas iguais</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="variavel" id="fluxo_variavel" />
                    <Label htmlFor="fluxo_variavel" className="cursor-pointer">
                      <span className="font-medium">Fluxo Variável</span>
                      <span className="text-xs text-muted-foreground block">Valores e datas diferentes</span>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Configuração de Recorrência */}
                {tipoFluxo === 'recorrente' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="frequencia">Frequência</Label>
                        <Select value={frequenciaRecorrencia} onValueChange={(value: any) => setFrequenciaRecorrencia(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="quinzenal">Quinzenal</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                            <SelectItem value="trimestral">Trimestral</SelectItem>
                            <SelectItem value="semestral">Semestral</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="parcelas">Quantidade de Parcelas</Label>
                        <Input
                          id="parcelas"
                          type="number"
                          min="2"
                          max="120"
                          value={quantidadeParcelas}
                          onChange={(e) => setQuantidadeParcelas(e.target.value)}
                        />
                      </div>
                    </div>

                    {datasParcelas.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Preview das Datas ({datasParcelas.length} {datasParcelas.length > 12 ? 'primeiras' : ''} parcelas)
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
                          {datasParcelas.map((data, index) => (
                            <div
                              key={index}
                              className="px-3 py-2 bg-muted rounded text-center"
                            >
                              {index + 1}ª: {data}
                            </div>
                          ))}
                          {parseInt(quantidadeParcelas) > 12 && (
                            <div className="px-3 py-2 text-muted-foreground text-center">
                              +{parseInt(quantidadeParcelas) - 12} mais...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Configuração de Fluxo Variável */}
                {tipoFluxo === 'variavel' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Parcelas</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarParcela}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Parcela
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {parcelasVariaveis.map((parcela, index) => (
                        <div key={index} className="flex gap-3 items-start p-3 bg-muted/50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Valor (R$) *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={parcela.valor || ''}
                                onChange={(e) => atualizarParcela(index, 'valor', parseFloat(e.target.value) || 0)}
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Vencimento *</Label>
                              <Input
                                type="date"
                                value={parcela.data_vencimento}
                                onChange={(e) => atualizarParcela(index, 'data_vencimento', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Observação</Label>
                              <Input
                                value={parcela.observacoes || ''}
                                onChange={(e) => atualizarParcela(index, 'observacoes', e.target.value)}
                                placeholder="Ex: Entrada"
                              />
                            </div>
                          </div>
                          {parcelasVariaveis.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removerParcela(index)}
                              className="flex-shrink-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Indicador de soma das parcelas */}
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      Math.abs(diferencaParcelas) < 0.01 
                        ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                        : 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {Math.abs(diferencaParcelas) < 0.01 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        )}
                        <span className="text-sm">
                          Total parcelas: <strong>R$ {somaParcelasVariaveis.toFixed(2)}</strong>
                          {' '}de{' '}
                          <strong>R$ {valorTotalNumerico.toFixed(2)}</strong>
                        </span>
                      </div>
                      {Math.abs(diferencaParcelas) >= 0.01 && (
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">
                          Diferença: R$ {Math.abs(diferencaParcelas).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {parcelasVariaveis.length < 2 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Adicione pelo menos 2 parcelas para o fluxo variável
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !descricao || !valorOriginal || 
                         (tipoFluxo !== 'variavel' && !dataVencimento) ||
                         (tipoFornecedor === 'fornecedor_existente' && !fornecedorSelecionado) ||
                         (tipoFornecedor === 'novo' && !fornecedorNome) ||
                         !parcelasValidas}
                className="flex-1"
              >
                {loading ? 'Criando...' : `Criar ${getQuantidadeContas()} Conta${getQuantidadeContas() > 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para cadastrar novo fornecedor */}
      <NovoFornecedorClienteModal
        open={novoFornecedorModalAberto}
        onClose={handleNovoFornecedorSuccess}
      />
    </>
  );
}
