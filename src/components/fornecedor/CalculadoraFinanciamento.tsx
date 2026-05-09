import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Download, AlertCircle, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ParcelaSimulacao {
  numeroParcelas: number;
  valorParcela: number;
  valorUltimaParcela?: number;
}

export const CalculadoraFinanciamento = () => {
  const [valorContrato, setValorContrato] = useState<number>(0);
  const [sistemaAmortizacao, setSistemaAmortizacao] = useState<'price' | 'sac'>('price');
  
  const opcoesParcelamento = [12, 24, 36, 48, 60, 75];
  
  // Cálculo PRICE (parcelas fixas)
  const calcularPrice = (pv: number, taxa: number, n: number): number => {
    if (pv <= 0) return 0;
    const i = taxa / 100;
    const fator = Math.pow(1 + i, n);
    return pv * (i * fator) / (fator - 1);
  };
  
  // Cálculo SAC (amortização constante)
  const calcularSAC = (
    pv: number, 
    taxa: number, 
    n: number
  ): { primeira: number; ultima: number } => {
    if (pv <= 0) return { primeira: 0, ultima: 0 };
    
    const i = taxa / 100;
    const amortizacao = pv / n;
    
    const primeiraParcela = amortizacao + (pv * i);
    const ultimaParcela = amortizacao + (amortizacao * i);
    
    return {
      primeira: primeiraParcela,
      ultima: ultimaParcela
    };
  };
  
  // Gerar simulações para taxa baixa (1,39%)
  const simulacaoTaxaBaixa: ParcelaSimulacao[] = useMemo(() => {
    return opcoesParcelamento.map(numParcelas => {
      if (sistemaAmortizacao === 'price') {
        const valorParcela = calcularPrice(valorContrato, 1.39, numParcelas);
        return {
          numeroParcelas: numParcelas,
          valorParcela: valorParcela
        };
      } else {
        const { primeira, ultima } = calcularSAC(valorContrato, 1.39, numParcelas);
        return {
          numeroParcelas: numParcelas,
          valorParcela: primeira,
          valorUltimaParcela: ultima
        };
      }
    });
  }, [valorContrato, sistemaAmortizacao]);
  
  // Gerar simulações para taxa alta (2,50%)
  const simulacaoTaxaAlta: ParcelaSimulacao[] = useMemo(() => {
    return opcoesParcelamento.map(numParcelas => {
      if (sistemaAmortizacao === 'price') {
        const valorParcela = calcularPrice(valorContrato, 2.50, numParcelas);
        return {
          numeroParcelas: numParcelas,
          valorParcela: valorParcela
        };
      } else {
        const { primeira, ultima } = calcularSAC(valorContrato, 2.50, numParcelas);
        return {
          numeroParcelas: numParcelas,
          valorParcela: primeira,
          valorUltimaParcela: ultima
        };
      }
    });
  }, [valorContrato, sistemaAmortizacao]);
  
  // Formatar moeda
  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  };
  
  // Manipular input de valor
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '');
    setValorContrato(Number(valor) / 100);
  };
  
  // Gerar PDF da simulação comparativa
  const gerarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Comparativo de Taxas - ReformaCred', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Valor do Contrato: ${formatarMoeda(valorContrato)}`, 14, 32);
    doc.text(`Sistema: ${sistemaAmortizacao.toUpperCase()}`, 14, 40);
    
    // Descrição do sistema
    doc.setFontSize(10);
    if (sistemaAmortizacao === 'price') {
      doc.text('(Parcelas fixas - mesmo valor do início ao fim)', 14, 46);
    } else {
      doc.text('(Parcelas decrescentes - começa mais alto e diminui)', 14, 46);
    }
    
    // Tabela comparativa
    const dados = simulacaoTaxaBaixa.map((itemBaixo, index) => {
      const itemAlto = simulacaoTaxaAlta[index];
      
      if (sistemaAmortizacao === 'price') {
        return [
          `${itemBaixo.numeroParcelas}x`,
          formatarMoeda(itemBaixo.valorParcela),
          formatarMoeda(itemAlto.valorParcela)
        ];
      } else {
        return [
          `${itemBaixo.numeroParcelas}x`,
          `${formatarMoeda(itemBaixo.valorParcela)} - ${formatarMoeda(itemBaixo.valorUltimaParcela!)}`,
          `${formatarMoeda(itemAlto.valorParcela)} - ${formatarMoeda(itemAlto.valorUltimaParcela!)}`
        ];
      }
    });
    
    autoTable(doc, {
      startY: 54,
      head: [['Parcelas', 'Taxa 1,39% a.m.', 'Taxa 2,50% a.m.']],
      body: dados,
      theme: 'grid',
      headStyles: { fillColor: [0, 123, 255] },
      columnStyles: {
        1: { fillColor: [220, 252, 231] }, // verde claro
        2: { fillColor: [255, 237, 213] }  // laranja claro
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(220, 53, 69);
    doc.text('IMPORTANTE: As condições apresentadas são simulações e devem ser', 14, finalY);
    doc.text('validadas com um consultor financeiro ReformaCred. Taxas e prazos', 14, finalY + 5);
    doc.text('podem variar conforme análise de perfil e políticas vigentes.', 14, finalY + 10);
    
    doc.save(`reformacred-comparativo-${Date.now()}.pdf`);
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Calculadora de Financiamento ReformaCred
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Input Valor do Contrato */}
          <div className="space-y-2">
            <Label htmlFor="valorContrato">Valor do Contrato</Label>
            <Input
              id="valorContrato"
              type="text"
              value={valorContrato > 0 ? formatarMoeda(valorContrato) : ''}
              onChange={handleValorChange}
              placeholder="R$ 0,00"
              className="text-2xl font-bold text-primary"
            />
          </div>
          
          {/* Toggle Price/SAC */}
          <div className="space-y-2">
            <Label>Sistema de Amortização</Label>
            <Tabs 
              value={sistemaAmortizacao} 
              onValueChange={(v) => setSistemaAmortizacao(v as 'price' | 'sac')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="price">
                  Price (Parcelas Fixas)
                </TabsTrigger>
                <TabsTrigger value="sac">
                  SAC (Amortização Constante)
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Explicação do sistema */}
            <div className="bg-muted/50 p-3 rounded-md text-sm">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  {sistemaAmortizacao === 'price' ? (
                    <p>
                      <strong className="text-foreground">Price:</strong> Todas as parcelas têm o mesmo valor 
                      do início ao fim do financiamento.
                    </p>
                  ) : (
                    <p>
                      <strong className="text-foreground">SAC:</strong> As parcelas começam mais altas e 
                      diminuem ao longo do tempo. Você paga menos juros no total.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabela de Comparação de Taxas */}
          {valorContrato > 0 && (
            <div className="space-y-2">
              <Label>📋 Comparação de Taxas</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold">
                        Parcelas
                      </th>
                      <th className="px-4 py-3 text-center font-semibold border-l">
                        <div className="space-y-1">
                          <div className="text-green-600">Taxa 1,39% a.m.</div>
                          <div className="text-xs font-normal text-muted-foreground">
                            (Melhor cenário)
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center font-semibold border-l">
                        <div className="space-y-1">
                          <div className="text-orange-600">Taxa 2,50% a.m.</div>
                          <div className="text-xs font-normal text-muted-foreground">
                            (Cenário padrão)
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulacaoTaxaBaixa.map((itemBaixo, index) => {
                      const itemAlto = simulacaoTaxaAlta[index];
                      return (
                        <tr 
                          key={index}
                          className="border-t hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-center font-semibold">
                            {itemBaixo.numeroParcelas}x
                          </td>
                          
                          {/* Coluna Taxa Baixa (1.39%) */}
                          <td className="px-4 py-3 text-center border-l bg-green-50/50">
                            {sistemaAmortizacao === 'price' ? (
                              <span className="font-bold text-green-700">
                                {formatarMoeda(itemBaixo.valorParcela)}
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-bold text-green-700">
                                  {formatarMoeda(itemBaixo.valorParcela)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  até {formatarMoeda(itemBaixo.valorUltimaParcela!)}
                                </div>
                              </div>
                            )}
                          </td>
                          
                          {/* Coluna Taxa Alta (2.50%) */}
                          <td className="px-4 py-3 text-center border-l bg-orange-50/50">
                            {sistemaAmortizacao === 'price' ? (
                              <span className="font-bold text-orange-700">
                                {formatarMoeda(itemAlto.valorParcela)}
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-bold text-orange-700">
                                  {formatarMoeda(itemAlto.valorParcela)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  até {formatarMoeda(itemAlto.valorUltimaParcela!)}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Aviso Legal */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>IMPORTANTE:</strong> As condições apresentadas são 
              simulações e devem ser validadas com um consultor financeiro 
              ReformaCred. Taxas e prazos podem variar conforme análise de 
              perfil e políticas vigentes.
            </AlertDescription>
          </Alert>
          
          {/* Botão de Download PDF */}
          {valorContrato > 0 && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={gerarPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Simulação em PDF
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Card Informativo */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">
              💡 Vantagens do ReformaCred
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Financiamento direto para reformas e construções</li>
              <li>Aprovação em até 48 horas</li>
              <li>Taxas competitivas do mercado (1,39% a 2,50% a.m.)</li>
              <li>Parcelas de 12 até 75 meses</li>
              <li>Escolha entre Price ou SAC</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
