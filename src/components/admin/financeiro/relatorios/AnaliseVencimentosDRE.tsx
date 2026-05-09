import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosDRE } from '@/hooks/useDRE';

interface AnaliseVencimentosDREProps {
  dados: DadosDRE;
}

interface AnaliseVencimentos {
  contasReceber: {
    emDia: number;
    vencidas: number;
    vencendo: number; // próximos 7 dias
    total: number;
  };
  contasPagar: {
    emDia: number;
    vencidas: number;
    vencendo: number; // próximos 7 dias
    total: number;
  };
  agingReceitas: Array<{
    faixa: string;
    quantidade: number;
    valor: number;
  }>;
  agingDespesas: Array<{
    faixa: string;
    quantidade: number;
    valor: number;
  }>;
  projecaoFluxo: Array<{
    mes: string;
    entradas: number;
    saidas: number;
    saldoProjetado: number;
  }>;
}

export const AnaliseVencimentosDRE = ({ dados }: AnaliseVencimentosDREProps) => {
  const [analiseVencimentos, setAnaliseVencimentos] = useState<AnaliseVencimentos | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarAnaliseVencimentos();
  }, [dados]);

  const carregarAnaliseVencimentos = async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      const proximos7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
      const proximos6Meses = new Date(hoje.getTime() + 180 * 24 * 60 * 60 * 1000);

      // Buscar contas a receber
      const { data: contasReceber } = await supabase
        .from('contas_receber')
        .select('*')
        .gte('data_vencimento', dados.periodo.inicio)
        .lte('data_vencimento', dados.periodo.fim);

      // Buscar contas a pagar
      const { data: contasPagar } = await supabase
        .from('contas_pagar')
        .select('*')
        .gte('data_vencimento', dados.periodo.inicio)
        .lte('data_vencimento', dados.periodo.fim);

      // Buscar projeções futuras (próximos 6 meses)
      const { data: projecaoReceitas } = await supabase
        .from('contas_receber')
        .select('data_vencimento, valor_original, status')
        .gte('data_vencimento', hoje.toISOString().split('T')[0])
        .lte('data_vencimento', proximos6Meses.toISOString().split('T')[0])
        .in('status', ['pendente']);

      const { data: projecaoDespesas } = await supabase
        .from('contas_pagar')
        .select('data_vencimento, valor_original, status')
        .gte('data_vencimento', hoje.toISOString().split('T')[0])
        .lte('data_vencimento', proximos6Meses.toISOString().split('T')[0])
        .in('status', ['pendente']);

      // Processar dados
      const analise: AnaliseVencimentos = {
        contasReceber: {
          emDia: contasReceber?.filter(c => 
            new Date(c.data_vencimento) >= hoje && c.status === 'pendente'
          ).length || 0,
          vencidas: contasReceber?.filter(c => 
            new Date(c.data_vencimento) < hoje && c.status === 'pendente'
          ).length || 0,
          vencendo: contasReceber?.filter(c => 
            new Date(c.data_vencimento) >= hoje && 
            new Date(c.data_vencimento) <= proximos7Dias && 
            c.status === 'pendente'
          ).length || 0,
          total: contasReceber?.length || 0
        },
        contasPagar: {
          emDia: contasPagar?.filter(c => 
            new Date(c.data_vencimento) >= hoje && c.status === 'pendente'
          ).length || 0,
          vencidas: contasPagar?.filter(c => 
            new Date(c.data_vencimento) < hoje && c.status === 'pendente'
          ).length || 0,
          vencendo: contasPagar?.filter(c => 
            new Date(c.data_vencimento) >= hoje && 
            new Date(c.data_vencimento) <= proximos7Dias && 
            c.status === 'pendente'
          ).length || 0,
          total: contasPagar?.length || 0
        },
        agingReceitas: calcularAging(contasReceber || []),
        agingDespesas: calcularAging(contasPagar || []),
        projecaoFluxo: calcularProjecaoFluxo(projecaoReceitas || [], projecaoDespesas || [])
      };

      setAnaliseVencimentos(analise);
    } catch (error) {
      console.error('Erro ao carregar análise de vencimentos:', error);
    }
    setLoading(false);
  };

  const calcularAging = (contas: any[]) => {
    const hoje = new Date();
    const faixas = [
      { nome: 'Em dia', min: 0, max: Infinity },
      { nome: '1-30 dias', min: 1, max: 30 },
      { nome: '31-60 dias', min: 31, max: 60 },
      { nome: '61-90 dias', min: 61, max: 90 },
      { nome: '90+ dias', min: 91, max: Infinity }
    ];

    return faixas.map(faixa => {
      const contasFaixa = contas.filter(conta => {
        const diasVencimento = Math.floor((hoje.getTime() - new Date(conta.data_vencimento).getTime()) / (1000 * 60 * 60 * 24));
        
        if (faixa.nome === 'Em dia') {
          return diasVencimento <= 0 && conta.status === 'pendente';
        }
        
        return diasVencimento >= faixa.min && diasVencimento <= faixa.max && conta.status === 'pendente';
      });

      return {
        faixa: faixa.nome,
        quantidade: contasFaixa.length,
        valor: contasFaixa.reduce((sum, conta) => sum + (conta.valor_original - (conta.valor_recebido || conta.valor_pago || 0)), 0)
      };
    });
  };

  const calcularProjecaoFluxo = (receitas: any[], despesas: any[]) => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 0; i < 6; i++) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 0);
      
      const receitasMes = receitas.filter(r => {
        const dataVencimento = new Date(r.data_vencimento);
        return dataVencimento >= mes && dataVencimento <= proximoMes;
      }).reduce((sum, r) => sum + r.valor_original, 0);

      const despesasMes = despesas.filter(d => {
        const dataVencimento = new Date(d.data_vencimento);
        return dataVencimento >= mes && dataVencimento <= proximoMes;
      }).reduce((sum, d) => sum + d.valor_original, 0);

      meses.push({
        mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        entradas: receitasMes,
        saidas: despesasMes,
        saldoProjetado: receitasMes - despesasMes
      });
    }

    return meses;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading || !analiseVencimentos) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Carregando análise de vencimentos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Geral de Vencimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Contas a Receber</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analiseVencimentos.contasReceber.emDia}</div>
                <div className="text-sm text-muted-foreground">Em Dia</div>
              </div>
              <div className="text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analiseVencimentos.contasReceber.vencendo}</div>
                <div className="text-sm text-muted-foreground">Vencendo</div>
              </div>
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analiseVencimentos.contasReceber.vencidas}</div>
                <div className="text-sm text-muted-foreground">Vencidas</div>
              </div>
            </div>
            <Progress 
              value={(analiseVencimentos.contasReceber.emDia / Math.max(analiseVencimentos.contasReceber.total, 1)) * 100} 
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Contas a Pagar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analiseVencimentos.contasPagar.emDia}</div>
                <div className="text-sm text-muted-foreground">Em Dia</div>
              </div>
              <div className="text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analiseVencimentos.contasPagar.vencendo}</div>
                <div className="text-sm text-muted-foreground">Vencendo</div>
              </div>
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{analiseVencimentos.contasPagar.vencidas}</div>
                <div className="text-sm text-muted-foreground">Vencidas</div>
              </div>
            </div>
            <Progress 
              value={(analiseVencimentos.contasPagar.emDia / Math.max(analiseVencimentos.contasPagar.total, 1)) * 100} 
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>

      {/* Aging de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Aging - Contas a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analiseVencimentos.agingReceitas.map((faixa, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{faixa.faixa}</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(faixa.valor)}</div>
                    <div className="text-xs text-muted-foreground">
                      {faixa.quantidade} contas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aging - Contas a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analiseVencimentos.agingDespesas.map((faixa, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{faixa.faixa}</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(faixa.valor)}</div>
                    <div className="text-xs text-muted-foreground">
                      {faixa.quantidade} contas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projeção de Fluxo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Projeção de Fluxo - Próximos 6 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analiseVencimentos.projecaoFluxo.map((mes, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{mes.mes}</h4>
                  <Badge 
                    variant={mes.saldoProjetado >= 0 ? "default" : "destructive"}
                    className="gap-1"
                  >
                    {formatCurrency(mes.saldoProjetado)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Entradas:</span>
                    <span className="font-medium">{formatCurrency(mes.entradas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Saídas:</span>
                    <span className="font-medium">{formatCurrency(mes.saidas)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};