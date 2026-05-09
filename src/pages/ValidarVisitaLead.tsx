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
} as const;

const Syne: React.CSSProperties = { fontFamily: "'Syne', sans-serif", fontWeight: 700 };
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

// ── States ────────────────────────────────────────────────────────────────────
type PageState =
  | 'loading'
  | 'confirm'
  | 'already_confirmed'
  | 'success'
  | 'error'
  | 'not_linked'
  | 'no_visit';

interface VisitaInfo {
  projetoNome:   string;
  empresaNome:   string;
  dataHora:      string | null;
  confirmedAt:   string | null;
  candidaturaId: string;
  orcamentoId:   string;
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
        letterSpacing: '.04em', background: 'rgba(232,81,10,.18)', color: '#FF9B6B',
        border: '1px solid rgba(232,81,10,.28)',
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

function InfoRow({ emoji, label, value, bg, labelColor }: {
  emoji: string; label: string; value: string; bg: string; labelColor?: string;
}) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '12px 16px', background: bg,
      borderRadius: 12, border: `1px solid ${C.bd}`, alignItems: 'center',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
      <div>
        <div style={{
          fontSize: 10, ...Syne, color: labelColor ?? C.cz,
          textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2,
        }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.nv }}>{value}</div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ValidarVisitaLead() {
  useFonts();
  const { token: rota100Token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [pageState,   setPageState]   = useState<PageState>('loading');
  const [info,        setInfo]        = useState<VisitaInfo | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (authLoading || !rota100Token || !user) return;

    const verificar = async () => {
      // 1. Orcamento pelo token da Rota100
      const { data: orc, error: orcErr } = await (supabase as any)
        .from('orcamentos')
        .select('id, dados_contato, tipo_atendimento_tecnico')
        .eq('rota100_token', rota100Token)
        .maybeSingle();

      if (orcErr || !orc) { setPageState('error'); return; }

      // 2. Candidaturas ativas do lead
      const { data: cands, error: candsErr } = await (supabase as any)
        .from('candidaturas_fornecedores')
        .select('id, empresa, nome, email, fornecedor_id, status_acompanhamento, visita_confirmada_em')
        .eq('orcamento_id', orc.id)
        .is('data_desistencia', null);

      if (candsErr || !cands) { setPageState('error'); return; }

      // 3. Encontrar candidatura do usuário logado
      const minha = (cands as any[]).find(c =>
        c.fornecedor_id === user.id ||
        (c.email && c.email.toLowerCase() === (user.email ?? '').toLowerCase())
      );

      if (!minha) { setPageState('not_linked'); return; }

      // 4. Validar status — só visita_agendada é confirmável
      if (minha.status_acompanhamento !== 'visita_agendada') {
        setPageState('no_visit');
        // Ainda preenche info para mostrar empresa
        setInfo({
          projetoNome:   orc.dados_contato?.nome ? `Projeto de ${orc.dados_contato.nome}` : 'Projeto de reforma',
          empresaNome:   minha.empresa || minha.nome || 'Sua empresa',
          dataHora:      null,
          confirmedAt:   minha.visita_confirmada_em ?? null,
          candidaturaId: minha.id,
          orcamentoId:   orc.id,
        });
        return;
      }

      // 5. Data/hora do horário agendado
      const { data: horarios } = await (supabase as any)
        .from('horarios_visita_orcamento')
        .select('data_hora')
        .eq('candidatura_id', minha.id)
        .order('data_hora', { ascending: true })
        .limit(1);

      // 6. Registrar fornecedor_id se ainda NULL
      if (!minha.fornecedor_id) {
        await (supabase as any)
          .from('candidaturas_fornecedores')
          .update({ fornecedor_id: user.id })
          .eq('id', minha.id);
      }

      setInfo({
        projetoNome:   orc.dados_contato?.nome ? `Projeto de ${orc.dados_contato.nome}` : 'Projeto de reforma',
        empresaNome:   minha.empresa || minha.nome || 'Sua empresa',
        dataHora:      (horarios as any[])?.[0]?.data_hora ?? null,
        confirmedAt:   minha.visita_confirmada_em ?? null,
        candidaturaId: minha.id,
        orcamentoId:   orc.id,
      });

      setPageState(minha.visita_confirmada_em ? 'already_confirmed' : 'confirm');
    };

    verificar();
  }, [authLoading, user, rota100Token]);

  const confirmarVisita = async () => {
    if (!info || !user) return;
    setConfirmando(true);
    try {
      await (supabase as any)
        .from('candidaturas_fornecedores')
        .update({
          status_acompanhamento: 'visita_realizada',
          visita_confirmada_em:  new Date().toISOString(),
          visita_confirmada_por: user.id,
        })
        .eq('id', info.candidaturaId);

      try {
        const { data: realizadas } = await (supabase as any)
          .from('candidaturas_fornecedores')
          .select('id')
          .eq('orcamento_id', info.orcamentoId)
          .in('status_acompanhamento', ['visita_realizada', 'reuniao_realizada']);

        if ((realizadas?.length ?? 0) >= 1) {
          await (supabase as any).rpc('mover_orcamento_etapa', {
            p_orcamento_id: info.orcamentoId,
            p_nova_etapa:   'em_orcamento',
            p_usuario_id:   user.id,
          });
        }
      } catch { /* silent — não bloqueia confirmação */ }

      setPageState('success');
    } catch {
      setPageState('error');
    } finally {
      setConfirmando(false);
    }
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
            <style>{`@keyframes vvlSpin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: `3px solid ${C.bd}`, borderTopColor: C.lj,
              margin: '0 auto 20px', animation: 'vvlSpin 1s linear infinite',
            }} />
            <p style={{ fontSize: 14, color: C.cz }}>Verificando seu acesso…</p>
          </div>
        </Card>
      )}

      {/* Link inválido */}
      {pageState === 'error' && (
        <Card>
          <IconBox emoji="⚠️" bg={C.vm2} />
          <h2 style={{ ...Serif, fontSize: 22, color: C.nv, textAlign: 'center', marginBottom: 10 }}>
            Link inválido
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7 }}>
            Este QR Code não foi reconhecido. Solicite um novo link ao seu consultor.
          </p>
        </Card>
      )}

      {/* Usuário não vinculado */}
      {pageState === 'not_linked' && (
        <Card>
          <IconBox emoji="🔒" bg={C.fd} />
          <h2 style={{ ...Serif, fontSize: 22, color: C.nv, textAlign: 'center', marginBottom: 10 }}>
            Acesso não autorizado
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7, marginBottom: 16 }}>
            Sua empresa não está vinculada a esta solicitação. Apenas fornecedores participantes podem confirmar presença.
          </p>
          <div style={{
            padding: '10px 14px', background: '#F5F3EF', borderRadius: 10,
            fontSize: 11, color: C.cz, textAlign: 'center',
          }}>
            Logado como <strong style={{ color: C.nv }}>{user?.email}</strong>
          </div>
        </Card>
      )}

      {/* Sem visita agendada */}
      {pageState === 'no_visit' && (
        <Card>
          <IconBox emoji="📋" bg={C.am2} />
          <h2 style={{ ...Serif, fontSize: 22, color: C.nv, textAlign: 'center', marginBottom: 10 }}>
            Sem visita agendada
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7, marginBottom: 16 }}>
            Não há visita presencial agendada para sua empresa neste processo no momento.
          </p>
          {info && (
            <InfoRow emoji="🏢" label="Empresa" value={info.empresaNome} bg={C.fd} />
          )}
        </Card>
      )}

      {/* Já confirmado */}
      {pageState === 'already_confirmed' && info && (
        <Card>
          <IconBox emoji="✅" bg={C.vd2} />
          <h2 style={{ ...Serif, fontSize: 22, color: C.vd, textAlign: 'center', marginBottom: 10 }}>
            Presença já confirmada
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7, marginBottom: 20 }}>
            A presença de <strong style={{ color: C.nv }}>{info.empresaNome}</strong> já foi registrada nesta visita.
          </p>
          {info.confirmedAt && (
            <div style={{
              padding: '12px 16px', background: C.vd2, borderRadius: 12,
              border: '1px solid rgba(26,122,74,.15)',
              fontSize: 12, color: C.vd, textAlign: 'center', fontWeight: 600,
            }}>
              Confirmado em {fmtDate(info.confirmedAt)} às {fmtTime(info.confirmedAt)}
            </div>
          )}
        </Card>
      )}

      {/* Sucesso */}
      {pageState === 'success' && info && (
        <Card>
          <IconBox emoji="✅" bg={C.vd2} />
          <h2 style={{ ...Serif, fontSize: 22, color: C.vd, textAlign: 'center', marginBottom: 10 }}>
            Presença confirmada!
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7, marginBottom: 20 }}>
            Presença de <strong style={{ color: C.nv }}>{info.empresaNome}</strong> registrada com sucesso. O consultor foi notificado.
          </p>
          <div style={{
            padding: '12px 16px', background: C.vd2, borderRadius: 12,
            border: '1px solid rgba(26,122,74,.15)',
            fontSize: 12, color: C.vd, textAlign: 'center', fontWeight: 600,
          }}>
            {fmtDate(new Date().toISOString())} às {fmtTime(new Date().toISOString())}
          </div>
        </Card>
      )}

      {/* Confirmação */}
      {pageState === 'confirm' && info && (
        <Card>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: C.am2,
            border: '2px solid rgba(196,120,10,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 24px',
          }}>📍</div>

          <h2 style={{ ...Serif, fontSize: 24, color: C.nv, textAlign: 'center', marginBottom: 6 }}>
            Confirmar presença
          </h2>
          <p style={{ fontSize: 13, color: C.cz, textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
            {info.projetoNome}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <InfoRow emoji="🏢" label="Sua empresa" value={info.empresaNome} bg={C.fd} />
            {info.dataHora && (
              <div style={{
                display: 'flex', gap: 12, padding: '12px 16px', background: C.am2,
                borderRadius: 12, border: '1px solid rgba(196,120,10,.2)', alignItems: 'center',
              }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>📅</span>
                <div>
                  <div style={{
                    fontSize: 10, ...Syne, color: '#9A6200',
                    textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2,
                  }}>Visita agendada</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#7A4E00' }}>
                    {fmtDate(info.dataHora)} às {fmtTime(info.dataHora)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            disabled={confirmando}
            onClick={confirmarVisita}
            style={{
              width: '100%', padding: '14px 20px',
              background: confirmando ? C.cz : C.lj,
              color: '#fff', border: 'none', borderRadius: 12,
              cursor: confirmando ? 'not-allowed' : 'pointer',
              ...Syne, fontSize: 14, letterSpacing: '.02em',
              boxShadow: confirmando ? 'none' : '0 4px 16px rgba(232,81,10,.3)',
              transition: 'all .18s',
            }}
          >
            {confirmando ? 'Registrando…' : 'Confirmar presença na visita'}
          </button>

          <p style={{ fontSize: 11, color: C.cz, textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
            Logado como <strong style={{ color: C.nv }}>{user?.email}</strong>
          </p>
        </Card>
      )}
    </div>
  );
}
