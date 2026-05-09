import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Download, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { CategoriaHierarquica } from '../CategoriaHierarquica';
import type { DadosDRE } from '@/hooks/useDRE';

interface TabelaDREProps {
  dados: DadosDRE;
}

export const TabelaDRE = ({ dados }: TabelaDREProps) => {
  const [expandedReceitas, setExpandedReceitas] = React.useState<Set<string>>(new Set());
  const [expandedDespesas, setExpandedDespesas] = React.useState<Set<string>>(new Set());

  const toggleExpansaoReceita = (categoria: string) => {
    const newExpanded = new Set(expandedReceitas);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedReceitas(newExpanded);
  };

  const toggleExpansaoDespesa = (categoria: string) => {
    const newExpanded = new Set(expandedDespesas);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedDespesas(newExpanded);
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', dateStr, error);
      return dateStr;
    }
  };

  const exportarPDF = () => {
    // TODO: Implementar exportação para PDF
    console.log('Exportar PDF');
  };

  const exportarExcel = () => {
    // TODO: Implementar exportação para Excel
    console.log('Exportar Excel');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">DRE - Demonstrativo de Resultado</h3>
          <p className="text-sm text-muted-foreground">
            Período: {formatDate(dados.periodo.inicio)} até {formatDate(dados.periodo.fim)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarPDF} className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportarExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Tabela DRE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* RECEITAS OPERACIONAIS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h4 className="text-lg font-semibold text-green-600">RECEITAS OPERACIONAIS</h4>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Categoria</th>
                    <th className="text-center p-3 font-medium">Qtd</th>
                    <th className="text-right p-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.receitas.map((receita, index) => {
                    const hasSubcategorias = receita.subcategorias && receita.subcategorias.length > 0;
                    const isExpanded = expandedReceitas.has(receita.categoria);
                    
                    return (
                      <React.Fragment key={index}>
                        <tr 
                          className={`border-t hover:bg-muted/30 ${hasSubcategorias ? 'cursor-pointer' : ''}`}
                          onClick={() => hasSubcategorias && toggleExpansaoReceita(receita.categoria)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {hasSubcategorias && (
                                <ChevronRight 
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                              )}
                              {receita.categoria}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary">{receita.quantidade}</Badge>
                          </td>
                          <td className="p-3 text-right font-medium text-green-600">
                            {formatCurrency(receita.valor)}
                          </td>
                        </tr>
                        {hasSubcategorias && isExpanded && receita.subcategorias!.map((sub, subIndex) => (
                          <tr key={`${index}-${subIndex}`} className="border-t bg-muted/20">
                            <td className="p-3 pl-8 text-sm text-muted-foreground">
                              {sub.subcategoria}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="text-xs">{sub.quantidade}</Badge>
                            </td>
                            <td className="p-3 text-right text-sm text-green-600">
                              {formatCurrency(sub.valor)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  <tr className="border-t-2 bg-green-50 font-semibold">
                    <td className="p-3">TOTAL RECEITAS</td>
                    <td className="p-3 text-center">
                      <Badge>{dados.receitas.reduce((acc, r) => acc + r.quantidade, 0)}</Badge>
                    </td>
                    <td className="p-3 text-right text-green-600 text-lg">
                      {formatCurrency(dados.totalReceitas)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DESPESAS OPERACIONAIS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h4 className="text-lg font-semibold text-red-600">DESPESAS OPERACIONAIS</h4>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Categoria</th>
                    <th className="text-center p-3 font-medium">Qtd</th>
                    <th className="text-right p-3 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.despesas.map((despesa, index) => {
                    const hasSubcategorias = despesa.subcategorias && despesa.subcategorias.length > 0;
                    const isExpanded = expandedDespesas.has(despesa.categoria);
                    
                    return (
                      <React.Fragment key={index}>
                        <tr 
                          className={`border-t hover:bg-muted/30 ${hasSubcategorias ? 'cursor-pointer' : ''}`}
                          onClick={() => hasSubcategorias && toggleExpansaoDespesa(despesa.categoria)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {hasSubcategorias && (
                                <ChevronRight 
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                              )}
                              {despesa.categoria}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary">{despesa.quantidade}</Badge>
                          </td>
                          <td className="p-3 text-right font-medium text-red-600">
                            {formatCurrency(despesa.valor)}
                          </td>
                        </tr>
                        {hasSubcategorias && isExpanded && despesa.subcategorias!.map((sub, subIndex) => (
                          <tr key={`${index}-${subIndex}`} className="border-t bg-muted/20">
                            <td className="p-3 pl-8 text-sm text-muted-foreground">
                              {sub.subcategoria}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="text-xs">{sub.quantidade}</Badge>
                            </td>
                            <td className="p-3 text-right text-sm text-red-600">
                              {formatCurrency(sub.valor)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  <tr className="border-t-2 bg-red-50 font-semibold">
                    <td className="p-3">TOTAL DESPESAS</td>
                    <td className="p-3 text-center">
                      <Badge>{dados.despesas.reduce((acc, d) => acc + d.quantidade, 0)}</Badge>
                    </td>
                    <td className="p-3 text-right text-red-600 text-lg">
                      {formatCurrency(dados.totalDespesas)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* RESULTADO OPERACIONAL */}
          <div className="space-y-4">
            <div className="border-2 border-primary rounded-lg bg-primary/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold mb-2">RESULTADO OPERACIONAL</h4>
                  <p className="text-sm text-muted-foreground">
                    Margem Operacional: {dados.margemOperacional.toFixed(2)}%
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${dados.resultadoOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dados.resultadoOperacional)}
                  </div>
                  <Badge 
                    variant={dados.resultadoOperacional >= 0 ? "default" : "destructive"}
                    className="mt-2"
                  >
                    {dados.resultadoOperacional >= 0 ? 'LUCRO' : 'PREJUÍZO'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Executivo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {formatCurrency(dados.totalReceitas)}
                </div>
                <div className="text-sm text-muted-foreground">Total Receitas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {formatCurrency(dados.totalDespesas)}
                </div>
                <div className="text-sm text-muted-foreground">Total Despesas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${dados.resultadoOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dados.resultadoOperacional)}
                </div>
                <div className="text-sm text-muted-foreground">Resultado Final</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};