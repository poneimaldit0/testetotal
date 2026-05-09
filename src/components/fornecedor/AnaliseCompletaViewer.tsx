import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, BarChart3, FileText, Calculator, Search, Lightbulb, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnaliseCompleta } from '@/hooks/useAnalisePropostaIA';

interface AnaliseCompletaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analise: AnaliseCompleta;
  nomeCliente?: string;
  posicionamento?: string;
}

const TABS = [
  { id: 'escopo', label: 'Escopo', icon: FileText },
  { id: 'comparativo', label: 'Comparativo', icon: BarChart3 },
  { id: 'composicao', label: 'Composição', icon: Calculator },
  { id: 'tabela', label: 'Tabela Técnica', icon: ClipboardCheck },
  { id: 'referencia', label: 'Referência', icon: Search },
  { id: 'analise', label: 'Análise', icon: Lightbulb },
  { id: 'conclusao', label: 'Conclusão', icon: CheckCircle },
] as const;

const CORES = {
  azul: '#2D3395',
  laranja: '#F7A226',
  verde: '#1B7A4A',
  ambar: '#E08B00',
  vermelho: '#C0392B',
};

const formatCurrency = (v: number | null | undefined) => {
  if (v == null) return 'N/A';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
};

const BadgeDiferenca: React.FC<{ valor: number }> = ({ valor }) => {
  const abs = Math.abs(valor);
  let cor = CORES.verde;
  let label = 'Normal';
  if (abs > 20) { cor = CORES.vermelho; label = valor > 0 ? 'Acima' : 'Abaixo'; }
  else if (abs > 10) { cor = CORES.ambar; label = valor > 0 ? 'Acima' : 'Abaixo'; }
  else { label = 'Na faixa'; }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: cor }}>
      {valor > 0 ? '+' : ''}{valor.toFixed(1)}% — {label}
    </span>
  );
};

