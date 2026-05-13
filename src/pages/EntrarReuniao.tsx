import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  lj:  '#E8510A',
  nv:  '#1A2030',
  fd:  '#F8F7F5',
  bd:  '#E4E1DB',
  cz:  '#7A776E',
  vd:  '#1A7A4A',
  vd2: '#E8F5EE',
  vm2: '#FDECEA',
  am2: '#FFF5DC',
  pu:  '#534AB7',
  pu2: '#EEF0FF',
} as const;

const Syne: React.CSSProperties  = { fontFamily: "'Syne', sans-serif", fontWeight: 700 };
const Serif: React.CSSProperties = { fontFamily: "'DM Serif Display', serif", fontWeight: 400 };

function useFonts() {
  useEffect(() => {
    if (document.getElementById('rota100-fonts')) return;
    const el = document.createElement('link');
    el.id = 'rota100-fonts';
    el.rel = 'stylesheet';
    el.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Syne:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap';
    document.head.appendChild(el);
  }, []);
}

// ── Types ─────────────────────────────────────────────────────────────────────
type PageState = 'loading' | 'confirm' | 'entering' | 'invalid' | 'not_linked';

interface ReuniaoInfo {
  empresaNome:    string;
  projetoNome:    string;
  linkReuniao:    string;
  dataHora:       string | null;
  orcamentoId:    string;
  candidaturaId:  string;
  acessosAtuais:  unknown[];
  statusAtual:    string;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function NavBar() {
  return (
    <nav style={{
      background: C.nv, padding: '0 24px', display: 'flex', alignItems: 'center',
      height: 56, gap: 12, boxShadow: '0 2px 16px rgba(26,32,48,.22)', flexShrink: 0,
    }}>
      <div style={{
        width: 26, height: 26, background: C.lj, borderRadius: 6, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(232,81,10,.4)',
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2 8C2 4.686 4.686 2 8 2s6 2.686 6 6-2.686 6-6 6-6-2.686-6-6z" fill="white" opacity=".3"/>
          <path d="M8 5v6M5 8h6" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </div>
      <span style={{ ...Syne, fontSize: 15, color: '#fff', letterSpacing: '.02em' }}>Reforma100</span>
      <span style={{
        marginLeft: 'auto', fontSize: 10, ...Syne, padding: '3px 10px', borderRadius: 20,
        letterSpacing: '.04em', background: 'rgba(83,74,183,.2)', color: '#9E98E8',
        border: '1px solid rgba(83,74,183,.3)',
      }}>FORNECEDOR</span>
    </nav>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px 48px' }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '36px 28px', maxWidth: 420,
        width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,.09)', border: `1px solid ${C.bd}`,
      }}>
        {children}
      </div>
    </div>
  );
}

