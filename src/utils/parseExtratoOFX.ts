import type { ItemExtratoBanco, ResultadoImportacao } from '@/types/conciliacao';

/**
 * Parser para arquivos OFX (Open Financial Exchange)
 * Formato padrão utilizado por bancos brasileiros
 */
export const parseExtratoOFX = (conteudo: string, nomeArquivo: string): ResultadoImportacao => {
  const itens: ItemExtratoBanco[] = [];
  const erros: string[] = [];

  try {
    // Remover declaração XML e espaços
    const conteudoLimpo = conteudo.replace(/<\?.*?\?>/g, '').trim();

    // Extrair transações usando regex
    const transacaoRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    const matches = conteudoLimpo.matchAll(transacaoRegex);

    let contador = 0;
    for (const match of matches) {
      const transacao = match[1];
      
      // Extrair campos
      const tipo = extrairCampo(transacao, 'TRNTYPE');
      const data = extrairCampo(transacao, 'DTPOSTED');
      const valor = extrairCampo(transacao, 'TRNAMT');
      const fitid = extrairCampo(transacao, 'FITID');
      const memo = extrairCampo(transacao, 'MEMO') || extrairCampo(transacao, 'NAME') || '';

      if (!data || !valor) {
        erros.push(`Transação ${contador + 1}: dados incompletos`);
        continue;
      }

      // Converter data OFX (YYYYMMDD ou YYYYMMDDHHMMSS) para ISO
      const dataFormatada = formatarDataOFX(data);
      if (!dataFormatada) {
        erros.push(`Transação ${contador + 1}: data inválida (${data})`);
        continue;
      }

      // Converter valor
      const valorNumerico = parseFloat(valor.replace(',', '.'));
      if (isNaN(valorNumerico)) {
        erros.push(`Transação ${contador + 1}: valor inválido (${valor})`);
        continue;
      }

      itens.push({
        id: fitid || `ofx-${contador}-${Date.now()}`,
        data: dataFormatada,
        descricao: limparDescricao(memo),
        valor: Math.abs(valorNumerico),
        tipo: valorNumerico >= 0 ? 'entrada' : 'saida',
        vinculado: false
      });

      contador++;
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
    console.error('Erro ao parsear OFX:', error);
    return {
      sucesso: false,
      itens: [],
      erros: [`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
      arquivo: nomeArquivo
    };
  }
};

function extrairCampo(transacao: string, campo: string): string | null {
  // Formato SGML: <CAMPO>valor
  const regexSGML = new RegExp(`<${campo}>([^<\\r\\n]+)`, 'i');
  const matchSGML = transacao.match(regexSGML);
  if (matchSGML) return matchSGML[1].trim();

  // Formato XML: <CAMPO>valor</CAMPO>
  const regexXML = new RegExp(`<${campo}>([^<]*)</${campo}>`, 'i');
  const matchXML = transacao.match(regexXML);
  if (matchXML) return matchXML[1].trim();

  return null;
}

function formatarDataOFX(dataOFX: string): string | null {
  try {
    // Formato: YYYYMMDD ou YYYYMMDDHHMMSS ou YYYYMMDDHHMMSS[offset]
    const apenasDigitos = dataOFX.replace(/\D/g, '').substring(0, 8);
    
    if (apenasDigitos.length < 8) return null;

    const ano = apenasDigitos.substring(0, 4);
    const mes = apenasDigitos.substring(4, 6);
    const dia = apenasDigitos.substring(6, 8);

    return `${ano}-${mes}-${dia}`;
  } catch {
    return null;
  }
}

function limparDescricao(descricao: string): string {
  return descricao
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sÀ-ú\-\/\.\,\*]/g, '')
    .trim()
    .substring(0, 200);
}
