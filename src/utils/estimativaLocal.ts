const CUSTO_M2_POR_CATEGORIA: Record<string, [number, number, number]> = {
  pintura: [45, 65, 90],
  pintura_interna: [40, 60, 85],
  pintura_externa: [50, 70, 100],
  revestimento: [120, 180, 280],
  piso: [100, 160, 260],
  azulejo: [110, 170, 270],
  porcelanato: [150, 220, 350],
  hidraulica: [180, 280, 420],
  banheiro: [2500, 4500, 8000],
  cozinha: [3000, 5500, 10000],
  lavabo: [1800, 3200, 6000],
  eletrica: [100, 160, 240],
  instalacao_eletrica: [90, 150, 230],
  gesso: [60, 90, 130],
  drywall: [80, 120, 180],
  forro: [55, 85, 125],
  marcenaria: [400, 700, 1200],
  moveis_planejados: [450, 800, 1400],
  reforma_completa: [800, 1300, 2200],
  reforma_parcial: [400, 700, 1200],
  estrutural: [600, 1000, 1800],
  demolicao: [150, 250, 400],
  janela: [800, 1400, 2500],
  porta: [600, 1000, 1800],
  esquadrias: [700, 1200, 2200],
  default: [350, 600, 1000],
};

const CATEGORIAS_FIXAS = ['banheiro', 'cozinha', 'lavabo', 'janela', 'porta'];

export interface EstimativaLocal {
  min: number;
  medio: number;
  max: number;
  confianca: 'baixa';
  observacao: string;
  categorias_usadas: string[];
}

interface InputEstimativaLocal {
  tamanho_imovel?: number | null;
  categorias?: string[] | null;
  necessidade?: string | null;
}

export function calcularEstimativaLocal(input: InputEstimativaLocal): EstimativaLocal | null {
  const { tamanho_imovel, categorias } = input;

  if (!tamanho_imovel || tamanho_imovel <= 0) return null;
  if (!categorias || categorias.length === 0) return null;

  const area = tamanho_imovel;
  const categoriasUsadas: string[] = [];
  let totalMin = 0;
  let totalMedio = 0;
  let totalMax = 0;

  for (const categoria of categorias) {
    const chave = encontrarCategoria(categoria);
    const [min, medio, max] = CUSTO_M2_POR_CATEGORIA[chave];
    categoriasUsadas.push(chave);

    if (CATEGORIAS_FIXAS.some((fixa) => chave.includes(fixa))) {
      totalMin += min;
      totalMedio += medio;
      totalMax += max;
      continue;
    }

    totalMin += min * area;
    totalMedio += medio * area;
    totalMax += max * area;
  }

  const fatorSobreposicao = categorias.length > 1 ? 0.75 : 1;

  return {
    min: Math.round(totalMin * fatorSobreposicao),
    medio: Math.round(totalMedio * fatorSobreposicao),
    max: Math.round(totalMax * fatorSobreposicao),
    confianca: 'baixa',
    observacao: 'Estimativa local (sem IA) — referência SINAPI/CUB SP 2025. Solicite estimativa técnica completa para valor mais preciso.',
    categorias_usadas: categoriasUsadas,
  };
}

function encontrarCategoria(cat: string): string {
  const normalizado = cat
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  const chaves = Object.keys(CUSTO_M2_POR_CATEGORIA);
  if (chaves.includes(normalizado)) return normalizado;

  const parcial = chaves.find((chave) => normalizado.includes(chave) || chave.includes(normalizado));
  return parcial ?? 'default';
}
