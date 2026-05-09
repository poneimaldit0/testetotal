/**
 * rota100Storage — persistência da solicitação de compatibilização.
 * Camada: Supabase (tabela compat_requests).
 */

import { supabase } from '@/integrations/supabase/client';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface CompatRequest {
  token:        string;
  clienteNome:  string;
  solicitadoEm: string;   // ISO 8601
  status:       'pendente' | 'visualizado' | 'enviado';
  tipo:         'completa' | 'individual';
  obraId?:      string | null;
  consultorId?: string | null;
  empresaId?:   string | null;
  orcamentoId?: string | null;
}

export interface CompatRequestSaveOpts {
  obraId?:      string;
  consultorId?: string;
  empresaId?:   string;
  orcamentoId?: string;
  tipo?:        'completa' | 'individual';
}

// ── Helpers internos ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from('compat_requests');

// ── API pública ───────────────────────────────────────────────────────────────

export async function getCompatRequest(token: string): Promise<CompatRequest | null> {
  try {
    const { data, error } = await table()
      .select('token, cliente_nome, solicitado_em, status, tipo, obra_id, consultor_id, empresa_id, orcamento_id')
      .eq('token', token)
      .eq('tipo', 'completa')
      .maybeSingle();
    if (error || !data) return null;
    return {
      token:        data.token,
      clienteNome:  data.cliente_nome,
      solicitadoEm: data.solicitado_em,
      status:       data.status,
      tipo:         data.tipo ?? 'completa',
      obraId:       data.obra_id,
      consultorId:  data.consultor_id,
      empresaId:    data.empresa_id,
      orcamentoId:  data.orcamento_id,
    };
  } catch {
    return null;
  }
}

export async function saveCompatRequest(
  token:       string,
  clienteNome: string,
  opts:        CompatRequestSaveOpts = {},
): Promise<CompatRequest> {
  const solicitadoEm = new Date().toISOString();
  const tipo = opts.tipo ?? 'completa';
  const { error } = await table().insert({
    token,
    cliente_nome:  clienteNome,
    solicitado_em: solicitadoEm,
    status:        'pendente',
    tipo,
    obra_id:       opts.obraId      ?? null,
    consultor_id:  opts.consultorId ?? null,
    empresa_id:    opts.empresaId   ?? null,
    orcamento_id:  opts.orcamentoId ?? null,
  });
  if (error) {
    console.error('[saveCompatRequest]', error);
    throw error;
  }
  return {
    token,
    clienteNome,
    solicitadoEm,
    status:      'pendente',
    tipo,
    obraId:      opts.obraId      ?? null,
    consultorId: opts.consultorId ?? null,
    empresaId:   opts.empresaId   ?? null,
    orcamentoId: opts.orcamentoId ?? null,
  };
}

export interface CompatRequestInfo {
  tipo:      'completa' | 'individual';
  empresaId: string | null;
}

// Retorna todas as compat requests do token (completa + individual) para restaurar UI no reload.
export async function getCompatRequests(token: string): Promise<CompatRequestInfo[]> {
  try {
    const { data, error } = await table()
      .select('tipo, empresa_id')
      .eq('token', token)
      .in('tipo', ['completa', 'individual']);
    if (error || !data) return [];
    return (data as any[]).map(r => ({
      tipo:      r.tipo as 'completa' | 'individual',
      empresaId: r.empresa_id ?? null,
    }));
  } catch {
    return [];
  }
}

// Verifica qualquer compat request (completa ou individual) para restaurar estado no reload.
export async function hasCompatRequest(token: string): Promise<boolean> {
  try {
    const { data, error } = await table()
      .select('id')
      .eq('token', token)
      .in('tipo', ['completa', 'individual'])
      .limit(1);
    return !error && (data ?? []).length > 0;
  } catch {
    return false;
  }
}

// ── Painel do consultor ───────────────────────────────────────────────────────

export interface PendingCompatRequest {
  id:           string;
  token:        string;
  clienteNome:  string;
  solicitadoEm: string;
  tipo:         string;
  orcamentoId:  string | null;
  obraId:       string | null;
  consultorId:  string | null;
  empresaId:    string | null;
}

/**
 * Lista solicitações pendentes para o painel do consultor.
 * Ordena por solicitado_em DESC (mais recentes primeiro).
 * Filtra por consultor_id se fornecido; caso contrário retorna todas as pendentes.
 */
// ── Dispensa de empresa (Rota100) ─────────────────────────────────────────────

export interface EmpresaFeedbackOpts {
  token:           string;
  orcamentoId:     string;
  candidaturaId:   string;
  empresaNome:     string;
  notaComunicacao?: number | null;
  notaPrazo?:       number | null;
  notaTransparencia?: number | null;
  notaGeral?:       number | null;
  justificativa:   string;
}

export async function saveEmpresaDispensa(opts: EmpresaFeedbackOpts): Promise<void> {
  const { error } = await (supabase as any).from('rota100_empresa_feedbacks').insert({
    token:              opts.token,
    orcamento_id:       opts.orcamentoId,
    candidatura_id:     opts.candidaturaId,
    empresa_nome:       opts.empresaNome,
    tipo:               'dispensa',
    nota_comunicacao:   opts.notaComunicacao   ?? null,
    nota_prazo:         opts.notaPrazo         ?? null,
    nota_transparencia: opts.notaTransparencia ?? null,
    nota_geral:         opts.notaGeral         ?? null,
    justificativa:      opts.justificativa,
  });
  if (error) {
    console.error('[saveEmpresaDispensa]', error);
    throw error;
  }
}

export async function getDispensadas(token: string): Promise<string[]> {
  try {
    const { data } = await (supabase as any)
      .from('rota100_empresa_feedbacks')
      .select('candidatura_id')
      .eq('token', token)
      .eq('tipo', 'dispensa');
    return (data ?? []).map((r: any) => r.candidatura_id as string);
  } catch {
    return [];
  }
}

// ── Painel do consultor ───────────────────────────────────────────────────────

export async function listPendingCompatRequests(
  consultorId?: string,
): Promise<PendingCompatRequest[]> {
  try {
    let query = table()
      .select('id, token, cliente_nome, solicitado_em, tipo, orcamento_id, obra_id, consultor_id, empresa_id')
      .eq('status', 'pendente')
      .order('solicitado_em', { ascending: false });

    if (consultorId) {
      query = query.eq('consultor_id', consultorId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as any[]).map(row => ({
      id:           row.id,
      token:        row.token,
      clienteNome:  row.cliente_nome,
      solicitadoEm: row.solicitado_em,
      tipo:         row.tipo ?? 'completa',
      orcamentoId:  row.orcamento_id,
      obraId:       row.obra_id,
      consultorId:  row.consultor_id,
      empresaId:    row.empresa_id,
    }));
  } catch {
    return [];
  }
}
