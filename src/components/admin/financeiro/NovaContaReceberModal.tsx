import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, User, Users } from "lucide-react";
import { useFinanceiro } from "@/hooks/useFinanceiro";
import { useConfiguracaoFinanceira } from "@/hooks/useConfiguracaoFinanceira";
import { useToast } from "@/hooks/use-toast";
import { criarDataLocal, adicionarDias, adicionarMeses, adicionarAnos, formatarDataLocal } from "@/utils/dateUtils";
import type { CategoriaFinanceira, CreateContaReceberInput, FornecedorOption, ParcelaVariavel } from "@/types/financeiro";
import { SubcategoriaSelector } from './SubcategoriaSelector';
import { FornecedorClienteCombobox } from './FornecedorClienteCombobox';

interface NovaContaReceberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaContaReceberModal({ open, onOpenChange, onSuccess }: NovaContaReceberModalProps) {
  const { criarContaReceberRecorrente, criarContaReceberVariavel, buscarFornecedores, loading } = useFinanceiro();
  const { buscarCategorias, buscarFornecedoresClientes, criarFornecedorCliente } = useConfiguracaoFinanceira();
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([]);
  const [previewDatas, setPreviewDatas] = useState<string[]>([]);
  const [salvarCliente, setSalvarCliente] = useState(true);
  const [parcelasVariaveis, setParcelasVariaveis] = useState<ParcelaVariavel[]>([]);
  const [subcategoriaSelecionada, setSubcategoriaSelecionada] = useState('');
  
  const [formData, setFormData] = useState<CreateContaReceberInput>({
    cliente_nome: "",
    cliente_email: "",
    cliente_telefone: "",
    descricao: "",
    valor_original: 0,
    data_vencimento: "",
        categoria_id: "",
        subcategoria_id: "",
        observacoes: "",
    tipo_cliente: "novo",
    fornecedor_id: "",
    tipo_fluxo: "fixo",
    is_recorrente: false,
    frequencia_recorrencia: "mensal",
    quantidade_parcelas: 1,
    parcelas_variaveis: []
  });

  const carregarCategorias = async () => {
    const cats = await buscarCategorias();
    setCategorias(cats.filter(c => c.ativa && c.tipo === 'receita'));
  };

  const carregarFornecedores = async () => {
    const fornecs = await buscarFornecedores();
    setFornecedores(fornecs);
  };

  useEffect(() => {
    if (open) {
      carregarCategorias();
      carregarFornecedores();
    }
  }, [open]);