const BarraComparativa: React.FC<{ items: { label: string; valor: number; cor: string }[] }> = ({ items }) => {
  const max = Math.max(...items.map(i => i.valor), 1);
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="font-semibold">{formatCurrency(item.valor)}</span>
          </div>
          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(item.valor / max) * 100}%`, backgroundColor: item.cor }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// === Seção Components ===

const SecaoEscopo: React.FC<{ data: AnaliseCompleta['escopo_projeto'] }> = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>1. Escopo do Projeto</h3>
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <p className="font-medium mb-1" style={{ color: CORES.azul }}>Tipologia: {data.tipologia_identificada}</p>
      {data.area_total && <p className="text-sm text-muted-foreground">Área: {data.area_total}</p>}
    </div>
    <p className="text-sm leading-relaxed">{data.sintese_tecnica}</p>
    {(data.servicos_inclusos || []).length > 0 && (
      <div>
        <p className="font-medium text-sm mb-2">Serviços inclusos:</p>
        <div className="flex flex-wrap gap-2">
          {(data.servicos_inclusos || []).map((s, i) => (
            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
          ))}
        </div>
      </div>
    )}
    {data.observacoes_escopo && <p className="text-sm text-muted-foreground italic">{data.observacoes_escopo}</p>}
  </div>
);

const SecaoComparativo: React.FC<{ data: AnaliseCompleta['comparativo_mercado'] }> = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>2. Comparativo de Mercado</h3>
    {/* Metrics cards */}
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 rounded-lg border" style={{ borderColor: CORES.azul + '40' }}>
        <p className="text-xs text-muted-foreground">Valor Proposto</p>
        <p className="text-lg font-bold" style={{ color: CORES.azul }}>{formatCurrency(data.valor_fornecedor)}</p>
        {data.valor_por_m2_fornecedor != null && data.valor_por_m2_fornecedor > 0 && <p className="text-xs text-muted-foreground">{formatCurrency(data.valor_por_m2_fornecedor)}/m²</p>}
      </div>
      <div className="p-3 rounded-lg border" style={{ borderColor: CORES.laranja + '40' }}>
        <p className="text-xs text-muted-foreground">Média Mercado</p>
        <p className="text-lg font-bold" style={{ color: CORES.laranja }}>{formatCurrency(data.media_mercado)}</p>
        {data.valor_por_m2_mercado != null && data.valor_por_m2_mercado > 0 && <p className="text-xs text-muted-foreground">{formatCurrency(data.valor_por_m2_mercado)}/m²</p>}
      </div>
      <div className="p-3 rounded-lg border" style={{ borderColor: CORES.verde + '40' }}>
        <p className="text-xs text-muted-foreground">Alto Padrão</p>
        <p className="text-lg font-bold" style={{ color: CORES.verde }}>{formatCurrency(data.alto_padrao)}</p>
      </div>
      <div className="p-3 rounded-lg border" style={{ borderColor: data.diferenca_percentual_mercado > 20 ? CORES.vermelho : data.diferenca_percentual_mercado > 10 ? CORES.ambar : CORES.verde }}>
        <p className="text-xs text-muted-foreground">Diferença vs. Mercado</p>
        <p className="text-lg font-bold">
          <BadgeDiferenca valor={data.diferenca_percentual_mercado} />
        </p>
      </div>
    </div>
    {/* Bar chart */}
    <BarraComparativa items={[
      { label: 'Fornecedor', valor: data.valor_fornecedor, cor: CORES.azul },
      { label: 'Média Mercado', valor: data.media_mercado, cor: CORES.laranja },
      { label: 'Alto Padrão', valor: data.alto_padrao, cor: CORES.verde },
    ]} />
  </div>
);

const SecaoComposicao: React.FC<{ data: AnaliseCompleta['composicao'] }> = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>3. Composição M.O × Materiais</h3>
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-lg text-center text-white" style={{ backgroundColor: CORES.azul }}>
        <p className="text-xs opacity-80">Mão de Obra</p>
        <p className="text-lg font-bold">{formatCurrency(data.total_mao_obra)}</p>
        {data.percentual_mao_obra != null && <p className="text-xs opacity-80">{data.percentual_mao_obra.toFixed(0)}%</p>}
      </div>
      <div className="p-3 rounded-lg text-center text-white" style={{ backgroundColor: CORES.laranja }}>
        <p className="text-xs opacity-80">Materiais</p>
        <p className="text-lg font-bold">{formatCurrency(data.total_materiais)}</p>
        {data.percentual_materiais != null && <p className="text-xs opacity-80">{data.percentual_materiais.toFixed(0)}%</p>}
      </div>
      <div className="p-3 rounded-lg text-center text-white" style={{ backgroundColor: CORES.verde }}>
        <p className="text-xs opacity-80">Gestão/BDI</p>
        <p className="text-lg font-bold">{formatCurrency(data.total_gestao_bdi || 0)}</p>
        {data.percentual_gestao != null && <p className="text-xs opacity-80">{data.percentual_gestao.toFixed(0)}%</p>}
      </div>
    </div>
    {(data.detalhamento_categorias || []).length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ backgroundColor: CORES.azul + '10' }}>
              <th className="text-left p-2 border-b font-medium">Categoria</th>
              <th className="text-right p-2 border-b font-medium">M.O</th>
              <th className="text-right p-2 border-b font-medium">Material</th>
              <th className="text-right p-2 border-b font-medium">Total</th>
              <th className="text-right p-2 border-b font-medium">% M.O</th>
            </tr>
          </thead>
          <tbody>
            {(data.detalhamento_categorias || []).map((cat, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="p-2 font-medium">{cat.categoria}</td>
                <td className="p-2 text-right">{formatCurrency(cat.mao_obra)}</td>
                <td className="p-2 text-right">{formatCurrency(cat.material)}</td>
                <td className="p-2 text-right font-medium">{formatCurrency(cat.total)}</td>
                <td className="p-2 text-right">{cat.percentual_mo != null ? `${cat.percentual_mo.toFixed(0)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const SecaoTabelaTecnica: React.FC<{ data: AnaliseCompleta['tabela_tecnica'] }> = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>4. Tabela Técnica do Orçamento</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {[
            ['Empresa', data.empresa],
            ['Valor Total', formatCurrency(data.valor_total)],
            ['Composição', data.composicao_resumo],
            ['vs. Mercado', data.vs_mercado],
            ['vs. Alto Padrão', data.vs_alto_padrao || '—'],
            ['Escopo', data.escopo_resumo || '—'],
            ['Prazo', data.prazo_informado || 'Não informado'],
            ['Pagamento', data.condicoes_pagamento || 'Não informado'],
          ].map(([label, value], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="p-2 font-medium border-b" style={{ color: CORES.azul }}>{label}</td>
              <td className="p-2 border-b">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {data.pontos_fortes_tecnicos && data.pontos_fortes_tecnicos.length > 0 && (
        <div>
          <p className="font-medium text-sm mb-2" style={{ color: CORES.verde }}>Pontos Fortes</p>
          {data.pontos_fortes_tecnicos.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-sm mb-1">
              <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: CORES.verde }} />
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}
      {data.pontos_fracos_tecnicos && data.pontos_fracos_tecnicos.length > 0 && (
        <div>
          <p className="font-medium text-sm mb-2" style={{ color: CORES.vermelho }}>Pontos Fracos</p>
          {data.pontos_fracos_tecnicos.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-sm mb-1">
              <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: CORES.vermelho }} />
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const SecaoReferencia: React.FC<{ data: AnaliseCompleta['referencia_mercado'] }> = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>5. Referência de Mercado</h3>
    <div className="p-3 rounded-lg border" style={{ borderColor: CORES.laranja + '60', backgroundColor: CORES.laranja + '08' }}>
      <p className="text-sm font-medium mb-1">Índice utilizado: {data.indice_utilizado}</p>
      <p className="text-sm whitespace-pre-wrap">{data.calculo_passo_a_passo}</p>
    </div>
    <blockquote className="border-l-4 pl-3 italic text-sm text-muted-foreground" style={{ borderColor: CORES.laranja }}>
      {data.citacao_referencia}
    </blockquote>
    {data.itens_especiais_separados && data.itens_especiais_separados.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-1">Itens especiais (separados da comparação):</p>
        <div className="flex flex-wrap gap-2">
          {data.itens_especiais_separados.map((item, i) => (
            <Badge key={i} variant="outline" className="text-xs border-amber-300 text-amber-700">{item}</Badge>
          ))}
        </div>
      </div>
    )}
    {(data.comparacao_por_categoria || []).length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ backgroundColor: CORES.azul + '10' }}>
              <th className="text-left p-2 border-b font-medium">Categoria</th>
              <th className="text-right p-2 border-b font-medium">Fornecedor</th>
              <th className="text-right p-2 border-b font-medium">Ref. SINAPI</th>
              <th className="text-right p-2 border-b font-medium">Diferença</th>
              <th className="text-center p-2 border-b font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.comparacao_por_categoria || []).map((cat, i) => {
              const badgeCor = cat.badge === 'verde' ? CORES.verde : cat.badge === 'ambar' ? CORES.ambar : CORES.vermelho;
              return (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-2 font-medium">{cat.categoria}</td>
                  <td className="p-2 text-right">{formatCurrency(cat.valor_fornecedor)}</td>
                  <td className="p-2 text-right">{formatCurrency(cat.valor_referencia_sinapi)}</td>
                  <td className="p-2 text-right">{cat.diferenca_percentual > 0 ? '+' : ''}{cat.diferenca_percentual.toFixed(1)}%</td>
                  <td className="p-2 text-center">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: badgeCor }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
    {data.fontes && data.fontes.length > 0 && (
      <p className="text-xs text-muted-foreground">Fontes: {data.fontes.join(' | ')}</p>
    )}
  </div>
);

const SecaoAnaliseTecnica: React.FC<{ data: AnaliseCompleta['analise_tecnica'] }> = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>6. Análise Técnica</h3>
    <div className="space-y-3 text-sm leading-relaxed">
      <div>
        <p className="font-medium mb-1" style={{ color: CORES.azul }}>Posicionamento Geral</p>
        <p>{data.posicionamento_geral}</p>
      </div>
      <div>
        <p className="font-medium mb-1" style={{ color: CORES.azul }}>Justificativas de Valores</p>
        <p>{data.justificativas_valores}</p>
      </div>
      <div>
        <p className="font-medium mb-1" style={{ color: CORES.ambar }}>Itens de Atenção / Negociação</p>
        <p>{data.itens_atencao_negociacao}</p>
      </div>
      <div>
        <p className="font-medium mb-1" style={{ color: CORES.vermelho }}>Pontos a Esclarecer</p>
        <p>{data.pontos_esclarecimento}</p>
      </div>
    </div>
  </div>
);

const SecaoConclusao: React.FC<{ data: AnaliseCompleta['conclusao'] | null | undefined }> = ({ data }) => {
  if (!data) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>7. Conclusão Técnica</h3>
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-muted-foreground">
          Conclusão não disponível para esta análise.
        </div>
      </div>
    );
  }

  const positivos = Array.isArray(data.pontos_positivos) ? data.pontos_positivos : [];
  const negativos = Array.isArray(data.pontos_negativos) ? data.pontos_negativos : [];
  const recomendacao = data.recomendacao_final ?? null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold" style={{ color: CORES.azul }}>7. Conclusão Técnica</h3>
      {(positivos.length > 0 || negativos.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {positivos.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: CORES.verde }} />
                <span>{p}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {negativos.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: CORES.vermelho }} />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pontos positivos e negativos não disponíveis.</p>
      )}
      <div className="p-4 rounded-lg" style={{ backgroundColor: CORES.azul + '08', borderLeft: `4px solid ${CORES.azul}` }}>
        <p className="font-medium text-sm mb-1" style={{ color: CORES.azul }}>Recomendação Final</p>
        <p className="text-sm">{recomendacao ?? 'Recomendação não disponível para esta análise.'}</p>
      </div>
    </div>
  );
};

