import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { FormaPagamentoSelector } from "./FormaPagamentoSelector";
import { FormaPagamentoData } from "@/types/comparacao";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface MultiFormaPagamentoSelectorProps {
  value: FormaPagamentoData[];
  onChange: (formasPagamento: FormaPagamentoData[]) => void;
  valorTotal: number;
}

const getFormaPagamentoLabel = (forma: FormaPagamentoData, valorTotal: number): string => {
  switch (forma.tipo) {
    case 'a_vista':
      const desconto = forma.desconto_porcentagem || 0;
      const valorComDesconto = valorTotal * (1 - desconto / 100);
      return `À Vista${desconto > 0 ? ` c/ ${desconto}% desc. - R$ ${valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}`;
    
    case 'entrada_medicoes':
      const entrada = forma.entrada_porcentagem || 0;
      return `Entrada + Medições (${entrada}% entrada)`;
    
    case 'medicoes':
      return `Medições (${forma.frequencia_medicoes || 'conforme execução'})`;
    
    case 'boletos':
      const qtdBoletos = forma.boletos_quantidade || 1;
      return `${qtdBoletos} Boleto${qtdBoletos > 1 ? 's' : ''}`;
    
    case 'cartao':
      const parcelas = forma.cartao_parcelas || 1;
      const valorParcela = valorTotal / parcelas;
      return `${parcelas}x de R$ ${valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    
    case 'personalizado':
      return forma.texto_personalizado || 'Forma Personalizada';
    
    default:
      return 'Forma de Pagamento';
  }
};

export const MultiFormaPagamentoSelector: React.FC<MultiFormaPagamentoSelectorProps> = ({
  value,
  onChange,
  valorTotal
}) => {
  const [openStates, setOpenStates] = useState<Record<number, boolean>>({
    0: true // Primeira opção sempre aberta
  });

  const adicionarFormaPagamento = () => {
    if (value.length >= 5) return; // Limitar a 5 opções
    
    const novaForma: FormaPagamentoData = {
      tipo: 'a_vista'
    };
    
    const novasFormas = [...value, novaForma];
    onChange(novasFormas);
    
    // Abrir o novo item
    setOpenStates(prev => ({
      ...prev,
      [novasFormas.length - 1]: true
    }));
  };

  const removerFormaPagamento = (index: number) => {
    if (value.length <= 1) return; // Manter pelo menos uma opção
    
    const novasFormas = value.filter((_, i) => i !== index);
    onChange(novasFormas);
    
    // Limpar estado de abertura
    const newOpenStates = { ...openStates };
    delete newOpenStates[index];
    setOpenStates(newOpenStates);
  };

  const atualizarFormaPagamento = (index: number, novaForma: FormaPagamentoData) => {
    const novasFormas = [...value];
    novasFormas[index] = novaForma;
    onChange(novasFormas);
  };

  const toggleOpen = (index: number) => {
    setOpenStates(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Formas de Pagamento Oferecidas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ofereça múltiplas opções para aumentar suas chances de fechar o negócio
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {value.map((forma, index) => (
          <Collapsible
            key={index}
            open={openStates[index]}
            onOpenChange={() => toggleOpen(index)}
          >
            <Card className="border-l-4 border-l-primary">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">
                          {getFormaPagamentoLabel(forma, valorTotal)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Opção {index + 1} de pagamento
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {value.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removerFormaPagamento(index);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {openStates[index] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <FormaPagamentoSelector
                    value={forma}
                    onChange={(novaForma) => atualizarFormaPagamento(index, novaForma)}
                    valorTotal={valorTotal}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}

        {value.length < 5 && (
          <Button
            type="button"
            variant="outline"
            onClick={adicionarFormaPagamento}
            className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Forma de Pagamento
          </Button>
        )}

        {value.length >= 5 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Máximo de 5 formas de pagamento atingido
          </p>
        )}
      </CardContent>
    </Card>
  );
};