  // Atualizar preview das datas quando recorrência muda
  useEffect(() => {
    if (formData.is_recorrente && formData.data_vencimento && formData.quantidade_parcelas && formData.frequencia_recorrencia) {
      const datas: string[] = [];
      const dataBase = criarDataLocal(formData.data_vencimento);

      for (let i = 0; i < formData.quantidade_parcelas; i++) {
        let dataVencimento: Date;
        
        // Calcular nova data baseada na frequência usando funções locais
        switch (formData.frequencia_recorrencia) {
          case 'semanal':
            dataVencimento = adicionarDias(dataBase, i * 7);
            break;
          case 'quinzenal':
            dataVencimento = adicionarDias(dataBase, i * 15);
            break;
          case 'mensal':
            dataVencimento = adicionarMeses(dataBase, i);
            break;
          case 'trimestral':
            dataVencimento = adicionarMeses(dataBase, i * 3);
            break;
          case 'semestral':
            dataVencimento = adicionarMeses(dataBase, i * 6);
            break;
          case 'anual':
            dataVencimento = adicionarAnos(dataBase, i);
            break;
          default:
            dataVencimento = dataBase;
        }

        datas.push(dataVencimento.toLocaleDateString('pt-BR'));
      }
      
      setPreviewDatas(datas);
    } else {
      setPreviewDatas([]);
    }
  }, [formData.is_recorrente, formData.data_vencimento, formData.quantidade_parcelas, formData.frequencia_recorrencia]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação para fluxo variável
    if (formData.tipo_fluxo === 'variavel') {
      if (parcelasVariaveis.length < 2) {
        toast({
          title: "Erro de validação",
          description: "Fluxo variável deve ter pelo menos 2 parcelas",
          variant: "destructive",
        });
        return;
      }
      
      const somaValores = parcelasVariaveis.reduce((acc, p) => acc + p.valor, 0);
      if (Math.abs(somaValores - formData.valor_original) > 0.01) {
        toast({
          title: "Erro de validação", 
          description: `Soma das parcelas (R$ ${somaValores.toFixed(2)}) deve ser igual ao valor total (R$ ${formData.valor_original.toFixed(2)})`,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Se é um novo cliente e deve ser salvo, salvá-lo primeiro
    let dadosFormAtualizado = { ...formData };
    
    if (formData.tipo_cliente === "novo" && salvarCliente && formData.cliente_nome.trim()) {
      const novoClienteData = {
        nome: formData.cliente_nome.trim(),
        email: formData.cliente_email.trim() || undefined,
        telefone: formData.cliente_telefone.trim() || undefined,
        tipo: 'cliente' as const
      };

      const clienteSalvo = await criarFornecedorCliente(novoClienteData);
      if (clienteSalvo) {
        // Recarregar lista de fornecedores para pegar o ID do novo cliente
        const fornecedoresAtualizados = await buscarFornecedoresClientes('cliente');
        const clienteCriado = fornecedoresAtualizados.find(f => 
          f.nome === formData.cliente_nome.trim() && 
          f.email === (formData.cliente_email.trim() || null)
        );
        
        if (clienteCriado) {
          dadosFormAtualizado = {
            ...dadosFormAtualizado,
            fornecedor_cliente_id: clienteCriado.id
          };
        }
      }
    }
    
    // Adicionar subcategoria e parcelas variáveis aos dados se necessário
    dadosFormAtualizado = {
      ...dadosFormAtualizado,
      subcategoria_id: subcategoriaSelecionada || undefined
    };
    
    if (formData.tipo_fluxo === 'variavel') {
      dadosFormAtualizado = {
        ...dadosFormAtualizado,
        parcelas_variaveis: parcelasVariaveis
      };
    }
    
    // Usar função apropriada baseado no tipo de fluxo
    const success = formData.tipo_fluxo === 'variavel' 
      ? await criarContaReceberVariavel(dadosFormAtualizado)
      : await criarContaReceberRecorrente(dadosFormAtualizado);
      
    if (success) {
      setFormData({
        cliente_nome: "",
        cliente_email: "",
        cliente_telefone: "",
        descricao: "",
        valor_original: 0,
        data_vencimento: "",
        categoria_id: "",
        subcategoria_id: "",
        observacoes: "",
        tipo_cliente: "novo",
        fornecedor_id: "",
        tipo_fluxo: "fixo",
        is_recorrente: false,
        frequencia_recorrencia: "mensal",
        quantidade_parcelas: 1,
        parcelas_variaveis: []
      });
      setParcelasVariaveis([]);
      setSalvarCliente(true);
      setSubcategoriaSelecionada('');
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleChange = (field: keyof CreateContaReceberInput, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFornecedorSelect = (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    if (fornecedor) {
      setFormData(prev => ({
        ...prev,
        fornecedor_id: fornecedorId,
        cliente_nome: fornecedor.nome,
        cliente_email: fornecedor.email || "",
        cliente_telefone: fornecedor.telefone || ""
      }));
    }
  };

  const resetClienteFields = () => {
    setFormData(prev => ({
      ...prev,
      fornecedor_id: "",
      cliente_nome: "",
      cliente_email: "",
      cliente_telefone: ""
    }));
  };

  const handleTipoClienteChange = (tipo: "fornecedor" | "novo") => {
    setFormData(prev => ({ ...prev, tipo_cliente: tipo }));
    if (tipo === "novo") {
      resetClienteFields();
    }
  };

  const adicionarParcela = () => {
    const novaParcela: ParcelaVariavel = {
      valor: 0,
      data_vencimento: "",
      observacoes: ""
    };
    setParcelasVariaveis(prev => [...prev, novaParcela]);
  };

  const removerParcela = (index: number) => {
    setParcelasVariaveis(prev => prev.filter((_, i) => i !== index));
  };

  const atualizarParcela = (index: number, campo: keyof ParcelaVariavel, valor: string | number) => {
    setParcelasVariaveis(prev => 
      prev.map((parcela, i) => 
        i === index ? { ...parcela, [campo]: valor } : parcela
      )
    );
  };

  const calcularSomaVariavel = () => {
    return parcelasVariaveis.reduce((acc, p) => acc + (p.valor || 0), 0);
  };

  const calcularDiferenca = () => {
    return formData.valor_original - calcularSomaVariavel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Conta a Receber</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção do Tipo de Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Tipo de Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.tipo_cliente === "fornecedor" ? "default" : "outline"}
                  onClick={() => handleTipoClienteChange("fornecedor")}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Fornecedor Existente
                </Button>
                <Button
                  type="button"
                  variant={formData.tipo_cliente === "novo" ? "default" : "outline"}
                  onClick={() => handleTipoClienteChange("novo")}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Novo Cliente
                </Button>
              </div>

              {formData.tipo_cliente === "fornecedor" && (
                <div className="space-y-2">
                  <Label htmlFor="fornecedor">Selecionar Fornecedor</Label>
                  <FornecedorClienteCombobox
                    fornecedores={fornecedores}
                    value={formData.fornecedor_id}
                    onValueChange={handleFornecedorSelect}
                    placeholder="Digite para buscar fornecedor/cliente..."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
                <Input
                  id="cliente_nome"
                  value={formData.cliente_nome}
                  onChange={(e) => handleChange("cliente_nome", e.target.value)}
                  required
                  disabled={formData.tipo_cliente === "fornecedor" && !!formData.fornecedor_id}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_email">Email</Label>
                <Input
                  id="cliente_email"
                  type="email"
                  value={formData.cliente_email}
                  onChange={(e) => handleChange("cliente_email", e.target.value)}
                  disabled={formData.tipo_cliente === "fornecedor" && !!formData.fornecedor_id}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cliente_telefone">Telefone</Label>
                <Input
                  id="cliente_telefone"
                  value={formData.cliente_telefone}
                  onChange={(e) => handleChange("cliente_telefone", e.target.value)}
                  disabled={formData.tipo_cliente === "fornecedor" && !!formData.fornecedor_id}
                />
              </div>

              {formData.tipo_cliente === "novo" && (
                <div className="flex items-center space-x-2 pt-2 md:col-span-2">
                  <Checkbox
                    id="salvar_cliente"
                    checked={salvarCliente}
                    onCheckedChange={(checked) => setSalvarCliente(checked as boolean)}
                  />
                  <Label htmlFor="salvar_cliente" className="text-sm">
                    Salvar este cliente para uso futuro
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados da Conta */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Conta</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleChange("descricao", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_original">Valor (R$) *</Label>
                <Input
                  id="valor_original"
                  type="number"
                  step="0.01"
                  value={formData.valor_original}
                  onChange={(e) => handleChange("valor_original", Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => handleChange("data_vencimento", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria_id">Categoria</Label>
                <Select onValueChange={(value) => {
                  handleChange("categoria_id", value || "");
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
                categoriaId={formData.categoria_id}
                value={subcategoriaSelecionada}
                onValueChange={setSubcategoriaSelecionada}
              />

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleChange("observacoes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Configuração de Tipo de Fluxo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Tipo de Fluxo de Recebimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={formData.tipo_fluxo === "fixo" ? "default" : "outline"}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, tipo_fluxo: "fixo", is_recorrente: false }));
                    setParcelasVariaveis([]);
                  }}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <div className="text-sm font-semibold">Valor Fixo</div>
                  <div className="text-xs text-center">Recebimento único na data informada</div>
                </Button>
                
                <Button
                  type="button"
                  variant={formData.tipo_fluxo === "recorrente" ? "default" : "outline"}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, tipo_fluxo: "recorrente", is_recorrente: true }));
                    setParcelasVariaveis([]);
                  }}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <div className="text-sm font-semibold">Fluxo Recorrente</div>
                  <div className="text-xs text-center">Parcelas iguais com frequência fixa</div>
                </Button>
                
                <Button
                  type="button"
                  variant={formData.tipo_fluxo === "variavel" ? "default" : "outline"}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, tipo_fluxo: "variavel", is_recorrente: false }));
                    if (parcelasVariaveis.length === 0) {
                      setParcelasVariaveis([
                        { valor: 0, data_vencimento: "", observacoes: "" },
                        { valor: 0, data_vencimento: "", observacoes: "" }
                      ]);
                    }
                  }}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <div className="text-sm font-semibold">Fluxo Variável</div>
                  <div className="text-xs text-center">Valores e datas personalizados</div>
                </Button>
              </div>

              {formData.tipo_fluxo === "recorrente" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequencia_recorrencia">Frequência</Label>
                    <Select 
                      value={formData.frequencia_recorrencia} 
                      onValueChange={(value) => handleChange("frequencia_recorrencia", value)}
                    >
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

                  <div className="space-y-2">
                    <Label htmlFor="quantidade_parcelas">Quantidade de Parcelas</Label>
                    <Input
                      id="quantidade_parcelas"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.quantidade_parcelas}
                      onChange={(e) => handleChange("quantidade_parcelas", Number(e.target.value))}
                    />
                  </div>

                  {previewDatas.length > 0 && (
                    <div className="md:col-span-2 p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Preview das Datas de Vencimento:</h4>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                        {previewDatas.map((data, index) => (
                          <div key={index} className="bg-background p-2 rounded border text-center">
                            {index + 1}ª: {data}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.tipo_fluxo === "variavel" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Parcelas Variáveis</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={adicionarParcela}
                    >
                      Adicionar Parcela
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {parcelasVariaveis.map((parcela, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="space-y-2">
                            <Label>Parcela {index + 1}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="R$ 0,00"
                              value={parcela.valor}
                              onChange={(e) => atualizarParcela(index, "valor", Number(e.target.value))}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Data Vencimento</Label>
                            <Input
                              type="date"
                              value={parcela.data_vencimento}
                              onChange={(e) => atualizarParcela(index, "data_vencimento", e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Observação</Label>
                            <Input
                              placeholder="Ex: Sinal, Parcela 1/3..."
                              value={parcela.observacoes}
                              onChange={(e) => atualizarParcela(index, "observacoes", e.target.value)}
                            />
                          </div>
                          
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removerParcela(index)}
                            disabled={parcelasVariaveis.length <= 2}
                          >
                            Remover
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Valor Total: </span>
                        <span>R$ {formData.valor_original.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Soma Parcelas: </span>
                        <span>R$ {calcularSomaVariavel().toFixed(2)}</span>
                      </div>
                    </div>
                    <div className={`text-sm ${Math.abs(calcularDiferenca()) > 0.01 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      <span className="font-semibold">Diferença: </span>
                      <span>R$ {calcularDiferenca().toFixed(2)}</span>
                      {Math.abs(calcularDiferenca()) > 0.01 && (
                        <span className="ml-2 text-xs">(Valores devem ser iguais)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Conta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}