export const AnaliseCompletaViewer: React.FC<AnaliseCompletaViewerProps> = ({
  open,
  onOpenChange,
  analise,
  nomeCliente,
  posicionamento,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const renderSection = () => {
    switch (TABS[activeTab].id) {
      case 'escopo': return <SecaoEscopo data={analise.escopo_projeto} />;
      case 'comparativo': return <SecaoComparativo data={analise.comparativo_mercado} />;
      case 'composicao': return <SecaoComposicao data={analise.composicao} />;
      case 'tabela': return <SecaoTabelaTecnica data={analise.tabela_tecnica} />;
      case 'referencia': return <SecaoReferencia data={analise.referencia_mercado} />;
      case 'analise': return <SecaoAnaliseTecnica data={analise.analise_tecnica} />;
      case 'conclusao': return <SecaoConclusao data={analise.conclusao ?? null} />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header sticky */}
        <div className="sticky top-0 z-10 bg-white">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold" style={{ color: CORES.azul, fontFamily: "'DM Serif Display', serif" }}>
                Análise Reforma100
              </DialogTitle>
              {nomeCliente && <p className="text-sm text-muted-foreground">{nomeCliente}</p>}
            </div>
            {posicionamento && (
              <Badge className={cn('text-xs text-white',
                posicionamento === 'dentro_media' ? 'bg-blue-500' :
                posicionamento === 'abaixo_media' ? 'bg-green-500' : 'bg-red-500'
              )}>
                {posicionamento === 'dentro_media' ? 'Dentro da média' :
                 posicionamento === 'abaixo_media' ? 'Abaixo da média' : 'Acima da média'}
              </Badge>
            )}
          </div>
          <div className="h-1" style={{ backgroundColor: CORES.laranja }} />
          {/* Tabs */}
          <div className="px-4 py-2 flex gap-1 overflow-x-auto border-b">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                    activeTab === i
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                  style={activeTab === i ? { backgroundColor: CORES.azul } : {}}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {renderSection()}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
            disabled={activeTab === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <p className="text-xs text-center" style={{ color: CORES.azul }}>
            reforma100 | Seu hub de reformas 100% seguro e confiável
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab(Math.min(TABS.length - 1, activeTab + 1))}
            disabled={activeTab === TABS.length - 1}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
