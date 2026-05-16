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
  if (!statusAnalise)                                                       return <span className="r100-pill r100-pill-gray">Sem análise IA</span>;
  if (['pending', 'processando'].includes(statusAnalise))                  return <span className="r100-pill r100-pill-amber">IA processando</span>;
  if (['completed', 'concluida'].includes(statusAnalise))                  return <span className="r100-pill r100-pill-blue">IA concluída</span>;
  if (['failed', 'erro'].includes(statusAnalise))                          return <span className="r100-pill r100-pill-red">IA falhou</span>;
  if (statusAnalise === 'cancelada')                                       return <span className="r100-pill r100-pill-gray">IA cancelada</span>;
  return <span className="r100-pill r100-pill-gray">{statusAnalise}</span>;
}
