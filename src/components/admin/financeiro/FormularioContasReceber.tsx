import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar } from "lucide-react";
import { useConfiguracaoFinanceira } from "@/hooks/useConfiguracaoFinanceira";
import { criarDataLocal, adicionarDias, adicionarMeses, adicionarAnos } from "@/utils/dateUtils";
import type { CategoriaFinanceira } from "@/types/financeiro";

export interface ContaReceberFormData {
  descricao: string;
  valor_original: number;
  data_vencimento: string;
  categoria_id: string;
  observacoes: string;
  is_recorrente: boolean;
  frequencia_recorrencia: "semanal" | "quinzenal" | "mensal" | "trimestral" | "semestral" | "anual";
  quantidade_parcelas: number;
}

interface FormularioContasReceberProps {
  clienteNome: string;
  clienteEmail?: string;
  onContasChange: (contas: ContaReceberFormData[]) => void;
  disabled?: boolean;
}

export function FormularioContasReceber({ 
  clienteNome, 
  clienteEmail, 
  onContasChange, 
  disabled = false 
}: FormularioContasReceberProps) {
  const { buscarCategorias } = useConfiguracaoFinanceira();
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [contas, setContas] = useState<ContaReceberFormData[]>([]);
  const [previewDatas, setPreviewDatas] = useState<{ [index: number]: string[] }>({});

  const contaVazia: ContaReceberFormData = {
    descricao: "",
    valor_original: 0,
    data_vencimento: "",
    categoria_id: "",
    observacoes: "",
    is_recorrente: false,
    frequencia_recorrencia: "mensal",
    quantidade_parcelas: 1
  };

  useEffect(() => {
    const carregarCategorias = async () => {
      const cats = await buscarCategorias();
      setCategorias(cats.filter(c => c.ativa && c.tipo === 'receita'));
    };
    carregarCategorias();
  }, []);

  // Atualizar preview das datas para cada conta recorrente
  useEffect(() => {
    const novoPreview: { [index: number]: string[] } = {};
    
    contas.forEach((conta, index) => {
      if (conta.is_recorrente && conta.data_vencimento && conta.quantidade_parcelas && conta.frequencia_recorrencia) {
        const datas: string[] = [];
        const dataBase = criarDataLocal(conta.data_vencimento);

        for (let i = 0; i < conta.quantidade_parcelas; i++) {
          let dataVencimento: Date;
          
          switch (conta.frequencia_recorrencia) {
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
        
        novoPreview[index] = datas;
      }
    });
    
    setPreviewDatas(novoPreview);
  }, [contas]);

  // Notificar mudanças para o componente pai
  useEffect(() => {
    onContasChange(contas);
  }, [contas, onContasChange]);

  const adicionarConta = () => {
    setContas([...contas, { ...contaVazia }]);
  };

  const removerConta = (index: number) => {
    const novasContas = contas.filter((_, i) => i !== index);
    setContas(novasContas);
  };

  const atualizarConta = (index: number, campo: keyof ContaReceberFormData, valor: any) => {
    const novasContas = [...contas];
    novasContas[index] = { ...novasContas[index], [campo]: valor };
    setContas(novasContas);
  };

  const calcularTotalContas = () => {
    return contas.reduce((total, conta) => {
      const multiplicador = conta.is_recorrente ? conta.quantidade_parcelas : 1;
      return total + (conta.valor_original * multiplicador);
    }, 0);
  };

  const calcularTotalParcelas = () => {
    return contas.reduce((total, conta) => {
      return total + (conta.is_recorrente ? conta.quantidade_parcelas : 1);
    }, 0);
  };

  if (disabled || !clienteNome) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Contas a Receber
          </div>
          <div className="flex items-center gap-2">
            {contas.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="outline">
                  {calcularTotalParcelas()} parcela(s)
                </Badge>
                <Badge variant="secondary">
                  R$ {calcularTotalContas().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Badge>
              </div>
            )}
            <Button
              type="button"
              onClick={adicionarConta}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Conta
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {contas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conta a receber configurada</p>
            <p className="text-sm">Clique em "Adicionar Conta" para criar uma conta para {clienteNome}</p>
          </div>
        ) : (
          contas.map((conta, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Conta {index + 1} - {clienteNome}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerConta(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descrição *</Label>
                    <Input
                      value={conta.descricao}
                      onChange={(e) => atualizarConta(index, "descricao", e.target.value)}
                      placeholder="Ex: Prestação de serviços..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={conta.valor_original}
                      onChange={(e) => atualizarConta(index, "valor_original", Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Vencimento *</Label>
                    <Input
                      type="date"
                      value={conta.data_vencimento}
                      onChange={(e) => atualizarConta(index, "data_vencimento", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Categoria</Label>
                    <Select onValueChange={(value) => atualizarConta(index, "categoria_id", value)}>
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

                  <div className="space-y-2 md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={conta.observacoes}
                      onChange={(e) => atualizarConta(index, "observacoes", e.target.value)}
                      placeholder="Observações sobre esta conta..."
                    />
                  </div>
                </div>

                {/* Configuração de Recorrência */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={conta.is_recorrente}
                      onCheckedChange={(checked) => atualizarConta(index, "is_recorrente", checked as boolean)}
                    />
                    <Label>Esta é uma conta recorrente</Label>
                  </div>

                  {conta.is_recorrente && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frequência</Label>
                          <Select 
                            value={conta.frequencia_recorrencia} 
                            onValueChange={(value) => atualizarConta(index, "frequencia_recorrencia", value)}
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
                          <Label>Quantidade de Parcelas</Label>
                          <Input
                            type="number"
                            min="1"
                            max="120"
                            value={conta.quantidade_parcelas}
                            onChange={(e) => atualizarConta(index, "quantidade_parcelas", Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {previewDatas[index] && previewDatas[index].length > 0 && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Preview das Datas de Vencimento:</h4>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                            {previewDatas[index].slice(0, 12).map((data, dataIndex) => (
                              <div key={dataIndex} className="bg-background p-2 rounded border text-center">
                                {dataIndex + 1}ª: {data}
                              </div>
                            ))}
                            {previewDatas[index].length > 12 && (
                              <div className="bg-background p-2 rounded border text-center text-muted-foreground">
                                +{previewDatas[index].length - 12} mais...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}