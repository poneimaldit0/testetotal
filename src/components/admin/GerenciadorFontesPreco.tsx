import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  NV:  '#0D1B2A',
  NV2: '#1A2E42',
  LJ:  '#E8510A',
  FD:  '#F5F3EF',
  BD:  '#E0DDD7',
  CZ:  '#6B6760',
  white: '#FFFFFF',
  ok:  '#16a34a',
  warn:'#d97706',
  err: '#dc2626',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Versao {
  id: string;
  mes_referencia: string;
  status: 'pendente_validacao' | 'ativa' | 'arquivada' | 'rejeitada';
  criada_at: string;
  ativada_at: string | null;
  rejeitada_at: string | null;
  motivo_rejeicao: string | null;
  total_itens: number;
  itens_novos: number;
  itens_removidos: number;
  itens_alterados: number;
  itens_fora_curva: number;
  resumo_mudancas: { texto: string } | null;
}

interface Relatorio {
  id: string;
  versao_id: string;
  conteudo: Record<string, unknown>;
  alertas: string[];
  recomendacao: 'aprovar' | 'revisar' | null;
  resumo_por_fonte: Record<string, { total: number; fora_curva: number; pendente: number }>;
  gerado_at: string;
}

interface ItemDetalhe {
  id: string;
  codigo: string;
  fonte: string;
  categoria: string;
  descricao: string;
  unidade: string;
  valor_referencia: number;
  valor_minimo: number | null;
  valor_maximo: number | null;
  variacao_percentual: number | null;
  status_coleta: string;
  observacoes: string | null;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Versao['status'] }) {
  const map: Record<string, [string, string]> = {
    ativa:               ['Ativa',            C.ok],
    pendente_validacao:  ['Aguardando revisão', C.warn],
    arquivada:           ['Arquivada',         C.CZ],
    rejeitada:           ['Rejeitada',         C.err],
  };
  const [label, color] = map[status] ?? ['?', C.CZ];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
      background: color + '22', color, border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  );
}

function ColetaBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    coletado:        ['✓', C.ok],
    pendente_revisao:['?', C.warn],
    nao_encontrado:  ['✗', C.CZ],
    fora_da_curva:   ['⚠', C.err],
  };
  const [icon, color] = map[status] ?? ['?', C.CZ];
  return <span style={{ color, fontWeight: 700, fontSize: 13 }} title={status}>{icon}</span>;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function GerenciadorFontesPreco() {
  const { profile } = useAuth();
  const [versoes, setVersoes]           = useState<Versao[]>([]);
  const [relatorio, setRelatorio]       = useState<Relatorio | null>(null);
  const [itensDetalhe, setItensDetalhe] = useState<ItemDetalhe[]>([]);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [coletando, setColetando]       = useState(false);
  const [ativando, setAtivando]         = useState(false);
  const [rejeitando, setRejeitando]     = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showRejeitar, setShowRejeitar] = useState(false);
  const [filtroFonte, setFiltroFonte]   = useState<string>('todas');
  const [msg, setMsg] = useState<{ texto: string; tipo: 'ok' | 'erro' } | null>(null);

  const showMsg = (texto: string, tipo: 'ok' | 'erro') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg(null), 5000);
  };

  const carregarVersoes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('fontes_preco_versoes')
      .select('*')
      .order('criada_at', { ascending: false })
      .limit(20);
    setVersoes((data as Versao[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregarVersoes(); }, [carregarVersoes]);

  const carregarDetalhes = useCallback(async (versaoId: string) => {
    if (expandedId === versaoId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(versaoId);
    setFiltroFonte('todas');

    const [{ data: rel }, { data: itens }] = await Promise.all([
      supabase.from('fontes_preco_relatorios').select('*').eq('versao_id', versaoId).maybeSingle(),
      supabase.from('fontes_preco_itens').select('*').eq('versao_id', versaoId).order('fonte').order('codigo'),
    ]);

    setRelatorio(rel as Relatorio | null);
    setItensDetalhe((itens as ItemDetalhe[]) ?? []);
  }, [expandedId]);

  const handleColetar = async () => {
    setColetando(true);
    try {
      const { data, error } = await supabase.functions.invoke('coletar-fontes-preco', {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showMsg(`Coleta iniciada! Versão ${data.mes_referencia} criada com ${data.total_itens} itens. Recomendação: ${data.recomendacao}`, 'ok');
      await carregarVersoes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg(`Erro na coleta: ${msg}`, 'erro');
    } finally {
      setColetando(false);
    }
  };

  const handleAtivar = async (versaoId: string) => {
    setAtivando(true);
    try {
      const { data, error } = await supabase.functions.invoke('ativar-versao-fontes', {
        body: { versao_id: versaoId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      showMsg(`Versão ${data.mes_referencia} ativada! Estimativas usarão os novos valores.`, 'ok');
      setExpandedId(null);
      await carregarVersoes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg(`Erro ao ativar: ${msg}`, 'erro');
    } finally {
      setAtivando(false);
    }
  };

  const handleRejeitar = async (versaoId: string) => {
    if (!motivoRejeicao.trim()) {
      showMsg('Informe o motivo da rejeição', 'erro');
      return;
    }
    setRejeitando(true);
    try {
      const { error } = await supabase
        .from('fontes_preco_versoes')
        .update({
          status:          'rejeitada',
          rejeitada_at:    new Date().toISOString(),
          rejeitada_por:   profile?.id,
          motivo_rejeicao: motivoRejeicao,
        })
        .eq('id', versaoId);
      if (error) throw error;
      showMsg('Versão rejeitada. Faça uma nova coleta quando necessário.', 'ok');
      setShowRejeitar(false);
      setMotivoRejeicao('');
      setExpandedId(null);
      await carregarVersoes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showMsg(`Erro ao rejeitar: ${msg}`, 'erro');
    } finally {
      setRejeitando(false);
    }
  };

  const versaoAtiva    = versoes.find(v => v.status === 'ativa');
  const versaoPendente = versoes.find(v => v.status === 'pendente_validacao');

  const fontesFiltro = filtroFonte === 'todas'
    ? itensDetalhe
    : itensDetalhe.filter(i => i.fonte === filtroFonte);

  const fonteOptions = [...new Set(itensDetalhe.map(i => i.fonte))].sort();

  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif', color: C.NV, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: '"Syne", sans-serif', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Base de Preços de Referência
          </h2>
          <p style={{ color: C.CZ, fontSize: 13, marginTop: 4 }}>
            Coleta semi-automática mensal — aprovação manual obrigatória antes de ativação
          </p>
        </div>
        <button
          onClick={handleColetar}
          disabled={coletando || !!versaoPendente}
          style={{
            background: coletando || versaoPendente ? C.BD : C.LJ,
            color: C.white, border: 'none', borderRadius: 8, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, cursor: coletando || versaoPendente ? 'not-allowed' : 'pointer',
            fontFamily: '"DM Sans", sans-serif',
          }}
          title={versaoPendente ? 'Já existe uma versão pendente de aprovação' : undefined}
        >
          {coletando ? '⏳ Coletando...' : '+ Coletar Nova Versão'}
        </button>
      </div>

      {/* Mensagem de feedback */}
      {msg && (
        <div style={{
          background: msg.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msg.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          fontSize: 13, color: msg.tipo === 'ok' ? C.ok : C.err,
        }}>
          {msg.texto}
        </div>
      )}

      {/* Cards de status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatusCard
          label="Versão Ativa"
          value={versaoAtiva?.mes_referencia ?? 'Nenhuma'}
          sub={versaoAtiva ? `${versaoAtiva.total_itens} itens | Aprovada ${versaoAtiva.ativada_at?.substring(0,10) ?? ''}` : 'Sem versão aprovada — estimativas usam valores hardcoded'}
          color={versaoAtiva ? C.ok : C.CZ}
        />
        <StatusCard
          label="Versão Pendente"
          value={versaoPendente?.mes_referencia ?? 'Nenhuma'}
          sub={versaoPendente ? `${versaoPendente.total_itens} itens | ${versaoPendente.itens_fora_curva} fora da curva` : 'Nenhuma aguardando aprovação'}
          color={versaoPendente ? C.warn : C.CZ}
        />
        <StatusCard
          label="Total de Versões"
          value={String(versoes.length)}
          sub={`${versoes.filter(v => v.status === 'arquivada').length} arquivadas, ${versoes.filter(v => v.status === 'rejeitada').length} rejeitadas`}
          color={C.NV2}
        />
      </div>

      {/* Lista de versões */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.CZ }}>Carregando versões...</div>
      ) : versoes.length === 0 ? (
        <div style={{
          background: C.white, border: `1px solid ${C.BD}`, borderRadius: 12,
          padding: 40, textAlign: 'center', color: C.CZ,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sem versões ainda</div>
          <div style={{ fontSize: 13 }}>Clique em "Coletar Nova Versão" para iniciar o sistema</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {versoes.map(v => (
            <div key={v.id} style={{
              background: C.white, border: `1px solid ${expandedId === v.id ? C.LJ : C.BD}`,
              borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s',
            }}>
              {/* Row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                  cursor: 'pointer',
                }}
                onClick={() => carregarDetalhes(v.id)}
              >
                <span style={{ fontSize: 20 }}>
                  {v.status === 'ativa' ? '✅' : v.status === 'pendente_validacao' ? '🕐' : v.status === 'arquivada' ? '📦' : '❌'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontFamily: '"Syne", sans-serif', fontSize: 15 }}>
                      {v.mes_referencia}
                    </span>
                    <StatusBadge status={v.status} />
                    {v.itens_fora_curva > 0 && (
                      <span style={{ fontSize: 11, background: C.err + '22', color: C.err, padding: '1px 6px', borderRadius: 8 }}>
                        ⚠ {v.itens_fora_curva} fora da curva
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.CZ, marginTop: 2 }}>
                    {v.total_itens} itens · {v.itens_alterados} alterados · {v.itens_novos} novos ·{' '}
                    Criada {new Date(v.criada_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <span style={{ color: C.CZ, fontSize: 14 }}>{expandedId === v.id ? '▲' : '▼'}</span>
              </div>

              {/* Expansão */}
              {expandedId === v.id && (
                <div style={{ borderTop: `1px solid ${C.BD}`, padding: '16px 20px' }}>
                  {/* Resumo mudanças */}
                  {v.resumo_mudancas?.texto && (
                    <div style={{
                      background: C.FD, border: `1px solid ${C.BD}`, borderRadius: 8,
                      padding: '10px 14px', fontSize: 13, marginBottom: 16, color: C.NV,
                    }}>
                      <strong>Resumo:</strong> {v.resumo_mudancas.texto}
                    </div>
                  )}

                  {/* Rejeição */}
                  {v.status === 'rejeitada' && v.motivo_rejeicao && (
                    <div style={{
                      background: '#fef2f2', border: `1px solid #fecaca`, borderRadius: 8,
                      padding: '10px 14px', fontSize: 13, marginBottom: 16, color: C.err,
                    }}>
                      <strong>Motivo da rejeição:</strong> {v.motivo_rejeicao}
                    </div>
                  )}

                  {/* Relatório */}
                  {relatorio && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Relatório de coleta</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        <RecomBadge recomendacao={relatorio.recomendacao} />
                        {relatorio.alertas?.length > 0 && (
                          <span style={{ fontSize: 11, color: C.warn }}>
                            {relatorio.alertas.length} alerta(s)
                          </span>
                        )}
                      </div>
                      {relatorio.alertas?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          {relatorio.alertas.map((a, i) => (
                            <div key={i} style={{
                              fontSize: 12, background: '#fffbeb', border: '1px solid #fef08a',
                              borderRadius: 6, padding: '6px 10px', marginBottom: 4,
                            }}>
                              ⚠ {a}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Resumo por fonte */}
                      {Object.keys(relatorio.resumo_por_fonte ?? {}).length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {Object.entries(relatorio.resumo_por_fonte).map(([fonte, stats]) => (
                            <div key={fonte} style={{
                              background: C.FD, border: `1px solid ${C.BD}`, borderRadius: 8,
                              padding: '6px 12px', fontSize: 11,
                            }}>
                              <strong>{fonte}</strong>: {stats.total} itens
                              {stats.fora_curva > 0 && <span style={{ color: C.err }}> · {stats.fora_curva} ⚠</span>}
                              {stats.pendente  > 0 && <span style={{ color: C.warn }}> · {stats.pendente} ?</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tabela de itens */}
                  {itensDetalhe.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>Itens ({fontesFiltro.length})</span>
                        <select
                          value={filtroFonte}
                          onChange={e => setFiltroFonte(e.target.value)}
                          style={{
                            fontSize: 12, border: `1px solid ${C.BD}`, borderRadius: 6,
                            padding: '3px 8px', background: C.white,
                          }}
                        >
                          <option value="todas">Todas as fontes</option>
                          {fonteOptions.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: C.FD }}>
                              {['', 'Código', 'Descrição', 'Und', 'Mín', 'Ref', 'Máx', 'Var%', 'Obs'].map(h => (
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: C.CZ, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.BD}` }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {fontesFiltro.map((item, i) => (
                              <tr key={item.id} style={{ background: i % 2 === 0 ? C.white : C.FD }}>
                                <td style={{ padding: '5px 10px' }}><ColetaBadge status={item.status_coleta} /></td>
                                <td style={{ padding: '5px 10px', fontFamily: 'monospace', color: C.CZ, whiteSpace: 'nowrap' }}>{item.codigo}</td>
                                <td style={{ padding: '5px 10px', maxWidth: 240 }}>{item.descricao}</td>
                                <td style={{ padding: '5px 10px', color: C.CZ, whiteSpace: 'nowrap' }}>{item.unidade}</td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  {item.valor_minimo != null ? fmtBRL(item.valor_minimo) : '—'}
                                </td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  {fmtBRL(item.valor_referencia)}
                                </td>
                                <td style={{ padding: '5px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  {item.valor_maximo != null ? fmtBRL(item.valor_maximo) : '—'}
                                </td>
                                <td style={{
                                  padding: '5px 10px', textAlign: 'right', whiteSpace: 'nowrap',
                                  color: item.variacao_percentual == null ? C.CZ
                                    : Math.abs(item.variacao_percentual) > 15 ? C.err
                                    : item.variacao_percentual > 0 ? '#16a34a' : '#2563eb',
                                  fontWeight: 600,
                                }}>
                                  {item.variacao_percentual != null
                                    ? `${item.variacao_percentual > 0 ? '+' : ''}${item.variacao_percentual.toFixed(1)}%`
                                    : '—'
                                  }
                                </td>
                                <td style={{ padding: '5px 10px', color: C.CZ, maxWidth: 180, fontSize: 11 }}>
                                  {item.observacoes ?? ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  {v.status === 'pendente_validacao' && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleAtivar(v.id)}
                        disabled={ativando}
                        style={{
                          background: C.ok, color: C.white, border: 'none', borderRadius: 8,
                          padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: ativando ? 'not-allowed' : 'pointer',
                          fontFamily: '"DM Sans", sans-serif',
                        }}
                      >
                        {ativando ? 'Ativando...' : '✅ Aprovar e Ativar'}
                      </button>
                      <button
                        onClick={() => setShowRejeitar(r => !r)}
                        style={{
                          background: 'transparent', color: C.err, border: `1px solid ${C.err}`,
                          borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: '"DM Sans", sans-serif',
                        }}
                      >
                        ❌ Rejeitar
                      </button>
                    </div>
                  )}

                  {showRejeitar && v.status === 'pendente_validacao' && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        value={motivoRejeicao}
                        onChange={e => setMotivoRejeicao(e.target.value)}
                        placeholder="Informe o motivo da rejeição..."
                        style={{
                          flex: 1, minWidth: 200, padding: '8px 12px', border: `1px solid ${C.BD}`,
                          borderRadius: 8, fontSize: 13, fontFamily: '"DM Sans", sans-serif',
                        }}
                      />
                      <button
                        onClick={() => handleRejeitar(v.id)}
                        disabled={rejeitando || !motivoRejeicao.trim()}
                        style={{
                          background: C.err, color: C.white, border: 'none', borderRadius: 8,
                          padding: '8px 16px', fontSize: 13, fontWeight: 600,
                          cursor: rejeitando || !motivoRejeicao.trim() ? 'not-allowed' : 'pointer',
                          fontFamily: '"DM Sans", sans-serif',
                        }}
                      >
                        {rejeitando ? 'Rejeitando...' : 'Confirmar rejeição'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.BD}`, borderRadius: 12,
      padding: '16px 20px', borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, color: C.CZ, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: '"Syne", sans-serif', color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.CZ }}>{sub}</div>
    </div>
  );
}

function RecomBadge({ recomendacao }: { recomendacao: 'aprovar' | 'revisar' | null }) {
  if (!recomendacao) return null;
  const isAprovar = recomendacao === 'aprovar';
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
      background: isAprovar ? '#f0fdf4' : '#fffbeb',
      color: isAprovar ? C.ok : C.warn,
      border: `1px solid ${isAprovar ? '#bbf7d0' : '#fef08a'}`,
    }}>
      IA recomenda: {isAprovar ? '✅ Aprovar' : '⚠ Revisar'}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number): string {
  if (v >= 1000) return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
