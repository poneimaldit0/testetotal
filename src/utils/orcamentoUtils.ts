
export const obterPrioridadePrazo = (prazo: string | Date): number => {
  if (typeof prazo !== 'string') return 999;
  
  const prioridades: Record<string, number> = {
    'Imediatamente': 1,
    'Em até 1 semana': 2,
    'Em até 1 mês': 3,
    'Em até 3 meses': 4,
    'Em até 6 meses': 5,
    'Flexível': 6
  };
  
  return prioridades[prazo] || 999;
};

export const montarMensagemWhatsApp = (
  nomeCliente: string,
  nomeFornecedor: string,
  empresaFornecedor: string,
  localReforma: string
): string => {
  return `Olá, muito boa tarde ${nomeCliente}!\n\nTudo bem?\n\nQuem fala é o ${nomeFornecedor}, da ${empresaFornecedor}, parceiro homologado da Reforma100\n\nMe passaram seu interesse em uma reforma na ${localReforma}`;
};

export const abrirWhatsApp = (
  telefone: string,
  nomeCliente: string,
  orcamentoId: string,
  nomeFornecedor?: string,
  empresaFornecedor?: string,
  localReforma?: string
) => {
  const mensagem = nomeFornecedor && empresaFornecedor && localReforma
    ? montarMensagemWhatsApp(nomeCliente, nomeFornecedor, empresaFornecedor, localReforma)
    : `Olá ${nomeCliente}, vi seu orçamento ${orcamentoId} no Reforma100 e gostaria de conversar sobre o projeto.`;
  const telefoneFormatado = telefone.replace(/\D/g, '');
  const telefoneComCodigo = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`;
  const url = `https://api.whatsapp.com/send/?phone=${telefoneComCodigo}&text=${encodeURIComponent(mensagem)}&type=phone_number&app_absent=0`;
  window.open(url, '_blank');
};

/**
 * Parseia uma data no formato YYYY-MM-DD como timezone local (não UTC)
 * Resolve o problema de datas sendo interpretadas com 1 dia a menos
 */
export const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

/**
 * Formata uma data Date para string YYYY-MM-DD no timezone local
 */
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const processarDataInicio = (dataInicio: any): { data: Date | string; prazoTexto?: string } => {
  if (!dataInicio) {
    return { data: new Date() };
  }

  // Verificar se é uma data válida ou texto do prazo
  const dataTest = new Date(dataInicio);
  if (!isNaN(dataTest.getTime()) && dataInicio.includes('-')) {
    // É uma data válida
    return { data: dataTest };
  } else {
    // É texto do prazo
    return { data: dataInicio, prazoTexto: dataInicio };
  }
};
