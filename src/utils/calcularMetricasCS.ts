import { CSRitualSemanal } from '@/types/customerSuccess';

export interface DadosEvolucao {
  semana: number;
  inscricoes: number;
  visitas: number;
  orcamentos: number;
  contratos: number;
  inscricoesIncremento: number;
  visitasIncremento: number;
  orcamentosIncremento: number;
  contratosIncremento: number;
}

export interface ConversaoFunil {
  inscricoes: number;
  visitas: number;
  orcamentos: number;
  contratos: number;
  taxaInscricoesVisitas: number;
  taxaVisitasOrcamentos: number;
  taxaOrcamentosContratos: number;
}

/**
 * Calcula o incremento de uma semana em relação à anterior
 * Como os valores são acumulados, incremento = valor_atual - valor_anterior
 */
export function calcularIncremento(
  rituais: CSRitualSemanal[],
  semana: number,
  campo: 'inscricoes_orcamentos' | 'visitas_realizadas' | 'orcamentos_enviados' | 'contratos_fechados'
): number {
  const ritualAtual = rituais.find(r => r.semana === semana);
  const ritualAnterior = rituais.find(r => r.semana === semana - 1);

  if (!ritualAtual) return 0;

  const valorAtual = ritualAtual[campo] || 0;
  const valorAnterior = ritualAnterior?.[campo] || 0;

  return valorAtual - valorAnterior;
}

/**
 * Calcula a taxa de conversão entre dois valores
 */
export function calcularConversao(valorOrigem: number, valorDestino: number): number {
  if (valorOrigem === 0) return 0;
  return (valorDestino / valorOrigem) * 100;
}

/**
 * Calcula a média semanal de incrementos
 */
export function calcularMediaIncremento(
  rituais: CSRitualSemanal[],
  campo: 'inscricoes_orcamentos' | 'visitas_realizadas' | 'orcamentos_enviados' | 'contratos_fechados'
): number {
  const rituaisOrdenados = [...rituais].sort((a, b) => a.semana - b.semana);
  if (rituaisOrdenados.length === 0) return 0;

  let somaIncrementos = 0;
  let contagem = 0;

  for (let i = 0; i < rituaisOrdenados.length; i++) {
    const valorAtual = rituaisOrdenados[i][campo] || 0;
    const valorAnterior = i > 0 ? rituaisOrdenados[i - 1][campo] || 0 : 0;
    somaIncrementos += valorAtual - valorAnterior;
    contagem++;
  }

  return contagem > 0 ? somaIncrementos / contagem : 0;
}

/**
 * Gera dados de evolução para gráficos
 */
export function gerarDadosEvolucao(rituais: CSRitualSemanal[]): DadosEvolucao[] {
  const rituaisOrdenados = [...rituais]
    .filter(r => r.concluido)
    .sort((a, b) => a.semana - b.semana);

  return rituaisOrdenados.map((ritual, index) => {
    const anterior = index > 0 ? rituaisOrdenados[index - 1] : null;

    return {
      semana: ritual.semana,
      inscricoes: ritual.inscricoes_orcamentos || 0,
      visitas: ritual.visitas_realizadas || 0,
      orcamentos: ritual.orcamentos_enviados || 0,
      contratos: ritual.contratos_fechados || 0,
      inscricoesIncremento: (ritual.inscricoes_orcamentos || 0) - (anterior?.inscricoes_orcamentos || 0),
      visitasIncremento: (ritual.visitas_realizadas || 0) - (anterior?.visitas_realizadas || 0),
      orcamentosIncremento: (ritual.orcamentos_enviados || 0) - (anterior?.orcamentos_enviados || 0),
      contratosIncremento: (ritual.contratos_fechados || 0) - (anterior?.contratos_fechados || 0),
    };
  });
}

/**
 * Obtém o funil de conversão baseado nos valores acumulados mais recentes
 */
export function obterFunilConversao(rituais: CSRitualSemanal[]): ConversaoFunil {
  const ritualMaisRecente = [...rituais]
    .filter(r => r.concluido)
    .sort((a, b) => b.semana - a.semana)[0];

  if (!ritualMaisRecente) {
    return {
      inscricoes: 0,
      visitas: 0,
      orcamentos: 0,
      contratos: 0,
      taxaInscricoesVisitas: 0,
      taxaVisitasOrcamentos: 0,
      taxaOrcamentosContratos: 0,
    };
  }

  const inscricoes = ritualMaisRecente.inscricoes_orcamentos || 0;
  const visitas = ritualMaisRecente.visitas_realizadas || 0;
  const orcamentos = ritualMaisRecente.orcamentos_enviados || 0;
  const contratos = ritualMaisRecente.contratos_fechados || 0;

  return {
    inscricoes,
    visitas,
    orcamentos,
    contratos,
    taxaInscricoesVisitas: calcularConversao(inscricoes, visitas),
    taxaVisitasOrcamentos: calcularConversao(visitas, orcamentos),
    taxaOrcamentosContratos: calcularConversao(orcamentos, contratos),
  };
}

/**
 * Compara duas semanas e retorna as diferenças
 */
export function compararSemanas(
  rituais: CSRitualSemanal[],
  semana1: number,
  semana2: number
): {
  semana1: DadosEvolucao | null;
  semana2: DadosEvolucao | null;
  diferencas: {
    inscricoes: number;
    visitas: number;
    orcamentos: number;
    contratos: number;
    inscricoesPercent: number;
    visitasPercent: number;
    orcamentosPercent: number;
    contratosPercent: number;
  } | null;
} {
  const dados = gerarDadosEvolucao(rituais);
  const d1 = dados.find(d => d.semana === semana1) || null;
  const d2 = dados.find(d => d.semana === semana2) || null;

  if (!d1 || !d2) {
    return { semana1: d1, semana2: d2, diferencas: null };
  }

  const calcPercent = (ant: number, atual: number) => {
    if (ant === 0) return atual > 0 ? 100 : 0;
    return ((atual - ant) / ant) * 100;
  };

  return {
    semana1: d1,
    semana2: d2,
    diferencas: {
      inscricoes: d2.inscricoesIncremento - d1.inscricoesIncremento,
      visitas: d2.visitasIncremento - d1.visitasIncremento,
      orcamentos: d2.orcamentosIncremento - d1.orcamentosIncremento,
      contratos: d2.contratosIncremento - d1.contratosIncremento,
      inscricoesPercent: calcPercent(d1.inscricoesIncremento, d2.inscricoesIncremento),
      visitasPercent: calcPercent(d1.visitasIncremento, d2.visitasIncremento),
      orcamentosPercent: calcPercent(d1.orcamentosIncremento, d2.orcamentosIncremento),
      contratosPercent: calcPercent(d1.contratosIncremento, d2.contratosIncremento),
    }
  };
}