function IconBox({ emoji, bg }: { emoji: string; bg: string }) {
  return (
    <div style={{
      width: 60, height: 60, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 26, margin: '0 auto 22px',
    }}>
      {emoji}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EntrarReuniao() {
  useFonts();
  const { candidaturaId, token } = useParams<{ candidaturaId: string; token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [info,      setInfo]      = useState<ReuniaoInfo | null>(null);

  useEffect(() => {
    if (authLoading || !candidaturaId || !token || !user) return;

    const verificar = async () => {
      const { data, error } = await (supabase as any)
        .from('candidaturas_fornecedores')
        .select('id, empresa, nome, email, fornecedor_id, token_visita, link_reuniao, acessos_reuniao, orcamento_id, status_acompanhamento')
        .eq('id', candidaturaId)
        .maybeSingle();

      if (error || !data || data.token_visita !== token || !data.link_reuniao) {
        setPageState('invalid');
        return;
      }

      // Validar vínculo: fornecedor_id OU email
      const isLinked =
        data.fornecedor_id === user.id ||
        (data.email && data.email.toLowerCase() === (user.email ?? '').toLowerCase());

      if (!isLinked) {
        setPageState('not_linked');
        return;
      }

      // Registrar fornecedor_id se ainda NULL (primeira entrada)
      if (!data.fornecedor_id) {
        await (supabase as any)
          .from('candidaturas_fornecedores')
          .update({ fornecedor_id: user.id })
          .eq('id', candidaturaId);
      }

      // Dados do orçamento (nome do cliente)
      const { data: orc } = await (supabase as any)
        .from('orcamentos')
        .select('dados_contato')
        .eq('id', data.orcamento_id)
        .maybeSingle();

      // Horário da reunião
      const { data: horarios } = await (supabase as any)
        .from('horarios_visita_orcamento')
        .select('data_hora')
        .eq('candidatura_id', candidaturaId)
        .limit(1);

      setInfo({
        empresaNome:   data.empresa || data.nome || 'Sua empresa',
        projetoNome:   orc?.dados_contato?.nome ? `Projeto de ${orc.dados_contato.nome}` : 'Projeto de reforma',
        linkReuniao:   data.link_reuniao,
        dataHora:      (horarios as any[])?.[0]?.data_hora ?? null,
        orcamentoId:   data.orcamento_id,
        candidaturaId: data.id,
        acessosAtuais: Array.isArray(data.acessos_reuniao) ? data.acessos_reuniao : [],
        statusAtual:   data.status_acompanhamento ?? '',
      });

      setPageState('confirm');
    };

    verificar();
  }, [authLoading, user, candidaturaId, token]);

  const entrarReuniao = async () => {
    if (!info || !user) return;
    setPageState('entering');

    const acesso = {
      em:         new Date().toISOString(),
      user_id:    user.id,
      empresa:    info.empresaNome,
      status:     'autenticado',
      user_agent: navigator.userAgent.slice(0, 200),
    };

    const jaRealizada =
      info.statusAtual === 'reuniao_realizada' ||
      info.statusAtual === 'visita_realizada';

    const updatePayload: Record<string, unknown> = {
      acessos_reuniao: [...info.acessosAtuais, acesso],
    };
    if (!jaRealizada) {
      updatePayload.status_acompanhamento = 'reuniao_realizada';
    }

    try {
      await (supabase as any)
        .from('candidaturas_fornecedores')
        .update(updatePayload)
        .eq('id', info.candidaturaId);

      // Evento operacional — fire-and-forget, falha não bloqueia o fluxo
      try {
        await (supabase as any).from('eventos_operacionais').insert({
          orcamento_id:    info.orcamentoId,
          candidatura_id:  info.candidaturaId,
          fornecedor_id:   user.id,
          usuario_acao_id: user.id,
          tipo_evento:     'reuniao_entrou',
          origem_evento:   'fornecedor_autoservico',
          canal_evento:    'link_publico',
          payload: {
            status_anterior: info.statusAtual,
            status_novo:     jaRealizada ? info.statusAtual : 'reuniao_realizada',
            acesso_numero:   info.acessosAtuais.length + 1,
            origem_tela:     'EntrarReuniao',
            user_agent:      navigator.userAgent.slice(0, 200),
          },
        });
      } catch (evErr) {
        console.warn('[EntrarReuniao] evento não registrado:', evErr);
      }

      // Tentar avançar etapa CRM
      try {
        const { data: realizadas } = await (supabase as any)
          .from('candidaturas_fornecedores')
          .select('id')
          .eq('orcamento_id', info.orcamentoId)
          .in('status_acompanhamento', ['visita_realizada', 'reuniao_realizada']);

        const totalRealizado = (realizadas?.length ?? 0) + (!jaRealizada ? 1 : 0);
        if (totalRealizado >= 1) {
          const { data: rpcData } = await (supabase as any).rpc('mover_orcamento_etapa', {
            p_orcamento_id: info.orcamentoId,
            p_nova_etapa:   'em_orcamento',
            p_usuario_id:   user.id,
          });
          if (!rpcData?.success) {
            console.warn('[EntrarReuniao] mover_orcamento_etapa retornou success:false', rpcData);
          }
        }
      } catch { /* silent */ }
    } catch { /* silent — redireciona mesmo assim */ }

    window.location.href = info.linkReuniao;
  };

  // Redirect para login se não autenticado
  if (!authLoading && !user) {
    const returnUrl = encodeURIComponent(window.location.pathname);
    return <Navigate to={`/auth?next=${returnUrl}`} replace />;
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      minHeight: '100vh', background: C.fd,
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <NavBar />

      {/* Loading */}
      {(pageState === 'loading' || authLoading) && (
        <Card>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <style>{`@keyframes erSpin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: `3px solid ${C.bd}`, borderTopColor: C.pu,
              margin: '0 auto 20px', animation: 'erSpin 1s linear infinite',
            }} />
            <p style={{ fontSize: 14, color: C.cz }}>Verificando seu acesso…</p>
          </div>
        </Card>
      )}

      {/* Link inválido */}
      {pageState === 'invalid' && (
        <Card>
          <IconBox emoji="⚠️" bg={C.vm2} />
          <h2 style={{ ...Serif, fontSize: 22, color: C.nv, textAlign: 'center', marginBottom: 10 }}>
            Link inválido
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7 }}>
            Este link de reunião não está disponível ou expirou. Solicite um novo ao seu consultor.
          </p>
        </Card>
      )}

      {/* Não vinculado */}
      {pageState === 'not_linked' && (
        <Card>
          <IconBox emoji="🔒" bg={C.fd} />
          <h2 style={{ ...Serif, fontSize: 22, color: C.nv, textAlign: 'center', marginBottom: 10 }}>
            Acesso não autorizado
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7, marginBottom: 16 }}>
            Sua empresa não está vinculada a esta reunião. Apenas fornecedores participantes podem acessar.
          </p>
          <div style={{
            padding: '10px 14px', background: '#F5F3EF', borderRadius: 10,
            fontSize: 11, color: C.cz, textAlign: 'center',
          }}>
            Logado como <strong style={{ color: C.nv }}>{user?.email}</strong>
          </div>
        </Card>
      )}

      {/* Entrando */}
      {pageState === 'entering' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: `3px solid ${C.bd}`, borderTopColor: C.pu,
              margin: '0 auto 20px', animation: 'erSpin 1s linear infinite',
            }} />
            <p style={{ fontSize: 14, color: C.cz }}>Registrando presença e entrando na reunião…</p>
          </div>
        </Card>
      )}

      {/* Confirmação */}
      {pageState === 'confirm' && info && (
        <Card>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: C.pu2,
            border: '2px solid rgba(83,74,183,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 24px',
          }}>🎥</div>

          <h2 style={{ ...Serif, fontSize: 24, color: C.nv, textAlign: 'center', marginBottom: 6 }}>
            Entrar na reunião
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
            {info.projetoNome}
          </p>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <div style={{
              display: 'flex', gap: 12, padding: '12px 16px', background: C.fd,
              borderRadius: 12, border: `1px solid ${C.bd}`, alignItems: 'center',
            }}>
              <span style={{ fontSize: 20 }}>🏢</span>
              <div>
                <div style={{ fontSize: 10, ...Syne, color: C.cz, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Sua empresa</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.nv }}>{info.empresaNome}</div>
              </div>
            </div>

            {info.dataHora && (
              <div style={{
                display: 'flex', gap: 12, padding: '12px 16px', background: C.pu2,
                borderRadius: 12, border: '1px solid rgba(83,74,183,.2)', alignItems: 'center',
              }}>
                <span style={{ fontSize: 20 }}>🗓</span>
                <div>
                  <div style={{ fontSize: 10, ...Syne, color: C.pu, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Reunião agendada</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#3B327A' }}>
                    {fmtDate(info.dataHora)} às {fmtTime(info.dataHora)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nota de rastreamento */}
          <div style={{
            padding: '10px 14px', background: '#F5F3EF', borderRadius: 10,
            fontSize: 11, color: C.cz, marginBottom: 20, lineHeight: 1.6,
          }}>
            Ao entrar, sua presença será registrada automaticamente com data, hora e empresa.
          </div>

          <button
            onClick={entrarReuniao}
            style={{
              width: '100%', padding: '14px 20px',
              background: C.pu, color: '#fff',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              ...Syne, fontSize: 14, letterSpacing: '.02em',
              boxShadow: '0 4px 16px rgba(83,74,183,.3)',
              transition: 'all .18s',
            }}
          >
            Entrar na reunião →
          </button>

          <p style={{ fontSize: 11, color: C.cz, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
            Logado como <strong style={{ color: C.nv }}>{user?.email}</strong>
          </p>
        </Card>
      )}
    </div>
  );
}
