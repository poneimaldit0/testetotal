import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { PropostaAnexoUpload } from './PropostaAnexoUpload';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

// ── Tokens (mesmos da Central) ────────────────────────────────────────────────
const I = {
  azul: '#2D3395', azul2: '#3d4ab5', azul3: '#eef0ff',
  lj: '#F7A226', lj2: '#fff8e1',
  vd: '#1B7A4A', vd2: '#e0f5ec',
  am: '#E08B00', am2: '#fff3cd',
  rx: '#534AB7', rx2: '#ede9ff',
  vm: '#C0392B', vm2: '#fde8e8',
  cz: '#6B7280', cz2: '#F3F4F6',
  nv: '#1A2030', bd: '#E5E7EB', bg: '#F4F5FB', br: '#FFFFFF',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDt = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTm = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function horasRestantes(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Seção header ──────────────────────────────────────────────────────────────
function FichaHeader({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const s = candidatura.statusAcompanhamento;
  const isReu = s === 'reuniao_agendada' || s === 'reuniao_realizada';
  const isVis = s === 'visita_agendada' || s === 'visita_realizada';
  const isUrgente = s === 'visita_agendada' || s === 'reuniao_agendada' || s === 'em_orcamento';

  return (
    <div style={{
      background: `linear-gradient(150deg, ${I.azul} 0%, ${I.azul2} 100%)`,
      padding: '20px 20px 16px',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: .6, color: '#fff', marginBottom: 6 }}>
        Ficha Operacional
      </div>

      {/* paddingRight reserva espaço para o botão × do Radix Sheet (absolute right-4 top-4) */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.3, marginBottom: 10, paddingRight: 44 }}>
        {candidatura.necessidade.length > 80
          ? candidatura.necessidade.slice(0, 80) + '…'
          : candidatura.necessidade}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(isVis || isReu) && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
            background: isVis ? I.lj2 : I.rx2,
            color: isVis ? I.am : I.rx,
          }}>
            {isVis ? '📅 Presencial' : '🎥 Online'}
          </span>
        )}
        {isUrgente && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
            background: I.vm2, color: I.vm,
          }}>
            ⚡ Ação pendente
          </span>
        )}
        {candidatura.local && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>
            📍 {candidatura.local}
            {candidatura.tamanhoImovel > 0 && ` · ${candidatura.tamanhoImovel} m²`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Seção: resultado final ────────────────────────────────────────────────────
function SecaoResultado({ s }: { s: string | null }) {
  if (s === 'negocio_fechado') {
    return (
      <div style={{ borderRadius: 10, background: I.vd2, border: `1.5px solid ${I.vd}`, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: I.vd, marginBottom: 4 }}>🎉 Negócio fechado</div>
        <div style={{ fontSize: 12, color: I.cz, lineHeight: 1.6 }}>Parabéns! O contrato está em preparação pela Reforma100.</div>
      </div>
    );
  }
  if (s === 'negocio_perdido') {
    return (
      <div style={{ borderRadius: 10, background: I.cz2, border: `1.5px solid ${I.bd}`, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: I.cz, marginBottom: 2 }}>Proposta não selecionada</div>
        <div style={{ fontSize: 12, color: I.cz, lineHeight: 1.5 }}>Este processo foi encerrado. Continue acompanhando novas oportunidades.</div>
      </div>
    );
  }
  return null;
}

// ── Seção: ação urgente (visita / reunião) ────────────────────────────────────
function SecaoAtendimento({
  candidatura, preConfirmadoEm, onPreConfirmar,
}: {
  candidatura: CandidaturaOrcamento;
  preConfirmadoEm: string | null;
  onPreConfirmar: (via: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const s = candidatura.statusAcompanhamento;
  const isVA = s === 'visita_agendada';
  const isVR = s === 'visita_realizada';
  const isRA = s === 'reuniao_agendada';
  const isRR = s === 'reuniao_realizada';

  if (!isVA && !isVR && !isRA && !isRR) return null;

  const isPresencial = isVA || isVR;
  const feito = isVR || isRR;
  const dt = candidatura.horarioVisitaAgendado;
  const horas = dt ? horasRestantes(dt) : null;
  const urgente = horas !== null && horas > 0 && horas <= 24;

  const acBg = isPresencial ? I.lj2 : I.rx2;
  const acBd = isPresencial ? I.lj : I.rx;
  const acFg = isPresencial ? I.am : I.rx;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        {feito ? 'Atendimento realizado' : 'Atendimento agendado'}
      </div>
      <div style={{ borderRadius: 10, background: feito ? I.vd2 : acBg, border: `1.5px solid ${feito ? I.vd : acBd}`, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: feito ? 0 : 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16 }}>{isPresencial ? '📅' : '🎥'}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: feito ? I.vd : acFg, fontFamily: "'Syne',sans-serif" }}>
            {isPresencial
              ? (feito ? 'Visita presencial realizada' : 'Visita presencial')
              : (feito ? 'Reunião online realizada' : 'Reunião online')}
          </span>
          {feito && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vd2, color: I.vd }}>✓ Concluído</span>}
          {urgente && !feito && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: I.vm2, color: I.vm }}>⚡ Hoje</span>}
        </div>

        {!feito && dt && (
          <div style={{ fontSize: 12, color: acFg, fontWeight: 600, marginBottom: 12 }}>
            {fmtDt(dt)} às {fmtTm(dt)}
            {horas !== null && horas > 0 && (
              <span style={{ marginLeft: 8, fontWeight: 400, color: horas <= 24 ? I.vm : I.cz }}>
                (em {horas < 24 ? `${horas}h` : `${Math.round(horas / 24)} dia(s)`})
              </span>
            )}
          </div>
        )}

        {!feito && isPresencial && (
          preConfirmadoEm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: I.vd2, borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: I.vd }}>Presença confirmada</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                style={{ background: I.am, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', minHeight: 48 }}
                onClick={() => onPreConfirmar('whatsapp')}
              >
                ✓ Confirmar presença via WhatsApp
              </button>
              <button
                style={{ background: 'transparent', color: I.cz, border: `1.5px solid ${I.bd}`, borderRadius: 8, padding: '11px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', minHeight: 44 }}
                onClick={() => onPreConfirmar('plataforma')}
              >
                Confirmar aqui na plataforma
              </button>
            </div>
          )
        )}

        {!feito && isRA && (
          candidatura.linkReuniao && candidatura.tokenVisita ? (
            <button
              style={{ background: I.azul, color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', minHeight: 48 }}
              onClick={() => navigate(`/entrar-reuniao/${candidatura.candidaturaId}/${candidatura.tokenVisita}`)}
            >
              🔗 Entrar na reunião agora
            </button>
          ) : (
            <div style={{ fontSize: 12, color: I.rx, background: I.rx2, borderRadius: 8, padding: '10px 14px', lineHeight: 1.5 }}>
              🔗 O link de acesso será enviado pela Reforma100 antes da reunião.
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Seção: proposta ───────────────────────────────────────────────────────────
function SecaoProposta({
  candidatura, statusLabel,
}: {
  candidatura: CandidaturaOrcamento;
  statusLabel: string | null;
}) {
  const s = candidatura.statusAcompanhamento;
  const isDone = s === 'negocio_fechado' || s === 'negocio_perdido';
  if (isDone) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
        Proposta comercial
      </div>

      {s === 'em_orcamento' && (
        <div style={{ borderRadius: 8, background: I.azul3, border: `1.5px solid ${I.azul}33`, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: I.azul, fontWeight: 700, marginBottom: 2 }}>▶ Envie sua proposta</div>
          <div style={{ fontSize: 11, color: I.cz, lineHeight: 1.5 }}>A Reforma100 aguarda sua proposta comercial para avançar neste processo.</div>
        </div>
      )}
      {s === 'orcamento_enviado' && (
        <div style={{ borderRadius: 8, background: I.vd2, border: `1.5px solid ${I.vd}33`, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: I.vd, fontWeight: 700, marginBottom: 2 }}>📋 Proposta enviada</div>
          <div style={{ fontSize: 11, color: I.cz, lineHeight: 1.5 }}>Aguardando análise da Reforma100. Você pode substituir o arquivo abaixo.</div>
        </div>
      )}

      <PropostaAnexoUpload
        candidaturaId={candidatura.candidaturaId}
        orcamentoId={candidatura.id}
        hideAnalise
      />
    </div>
  );
}

// ── Seção: dados do orçamento ─────────────────────────────────────────────────
function SecaoDadosOrcamento({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const prazo = typeof candidatura.dataInicio === 'string'
    ? candidatura.dataInicio
    : candidatura.dataInicio instanceof Date
      ? fmtDt(candidatura.dataInicio.toISOString())
      : '—';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Dados do orçamento
      </div>
      <div style={{ background: I.bg, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {candidatura.categorias?.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: I.cz, marginBottom: 4, fontWeight: 600 }}>Categorias</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {candidatura.categorias.map(cat => (
                <span key={cat} style={{ fontSize: 11, background: I.azul3, color: I.azul, padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Prazo desejado</div>
            <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>{prazo}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Empresas inscritas</div>
            <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>{candidatura.quantidadeEmpresas}</div>
          </div>
          {candidatura.conciergeResponsavel && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 10, color: I.cz, fontWeight: 600, marginBottom: 2 }}>Concierge responsável</div>
              <div style={{ fontSize: 12, color: I.nv, fontWeight: 600 }}>👤 {candidatura.conciergeResponsavel.nome}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Seção: anexos do orçamento ────────────────────────────────────────────────
function SecaoAnexosOrcamento({ candidatura }: { candidatura: CandidaturaOrcamento }) {
  const fotos = candidatura.fotos ?? [];
  const docs = candidatura.arquivos ?? [];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Anexos do orçamento
      </div>

      {fotos.length === 0 && docs.length === 0 && (
        <div style={{
          background: I.cz2, borderRadius: 8, padding: '12px 14px',
          fontSize: 12, color: I.cz, textAlign: 'center',
        }}>
          Sem anexos enviados
        </div>
      )}

      {fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: docs.length > 0 ? 10 : 0 }}>
          {fotos.map(foto => (
            <a
              key={foto.id}
              href={foto.url_arquivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: I.cz2 }}
            >
              <img
                src={foto.url_arquivo}
                alt={foto.nome_arquivo}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </a>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map(doc => (
            <a
              key={doc.id}
              href={doc.url_arquivo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: I.bg, borderRadius: 8, padding: '10px 12px',
                textDecoration: 'none', border: `1px solid ${I.bd}`,
              }}
            >
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: I.nv, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.nome_arquivo}
                </div>
                <div style={{ fontSize: 10, color: I.cz }}>{fmtBytes(doc.tamanho)}</div>
              </div>
              <span style={{ fontSize: 11, color: I.azul, fontWeight: 700, flexShrink: 0 }}>↓</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Seção: mensagem para a equipe ─────────────────────────────────────────────
const CHIPS = [
  { label: '📅 Reagendamento', texto: 'Preciso reagendar o atendimento.' },
  { label: '❓ Dúvida', texto: 'Tenho uma dúvida sobre este processo.' },
  { label: '📋 Atualização', texto: 'Quero informar uma atualização.' },
];

function SecaoMensagem({
  candidatura,
}: {
  candidatura: CandidaturaOrcamento;
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [historico, setHistorico] = useState<string[]>(() => {
    if (!candidatura.observacoesAcompanhamento) return [];
    return candidatura.observacoesAcompanhamento
      .split('\n---\n')
      .filter(Boolean)
      .reverse();
  });

  const enviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      const ts = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
      const novaMsg = `[${ts}] ${texto.trim()}`;
      const obsAtual = candidatura.observacoesAcompanhamento ?? '';
      const novaObs = obsAtual ? `${novaMsg}\n---\n${obsAtual}` : novaMsg;

      await (supabase as any).rpc('atualizar_observacoes_acompanhamento', {
        p_inscricao_id: candidatura.candidaturaId,
        p_observacoes: novaObs,
      });

      setHistorico(prev => [novaMsg, ...prev]);
      setTexto('');
    } catch { /* silent */ } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 10 }}>
        Mensagem para a equipe
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {CHIPS.map(chip => (
          <button
            key={chip.label}
            style={{
              fontSize: 11, fontWeight: 600, padding: '10px 14px', borderRadius: 10,
              background: texto === chip.texto ? I.azul3 : I.cz2,
              color: texto === chip.texto ? I.azul : I.cz,
              border: `1px solid ${texto === chip.texto ? I.azul + '44' : I.bd}`,
              cursor: 'pointer', minHeight: 44,
            }}
            onClick={() => setTexto(chip.texto)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Descreva sua mensagem, dúvida ou solicitação para a equipe Reforma100…"
        rows={3}
        style={{
          width: '100%', borderRadius: 8, border: `1.5px solid ${I.bd}`,
          padding: '10px 12px', fontSize: 16, color: I.nv, resize: 'vertical',
          fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, boxSizing: 'border-box',
          outline: 'none',
        }}
      />

      <button
        disabled={!texto.trim() || enviando}
        onClick={enviar}
        style={{
          marginTop: 8, width: '100%', padding: '12px 0', borderRadius: 8,
          background: texto.trim() ? I.azul : I.cz2,
          color: texto.trim() ? '#fff' : I.cz,
          border: 'none', cursor: texto.trim() ? 'pointer' : 'default',
          fontSize: 13, fontWeight: 700, minHeight: 44,
          transition: 'background .15s',
        }}
      >
        {enviando ? 'Enviando…' : 'Enviar mensagem'}
      </button>

      {historico.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: I.cz, marginBottom: 8 }}>
            Histórico de mensagens
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historico.map((msg, i) => (
              <div key={i} style={{ background: I.bg, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: I.nv, lineHeight: 1.5, borderLeft: `3px solid ${I.azul}44` }}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface FichaOperacionalProps {
  candidatura: CandidaturaOrcamento | null;
  onClose: () => void;
}

export function FichaOperacionalFornecedor({ candidatura, onClose }: FichaOperacionalProps) {
  const [preConfirmadoEm, setPreConfirmadoEm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Reseta estado local de confirmação cada vez que uma candidatura diferente abre
  useEffect(() => {
    setPreConfirmadoEm(null);
  }, [candidatura?.candidaturaId]);

  const confirmedAt = candidatura?.preConfirmadoEm ?? null;

  const handlePreConfirmar = async (via: string) => {
    if (!candidatura || preConfirmadoEm || confirmedAt || salvando) return;
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      await (supabase as any)
        .from('candidaturas_fornecedores')
        .update({ pre_confirmado_em: agora, pre_confirmado_via: via })
        .eq('id', candidatura.candidaturaId)
        .is('pre_confirmado_em', null);
      setPreConfirmadoEm(agora);
    } catch { /* silent */ } finally {
      setSalvando(false);
    }
  };

  const isOpen = candidatura !== null;

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[560px] max-w-full p-0 flex flex-col overflow-hidden [&>button]:text-white [&>button]:opacity-90 [&>button]:bg-white/20 [&>button]:rounded-lg [&>button]:w-11 [&>button]:h-11 [&>button]:top-3 [&>button]:right-3"
      >
        {/* Acessibilidade obrigatória para Radix */}
        <SheetTitle className="sr-only">Ficha Operacional</SheetTitle>
        <SheetDescription className="sr-only">Detalhes e ações da candidatura</SheetDescription>

        {candidatura && (
          <>
            <FichaHeader candidatura={candidatura} />

            {/* Corpo rolável */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
              <SecaoResultado s={candidatura.statusAcompanhamento} />

              <SecaoAtendimento
                candidatura={candidatura}
                preConfirmadoEm={preConfirmadoEm ?? confirmedAt}
                onPreConfirmar={handlePreConfirmar}
              />

              <SecaoProposta
                candidatura={candidatura}
                statusLabel={candidatura.statusAcompanhamento}
              />

              <SecaoDadosOrcamento candidatura={candidatura} />

              <SecaoAnexosOrcamento candidatura={candidatura} />

              <SecaoMensagem candidatura={candidatura} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
