import { supabase } from '@/integrations/supabase/client';

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutos

export interface CamposRelevantesIA {
  necessidade: string;
  categorias: string[];
  tamanho_imovel?: number | null;
}

/**
 * Decide se a estimativa IA deve ser (re)calculada para um dado orçamento.
 *
 * Regras:
 *  - Ignora se a última estimativa foi gerada há menos de 2 minutos (cooldown)
 *  - Ignora se nenhum campo relevante mudou em relação ao DB atual
 *  - Campos relevantes: necessidade, categorias, area_m2
 *
 * Deve ser chamado ANTES de salvar o update no banco,
 * para comparar os valores novos com os valores atuais do DB.
 */
export async function deveRecalcularEstimativa(
  orcamentoId: string,
  novosDados: CamposRelevantesIA,
): Promise<{ deve: boolean; motivo: string }> {
  // ── 1. Cooldown: última estimativa < 2 minutos? ───────────────────────────
  const { data: ultimaEst } = await supabase
    .from('estimativas_tecnicas')
    .select('created_at')
    .eq('orcamento_id', orcamentoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultimaEst) {
    const diffMs = Date.now() - new Date((ultimaEst as any).created_at).getTime();
    if (diffMs < COOLDOWN_MS) {
      const motivo = `cooldown ativo (${Math.round(diffMs / 1000)}s desde última geração — mínimo ${COOLDOWN_MS / 1000}s)`;
      console.log(`[estimativaIA] Ignorado — ${motivo} — orcamento: ${orcamentoId}`);
      return { deve: false, motivo };
    }
  }

  // ── 2. Buscar valores atuais do DB (snapshot pré-update) ─────────────────
  const { data: atual } = await supabase
    .from('orcamentos')
    .select('necessidade, categorias, tamanho_imovel')
    .eq('id', orcamentoId)
    .maybeSingle();

  if (!atual) {
    return { deve: true, motivo: 'sem registro anterior no banco' };
  }

  // ── 3. Diff de campos relevantes ─────────────────────────────────────────
  const diff: string[] = [];

  if (atual.necessidade !== novosDados.necessidade) {
    diff.push('necessidade');
  }

  const catAtual = [...((atual.categorias as string[]) ?? [])].sort().join(',');
  const catNova  = [...(novosDados.categorias ?? [])].sort().join(',');
  if (catAtual !== catNova) {
    diff.push('categorias');
  }

  if ((atual.tamanho_imovel ?? 0) !== (novosDados.tamanho_imovel ?? 0)) {
    diff.push('area_m2');
  }

  if (diff.length === 0) {
    const motivo = 'sem alteração em campos relevantes (necessidade, categorias, area_m2)';
    console.log(`[estimativaIA] Ignorado — ${motivo} — orcamento: ${orcamentoId}`);
    return { deve: false, motivo };
  }

  const motivo = `campos alterados: ${diff.join(', ')}`;
  console.log(`[estimativaIA] Recalculando — ${motivo} — orcamento: ${orcamentoId}`);
  return { deve: true, motivo };
}
