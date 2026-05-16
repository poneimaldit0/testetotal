// QuadroAvisos — carrossel premium de avisos operacionais.
// Recebe lista de Aviso[] e cicla com auto-rotação (pausa no hover).
// Fallback "Tudo em dia" quando vazia. Sem dados internos — cada tela
// monta sua própria lista a partir do que já carrega.

import { useEffect, useRef, useState, type ReactNode } from 'react';

export type AvisoTom = 'amber' | 'blue' | 'red' | 'green' | 'gray';

export interface Aviso {
  id:         string;       // chave única (estável entre renders)
  tom:        AvisoTom;
  icone?:     ReactNode;
  titulo:     string;
  descricao?: string;
  contagem?:  number;       // exibida em destaque quando definida
  onClick?:   () => void;
}

interface QuadroAvisosProps {
  avisos:      Aviso[];
  intervalMs?: number;      // padrão 4000ms
  className?:  string;
}

const TOM_CLS: Record<AvisoTom, { bg: string; bd: string; fg: string; accent: string }> = {
  amber: { bg: '#FFFBEB', bd: '#FCD34D', fg: '#92400E', accent: '#F59E0B' },
  blue:  { bg: '#EFF6FF', bd: '#93C5FD', fg: '#1E3A8A', accent: '#3B82F6' },
  red:   { bg: '#FEF2F2', bd: '#FCA5A5', fg: '#991B1B', accent: '#EF4444' },
  green: { bg: '#F0FDF4', bd: '#86EFAC', fg: '#14532D', accent: '#22C55E' },
  gray:  { bg: '#F9FAFB', bd: '#E5E7EB', fg: '#4B5563', accent: '#9CA3AF' },
};

export function QuadroAvisos({ avisos, intervalMs = 4000, className }: QuadroAvisosProps) {
  const [idx, setIdx]         = useState(0);
  const [pausado, setPausado] = useState(false);
  // Ref para `avisos.length` — evita resetar o setInterval toda vez que a
  // lista flutua (ex.: dados async carregando em fases no Dashboard).
  const avisosLengthRef = useRef(avisos.length);
  useEffect(() => { avisosLengthRef.current = avisos.length; }, [avisos.length]);

  // Auto-rotação: só depende de `pausado` e `intervalMs`. O length atual é
  // lido pela ref no momento de cada tick.
  useEffect(() => {
    if (pausado) return;
    const id = setInterval(() => {
      const n = avisosLengthRef.current;
      if (n > 1) setIdx(prev => (prev + 1) % n);
    }, intervalMs);
    return () => clearInterval(id);
  }, [pausado, intervalMs]);

  // Se a lista encolher e idx ficou fora dos limites, reseta
  useEffect(() => {
    if (idx >= avisos.length && avisos.length > 0) setIdx(0);
  }, [avisos.length, idx]);

  // Fallback premium — nada na fila
  if (avisos.length === 0) {
    return (
      <div
        className={`r100-fade ${className ?? ''}`}
        style={{
          background: 'linear-gradient(135deg, #FAFBFD 0%, #F3F4F6 100%)',
          border: '1px solid #E5E7EB',
          borderRadius: 14,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 64,
        }}
      >
        <span style={{
          width: 36, height: 36,
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #E5E7EB',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }} aria-hidden>✨</span>
        <div>
          <div style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: '#1A2030',
          }}>Tudo em dia</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
            Nenhuma pendência operacional agora.
          </div>
        </div>
      </div>
    );
  }

  const atual = avisos[idx] ?? avisos[0];
  const cor   = TOM_CLS[atual.tom];

  return (
    <div
      className={className}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        key={atual.id}
        onClick={atual.onClick}
        disabled={!atual.onClick}
        className="r100-fade r100-press r100-focus"
        aria-label={`${atual.titulo}${atual.descricao ? ' — ' + atual.descricao : ''}`}
        style={{
          width: '100%',
          textAlign: 'left',
          background: cor.bg,
          border: `1px solid ${cor.bd}`,
          borderLeft: `4px solid ${cor.accent}`,
          borderRadius: 14,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: atual.onClick ? 'pointer' : 'default',
          minHeight: 64,
        }}
      >
        <span style={{
          width: 36, height: 36,
          borderRadius: 12,
          background: '#fff',
          border: `1px solid ${cor.bd}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: cor.accent,
          flexShrink: 0,
          fontSize: 18,
        }} aria-hidden>
          {atual.icone ?? '🔔'}
        </span>
        {atual.contagem != null && (
          <span style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: 28,
            fontWeight: 800,
            color: cor.fg,
            lineHeight: 1,
            flexShrink: 0,
          }}>
            {atual.contagem}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: cor.fg,
            lineHeight: 1.3,
          }}>
            {atual.titulo}
          </div>
          {atual.descricao && (
            <div style={{
              fontSize: 11,
              color: cor.fg,
              opacity: 0.75,
              marginTop: 2,
              lineHeight: 1.4,
            }}>
              {atual.descricao}
            </div>
          )}
        </div>
      </button>

      {/* Dots de paginação */}
      {avisos.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: 6,
          right: 14,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}>
          {avisos.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Ir para aviso ${i + 1} de ${avisos.length}`}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className="r100-press"
              style={{
                width:  i === idx ? 14 : 6,
                height: 6,
                borderRadius: 3,
                background: i === idx ? cor.accent : 'rgba(0,0,0,0.18)',
                border: 'none',
                cursor: 'pointer',
                transition: 'width .2s ease, background .2s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
