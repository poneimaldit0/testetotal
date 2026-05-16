/**
 * useConfirmacaoApresentacao — sinais do cliente no Rota100.
 *
 * Centraliza os 3 sinais que o cliente envia em
 * `compatibilizacoes_analises_ia` (linha mais recente do orçamento):
 *   1. cliente_solicitou_em             → marcarClienteSolicitouCompat()
 *   2. apresentacao_confirmada_em       → confirmarApresentacao()
 *   3. apresentacao_reagendamento_*     → solicitarReagendamento(motivo)
 *
 * Observações:
 * - A tabela `compatibilizacoes_solicitacoes` continua sendo gravada pelo
 *   handler que já existe em Rota100.tsx. Este hook NÃO substitui aquele
 *   registro — é COMPLEMENTAR, marca o sinal canônico que o consultor lê.
 * - Todas as funções são idempotentes (latest-write-wins via UPDATE com now()).
 * - Tipos do Supabase ainda não regenerados → usamos `(supabase as any)`.
 */

import { supabase } from '@/integrations/supabase/client';

export type ConfirmacaoResultado = { ok: boolean; erro?: string };

const TABELA = 'compatibilizacoes_analises_ia';

async function buscarLinhaMaisRecente(orcamentoId: string): Promise<{ id: string } | null> {
  try {
    const { data, error } = await (supabase as any)
      .from(TABELA)
      .select('id')
      .eq('orcamento_id', orcamentoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id as string };
  } catch (err) {
    console.error('[useConfirmacaoApresentacao] buscarLinhaMaisRecente', err);
    return null;
  }
}

export function useConfirmacaoApresentacao(orcamentoId: string | null) {

  const marcarClienteSolicitouCompat = async (): Promise<ConfirmacaoResultado> => {
    if (!orcamentoId) {
      return { ok: false, erro: 'orcamentoId ausente' };
    }
    try {
      // Caso já exista uma linha em compatibilizacoes_analises_ia para esse
      // orçamento, atualizamos a mais recente. Caso contrário, retornamos ok:true
      // — a linha será criada pelo job/edge function de IA quando a compat rodar
      // e o registro de auditoria em compatibilizacoes_solicitacoes continua
      // sendo feito pelo handler do Rota100.tsx.
      const linha = await buscarLinhaMaisRecente(orcamentoId);
      if (!linha) {
        return { ok: true };
      }

      const { error } = await (supabase as any)
        .from(TABELA)
        .update({ cliente_solicitou_em: new Date().toISOString() })
        .eq('id', linha.id);

      if (error) {
        console.error('[useConfirmacaoApresentacao] marcarClienteSolicitouCompat', error);
        return { ok: false, erro: error.message ?? 'Falha ao registrar solicitação' };
      }
      return { ok: true };
    } catch (err: any) {
      console.error('[useConfirmacaoApresentacao] marcarClienteSolicitouCompat catch', err);
      return { ok: false, erro: err?.message ?? 'Erro desconhecido' };
    }
  };

  const confirmarApresentacao = async (): Promise<ConfirmacaoResultado> => {
    if (!orcamentoId) {
      return { ok: false, erro: 'orcamentoId ausente' };
    }
    try {
      const linha = await buscarLinhaMaisRecente(orcamentoId);
      if (!linha) {
        return { ok: false, erro: 'Apresentação ainda não foi agendada' };
      }

      const { error } = await (supabase as any)
        .from(TABELA)
        .update({
          apresentacao_confirmada_em: new Date().toISOString(),
          apresentacao_status:        'confirmada',
        })
        .eq('id', linha.id);

      if (error) {
        console.error('[useConfirmacaoApresentacao] confirmarApresentacao', error);
        return { ok: false, erro: error.message ?? 'Falha ao confirmar apresentação' };
      }
      return { ok: true };
    } catch (err: any) {
      console.error('[useConfirmacaoApresentacao] confirmarApresentacao catch', err);
      return { ok: false, erro: err?.message ?? 'Erro desconhecido' };
    }
  };

  const solicitarReagendamento = async (motivo: string): Promise<ConfirmacaoResultado> => {
    if (!orcamentoId) {
      return { ok: false, erro: 'orcamentoId ausente' };
    }
    const motivoLimpo = (motivo ?? '').trim();
    if (!motivoLimpo) {
      return { ok: false, erro: 'Informe o motivo do reagendamento' };
    }
    try {
      const linha = await buscarLinhaMaisRecente(orcamentoId);
      if (!linha) {
        return { ok: false, erro: 'Apresentação ainda não foi agendada' };
      }

      const { error } = await (supabase as any)
        .from(TABELA)
        .update({
          apresentacao_reagendamento_solicitado_em: new Date().toISOString(),
          apresentacao_reagendamento_motivo:        motivoLimpo,
          apresentacao_status:                      'reagendamento_solicitado',
        })
        .eq('id', linha.id);

      if (error) {
        console.error('[useConfirmacaoApresentacao] solicitarReagendamento', error);
        return { ok: false, erro: error.message ?? 'Falha ao solicitar reagendamento' };
      }
      return { ok: true };
    } catch (err: any) {
      console.error('[useConfirmacaoApresentacao] solicitarReagendamento catch', err);
      return { ok: false, erro: err?.message ?? 'Erro desconhecido' };
    }
  };

  return {
    marcarClienteSolicitouCompat,
    confirmarApresentacao,
    solicitarReagendamento,
  };
}
