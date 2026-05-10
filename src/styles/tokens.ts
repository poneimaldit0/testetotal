// Sistema de design Reforma100 — fonte única de verdade para todos os módulos

export const R = {
  azul:   '#2D3395',
  azul2:  '#3d4ab5',
  azul3:  '#eef0ff',
  lj:     '#F7A226',
  lj2:    '#fff8e1',
  vd:     '#1B7A4A',
  vd2:    '#e0f5ec',
  am:     '#E08B00',
  am2:    '#fff3cd',
  rx:     '#534AB7',
  rx2:    '#ede9ff',
  vm:     '#C0392B',
  vm2:    '#fde8e8',
  cz:     '#6B7280',
  cz2:    '#F3F4F6',
  nv:     '#1A2030',
  bd:     '#E5E7EB',
  bg:     '#F4F5FB',
  br:     '#FFFFFF',
} as const;

export const gradients = {
  brand:  `linear-gradient(150deg, ${R.azul} 0%, ${R.azul2} 100%)`,
  sdr:    `linear-gradient(135deg, ${R.azul} 0%, ${R.rx} 100%)`,
  crm:    `linear-gradient(150deg, ${R.azul} 0%, ${R.rx} 100%)`,
  admin:  `linear-gradient(150deg, #1A2030 0%, #2a3347 100%)`,
  warm:   `linear-gradient(150deg, ${R.am} 0%, ${R.lj} 100%)`,
} as const;

export const shadows = {
  card:      '0 1px 6px rgba(0,0,0,.07), 0 0 1px rgba(0,0,0,.04)',
  cardHover: '0 6px 24px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.05)',
  sheet:     '0 25px 50px rgba(0,0,0,.15)',
  kpi:       '0 1px 5px rgba(0,0,0,.06)',
} as const;

// Mapeamento etapa CRM → cor de borda (border-top Isabella)
export const crmEtapaColor: Record<string, string> = {
  orcamento_postado:    R.azul,
  contato_agendamento:  R.lj,
  em_orcamento:         R.am,
  propostas_enviadas:   R.rx,
  compatibilizacao:     R.rx,
  fechamento_contrato:  R.vd,
  pos_venda_feedback:   R.cz,
  ganho:                R.vd,
  perdido:              R.vm,
};

// Status candidatura → paleta de cor
export const statusCor: Record<string, { bg: string; fg: string; bd: string }> = {
  visita_agendada:    { bg: R.lj2,   fg: R.am,  bd: R.lj  },
  visita_realizada:   { bg: R.vd2,   fg: R.vd,  bd: R.vd  },
  reuniao_agendada:   { bg: R.rx2,   fg: R.rx,  bd: R.rx  },
  reuniao_realizada:  { bg: R.vd2,   fg: R.vd,  bd: R.vd  },
  em_orcamento:       { bg: R.azul3, fg: R.azul, bd: R.azul },
  orcamento_enviado:  { bg: R.vd2,   fg: R.vd,  bd: R.vd  },
  negocio_fechado:    { bg: R.vd2,   fg: R.vd,  bd: R.vd  },
  negocio_perdido:    { bg: R.cz2,   fg: R.cz,  bd: R.bd  },
};
