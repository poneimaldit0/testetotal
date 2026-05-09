import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { FormaPagamentoData } from '@/types/comparacao';

interface FormaPagamentoSelectorProps {
  value: FormaPagamentoData | null;
  onChange: (data: FormaPagamentoData | null) => void;
  valorTotal: number;
}

export const FormaPagamentoSelector: React.FC<FormaPagamentoSelectorProps> = ({
  value,
  onChange,
  valorTotal
}) => {
  const handleTipoChange = (tipo: FormaPagamentoData['tipo']) => {
    // Se já é o tipo atual, não fazer nada (evitar reset dos dados)
    if (value?.tipo === tipo) {
      return;
    }
    
    const baseData: FormaPagamentoData = { tipo };
    
    // Initialize with default values based on type
    switch (tipo) {
      case 'a_vista':
        baseData.desconto_porcentagem = 0;
        break;
      case 'entrada_medicoes':
        baseData.entrada_porcentagem = 30;
        baseData.frequencia_medicoes = 'quinzenal';
        break;
      case 'medicoes':
        baseData.frequencia_medicoes = 'quinzenal';
        break;
      case 'boletos':
        baseData.boletos_quantidade = 3;
        baseData.boletos_valores = [valorTotal / 3, valorTotal / 3, valorTotal / 3];
        break;
      case 'cartao':
        baseData.cartao_parcelas = 12;
        break;
      case 'personalizado':
        baseData.texto_personalizado = '';
        break;
    }
    
    onChange(baseData);
  };

  const updateField = (field: keyof FormaPagamentoData, fieldValue: any) => {
    if (!value) return;
    
    const updatedData = { ...value, [field]: fieldValue };
    
    // Auto-adjust boletos values when quantity changes
    if (field === 'boletos_quantidade' && value.tipo === 'boletos') {
      const quantity = fieldValue as number;
      if (quantity > 0) {
        const valorPorBoleto = valorTotal / quantity;
        updatedData.boletos_valores = Array(quantity).fill(valorPorBoleto);
      }
    }
    
    onChange(updatedData);
  };

  const updateBoletoValue = (index: number, boletValue: number) => {
    if (!value?.boletos_valores) return;
    
    const newValues = [...value.boletos_valores];
    newValues[index] = boletValue;
    updateField('boletos_valores', newValues);
  };

  const addBoleto = () => {
    if (!value?.boletos_valores) return;
    
    const newValues = [...value.boletos_valores, 0];
    updateField('boletos_valores', newValues);
    updateField('boletos_quantidade', newValues.length);
  };

  const removeBoleto = (index: number) => {
    if (!value?.boletos_valores || value.boletos_valores.length <= 1) return;
    
    const newValues = value.boletos_valores.filter((_, i) => i !== index);
    updateField('boletos_valores', newValues);
    updateField('boletos_quantidade', newValues.length);
  };

  const calculateValorComDesconto = () => {
    if (value?.tipo === 'a_vista' && value.desconto_porcentagem) {
      return valorTotal * (1 - value.desconto_porcentagem / 100);
    }
    return valorTotal;
  };

  const calculateValorPorParcela = () => {
    if (value?.tipo === 'cartao' && value.cartao_parcelas) {
      return valorTotal / value.cartao_parcelas;
    }
    return 0;
  };

  const getSomaBoletos = () => {
    return value?.boletos_valores?.reduce((sum, val) => sum + (val || 0), 0) || 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Forma de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={value?.tipo || ''} 
          onValueChange={(val) => handleTipoChange(val as FormaPagamentoData['tipo'])}
          className="space-y-4"
        >
          {/* À Vista com Desconto */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="a_vista" id="a_vista" />
              <Label htmlFor="a_vista" className="font-medium">À vista com desconto</Label>
            </div>
            {value?.tipo === 'a_vista' && (
              <div className="ml-6 space-y-3 bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="desconto">Percentual de desconto (%)</Label>
                    <Input
                      id="desconto"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={value.desconto_porcentagem || 0}
                      onChange={(e) => updateField('desconto_porcentagem', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Valor final</Label>
                    <div className="mt-1 p-2 bg-background border rounded text-sm">
                      R$ {calculateValorComDesconto().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Entrada + Medições */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="entrada_medicoes" id="entrada_medicoes" />
              <Label htmlFor="entrada_medicoes" className="font-medium">Entrada + Medições</Label>
            </div>
            {value?.tipo === 'entrada_medicoes' && (
              <div className="ml-6 space-y-3 bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entrada_percentual">Percentual da entrada (%)</Label>
                    <Input
                      id="entrada_percentual"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={value.entrada_porcentagem || 30}
                      onChange={(e) => updateField('entrada_porcentagem', parseInt(e.target.value) || 30)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Frequência das medições</Label>
                    <Select 
                      value={value.frequencia_medicoes || 'quinzenal'} 
                      onValueChange={(val) => updateField('frequencia_medicoes', val)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Entrada: R$ {((value.entrada_porcentagem || 30) / 100 * valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • 
                  Restante: R$ {((100 - (value.entrada_porcentagem || 30)) / 100 * valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
          </div>

          {/* Medições */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medicoes" id="medicoes" />
              <Label htmlFor="medicoes" className="font-medium">Medições</Label>
            </div>
            {value?.tipo === 'medicoes' && (
              <div className="ml-6 space-y-3 bg-muted/30 p-4 rounded-lg">
                <div>
                  <Label>Frequência das medições</Label>
                  <Select 
                    value={value.frequencia_medicoes || 'quinzenal'} 
                    onValueChange={(val) => updateField('frequencia_medicoes', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Boletos */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="boletos" id="boletos" />
              <Label htmlFor="boletos" className="font-medium">Boletos</Label>
            </div>
            {value?.tipo === 'boletos' && (
              <div className="ml-6 space-y-3 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-3">
                  {value.boletos_valores?.map((valor, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label>Boleto {index + 1}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={valor}
                          onChange={(e) => updateBoletoValue(index, parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      {value.boletos_valores && value.boletos_valores.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeBoleto(index)}
                          className="mt-6"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBoleto}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Boleto
                  </Button>
                  <div className="text-sm space-y-1">
                    <div>Total dos boletos: R$ {getSomaBoletos().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className={getSomaBoletos() !== valorTotal ? 'text-destructive' : 'text-muted-foreground'}>
                      Valor da proposta: R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {getSomaBoletos() !== valorTotal && (
                        <span className="ml-2 font-medium">⚠️ Valores não conferem</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cartão de Crédito */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cartao" id="cartao" />
              <Label htmlFor="cartao" className="font-medium">Cartão de crédito</Label>
            </div>
            {value?.tipo === 'cartao' && (
              <div className="ml-6 space-y-3 bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="parcelas">Quantidade de parcelas</Label>
                    <Input
                      id="parcelas"
                      type="number"
                      min="1"
                      max="36"
                      step="1"
                      value={value.cartao_parcelas || 12}
                      onChange={(e) => updateField('cartao_parcelas', parseInt(e.target.value) || 12)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Valor por parcela</Label>
                    <div className="mt-1 p-2 bg-background border rounded text-sm">
                      R$ {calculateValorPorParcela().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personalizado */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="personalizado" id="personalizado" />
              <Label htmlFor="personalizado" className="font-medium">Personalizado</Label>
            </div>
            {value?.tipo === 'personalizado' && (
              <div className="ml-6 space-y-3 bg-muted/30 p-4 rounded-lg">
                <div>
                  <Label htmlFor="texto_personalizado">Descreva sua proposta de pagamento</Label>
                  <Textarea
                    id="texto_personalizado"
                    value={value.texto_personalizado || ''}
                    onChange={(e) => updateField('texto_personalizado', e.target.value)}
                    placeholder="Descreva detalhadamente como será o pagamento..."
                    className="mt-1"
                    rows={4}
                    maxLength={300}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {(value.texto_personalizado || '').length}/300 caracteres
                  </div>
                </div>
              </div>
            )}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};