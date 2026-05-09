import type { ItemExtratoBanco, ResultadoImportacao } from '@/types/conciliacao';

export interface MapeamentoColunas {
  data: number;
  descricao: number;
  valor: number;
  tipo?: number; // Opcional - se não existir, infere pelo sinal do valor
}

/**
 * Parser para arquivos CSV de extrato bancário
 * Aceita diferentes formatos com mapeamento flexível de colunas
 */
export const parseExtratoCSV = (
  conteudo: string, 
  nomeArquivo: string,
  mapeamento?: MapeamentoColunas,
  separador: string = ';'
): ResultadoImportacao => {
  const itens: ItemExtratoBanco[] = [];
  const erros: string[] = [];

  try {
    // Dividir em linhas
    const linhas = conteudo.split(/\r?\n/).filter(l => l.trim());
    
    if (linhas.length < 2) {
      return {
        sucesso: false,
        itens: [],
        erros: ['Arquivo CSV vazio ou com apenas cabeçalho'],
        arquivo: nomeArquivo
      };
    }

    // Primeira linha é cabeçalho - detectar mapeamento automaticamente se não fornecido
    const cabecalho = linhas[0].split(separador).map(c => c.trim().toLowerCase());
    const mapeamentoFinal = mapeamento || detectarMapeamento(cabecalho);

    if (!mapeamentoFinal) {
      return {
        sucesso: false,
        itens: [],
        erros: ['Não foi possível identificar as colunas do CSV. Certifique-se que o arquivo possui colunas de data, descrição e valor.'],
        arquivo: nomeArquivo
      };
    }

    // Processar linhas de dados
    for (let i = 1; i < linhas.length; i++) {
      const colunas = parseLinhaCSV(linhas[i], separador);
      
      if (colunas.length <= Math.max(mapeamentoFinal.data, mapeamentoFinal.descricao, mapeamentoFinal.valor)) {
        continue; // Linha incompleta
      }

      const dataRaw = colunas[mapeamentoFinal.data]?.trim();
      const descricao = colunas[mapeamentoFinal.descricao]?.trim();
      const valorRaw = colunas[mapeamentoFinal.valor]?.trim();

      if (!dataRaw || !valorRaw) {
        erros.push(`Linha ${i + 1}: dados incompletos`);
        continue;
      }

      // Converter data
      const dataFormatada = formatarDataCSV(dataRaw);
      if (!dataFormatada) {
        erros.push(`Linha ${i + 1}: data inválida (${dataRaw})`);
        continue;
      }

      // Converter valor
      const valorNumerico = parseValorBR(valorRaw);
      if (isNaN(valorNumerico) || valorNumerico === 0) {
        continue; // Pular linhas sem valor
      }

      // Determinar tipo
      let tipo: 'entrada' | 'saida' = valorNumerico >= 0 ? 'entrada' : 'saida';
      
      // Se tiver coluna de tipo, usar ela
      if (mapeamentoFinal.tipo !== undefined && colunas[mapeamentoFinal.tipo]) {
        const tipoRaw = colunas[mapeamentoFinal.tipo].toLowerCase();
        if (tipoRaw.includes('déb') || tipoRaw.includes('deb') || tipoRaw.includes('sai') || tipoRaw === 'd') {
          tipo = 'saida';
        } else if (tipoRaw.includes('créd') || tipoRaw.includes('cred') || tipoRaw.includes('ent') || tipoRaw === 'c') {
          tipo = 'entrada';
        }
      }

      itens.push({
        id: `csv-${i}-${Date.now()}`,
        data: dataFormatada,
        descricao: descricao || 'Sem descrição',
        valor: Math.abs(valorNumerico),
        tipo,
        vinculado: false
      });
    }

    // Ordenar por data
    itens.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    return {
      sucesso: itens.length > 0,
      itens,
      erros,
      arquivo: nomeArquivo
    };
  } catch (error) {
    console.error('Erro ao parsear CSV:', error);
    return {
      sucesso: false,
      itens: [],
      erros: [`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
      arquivo: nomeArquivo
    };
  }
};

function detectarMapeamento(cabecalho: string[]): MapeamentoColunas | null {
  let dataIdx = -1;
  let descricaoIdx = -1;
  let valorIdx = -1;
  let tipoIdx = -1;

  for (let i = 0; i < cabecalho.length; i++) {
    const col = cabecalho[i];
    
    if (dataIdx === -1 && (col.includes('data') || col.includes('date') || col === 'dt')) {
      dataIdx = i;
    }
    
    if (descricaoIdx === -1 && (col.includes('descri') || col.includes('hist') || col.includes('memo') || col.includes('lancamento'))) {
      descricaoIdx = i;
    }
    
    if (valorIdx === -1 && (col.includes('valor') || col.includes('value') || col.includes('amount') || col === 'vlr')) {
      valorIdx = i;
    }
    
    if (tipoIdx === -1 && (col.includes('tipo') || col.includes('type') || col === 'd/c')) {
      tipoIdx = i;
    }
  }

  // Se não encontrou, tentar posições padrão comuns
  if (dataIdx === -1) dataIdx = 0;
  if (descricaoIdx === -1) descricaoIdx = cabecalho.length > 2 ? 1 : 0;
  if (valorIdx === -1) valorIdx = cabecalho.length > 2 ? 2 : 1;

  if (valorIdx === -1) return null;

  return {
    data: dataIdx,
    descricao: descricaoIdx,
    valor: valorIdx,
    tipo: tipoIdx >= 0 ? tipoIdx : undefined
  };
}

function parseLinhaCSV(linha: string, separador: string): string[] {
  const resultado: string[] = [];
  let atual = '';
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];
    
    if (char === '"') {
      dentroAspas = !dentroAspas;
    } else if (char === separador && !dentroAspas) {
      resultado.push(atual.trim().replace(/^"|"$/g, ''));
      atual = '';
    } else {
      atual += char;
    }
  }
  
  resultado.push(atual.trim().replace(/^"|"$/g, ''));
  return resultado;
}

function formatarDataCSV(dataRaw: string): string | null {
  try {
    // Tentar vários formatos comuns
    
    // DD/MM/YYYY ou DD-MM-YYYY
    const matchDMY = dataRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (matchDMY) {
      const [, dia, mes, ano] = matchDMY;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // YYYY-MM-DD ou YYYY/MM/DD
    const matchYMD = dataRaw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (matchYMD) {
      const [, ano, mes, dia] = matchYMD;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    // DD/MM/YY
    const matchDMY2 = dataRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (matchDMY2) {
      const [, dia, mes, anoShort] = matchDMY2;
      const ano = parseInt(anoShort) > 50 ? `19${anoShort}` : `20${anoShort}`;
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    return null;
  } catch {
    return null;
  }
}

function parseValorBR(valorRaw: string): number {
  // Remover caracteres não numéricos exceto vírgula, ponto e sinal
  let limpo = valorRaw.replace(/[^\d,.\-]/g, '');
  
  // Detectar formato brasileiro (1.234,56) vs americano (1,234.56)
  const temVirgulaDecimal = /\d,\d{2}$/.test(limpo);
  const temPontoDecimal = /\d\.\d{2}$/.test(limpo);
  
  if (temVirgulaDecimal) {
    // Formato BR: remover pontos de milhar, trocar vírgula por ponto
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (!temPontoDecimal) {
    // Se não tem decimal claro, assumir que vírgula é decimal
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  }
  
  return parseFloat(limpo);
}
