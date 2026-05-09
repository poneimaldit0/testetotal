/**
 * Formata uma data para string no formato YYYY-MM-DD preservando a data local
 * sem conversão para UTC, evitando problemas de fuso horário
 */
export const formatarDataLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Cria uma nova data baseada em uma data existente e adiciona 
 * um número de dias preservando a data local
 */
export const adicionarDias = (data: Date, dias: number): Date => {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
};

/**
 * Cria uma nova data baseada em uma data existente e adiciona 
 * um número de meses preservando a data local
 */
export const adicionarMeses = (data: Date, meses: number): Date => {
  const novaData = new Date(data);
  novaData.setMonth(novaData.getMonth() + meses);
  return novaData;
};

/**
 * Cria uma nova data baseada em uma data existente e adiciona 
 * um número de anos preservando a data local
 */
export const adicionarAnos = (data: Date, anos: number): Date => {
  const novaData = new Date(data);
  novaData.setFullYear(novaData.getFullYear() + anos);
  return novaData;
};

/**
 * Cria uma data local a partir de uma string YYYY-MM-DD
 * sem conversão para UTC, evitando problemas de fuso horário
 */
export const criarDataLocal = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // Dividir a string de data para evitar conversão UTC
  const [ano, mes, dia] = dateString.split('-');
  
  // Criar data diretamente com os valores locais
  return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
};

/**
 * Formata uma string de data (YYYY-MM-DD) para exibição (DD/MM/YYYY)
 * sem conversão para UTC, evitando problemas de fuso horário
 */
export const formatarDataParaExibicao = (dateString: string): string => {
  if (!dateString) return '';
  
  // Dividir a string de data para evitar conversão UTC
  const [ano, mes, dia] = dateString.split('-');
  
  // Criar data diretamente com os valores locais
  const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  
  return data.toLocaleDateString('pt-BR');
};