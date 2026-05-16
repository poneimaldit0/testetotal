// Pills operacionais de status PDF e leitura IA — usadas tanto no
// ModalCompatibilizacaoConsultor quanto na FichaOperacionalAdmin.
// Reutilizam as classes utilitárias .r100-pill-* do design system.

export function StatusPdfPill({ qualidade, temArquivo }: { qualidade: string | null; temArquivo: boolean }) {
  if (!temArquivo) return null;
  if (qualidade === 'proposta_completa')   return <span className="r100-pill r100-pill-green">PDF válido</span>;
  if (qualidade === 'proposta_incompleta') return <span className="r100-pill r100-pill-red">PDF incompleto</span>;
  return <span className="r100-pill r100-pill-gray">PDF não validado</span>;
}

export function StatusIaPill({ statusAnalise }: { statusAnalise: string | null }) {
  // Labels da análise técnica da proposta. Não usar "IA" no rótulo — IA é
  // ferramenta, não etapa de fluxo (vide memória feedback_compat_nao_e_sdr).
  if (!statusAnalise)                                                       return <span className="r100-pill r100-pill-gray">Sem análise</span>;
  if (['pending', 'processando'].includes(statusAnalise))                  return <span className="r100-pill r100-pill-amber">Analisando</span>;
  if (['completed', 'concluida'].includes(statusAnalise))                  return <span className="r100-pill r100-pill-blue">Análise concluída</span>;
  if (['failed', 'erro'].includes(statusAnalise))                          return <span className="r100-pill r100-pill-red">Análise falhou</span>;
  if (statusAnalise === 'cancelada')                                       return <span className="r100-pill r100-pill-gray">Análise cancelada</span>;
  return <span className="r100-pill r100-pill-gray">{statusAnalise}</span>;
}
