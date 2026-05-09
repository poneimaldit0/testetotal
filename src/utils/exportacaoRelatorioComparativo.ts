import * as XLSX from 'xlsx';
import type { DadosRelatorioComparativoMensal } from '@/hooks/useRelatorioComparativoMensal';

export const exportarRelatorioComparativoExcel = (dados: DadosRelatorioComparativoMensal) => {
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    return new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit'
    });
  };

  // Preparar cabeçalhos
  const mesesColunas = dados.resumoMeses.map(m => formatarMes(m.mes));
  const cabecalhos = ['Apropriação', ...mesesColunas, 'Total Período', '% Médio'];

  // Preparar linhas de dados
  const linhasDados = dados.linhasHierarquicas.map(linha => {
    const indentacao = '  '.repeat(linha.indentacao);
    const nome = `${indentacao}${linha.nome}`;
    
    const valoresMensais = linha.meses.map(mes => {
      if (mes.valor === 0) return '-';
      return formatarMoeda(Math.abs(mes.valor));
    });

    const totalPeriodo = formatarMoeda(Math.abs(linha.totalPeriodo));
    const percentualMedio = linha.percentualMedio && linha.percentualMedio > 0 
      ? `${linha.percentualMedio.toFixed(1)}%` 
      : '';

    return [nome, ...valoresMensais, totalPeriodo, percentualMedio];
  });

  // Criar planilha principal
  const dadosPlanilha = [cabecalhos, ...linhasDados];
  const ws = XLSX.utils.aoa_to_sheet(dadosPlanilha);

  // Ajustar larguras das colunas
  const colWidths = [
    { wch: 40 }, // Apropriação
    ...mesesColunas.map(() => ({ wch: 15 })), // Meses
    { wch: 18 }, // Total Período
    { wch: 10 }, // % Médio
  ];
  ws['!cols'] = colWidths;

  // Criar planilha de resumo
  const resumoData = [
    ['Resumo Executivo'],
    [''],
    ['Total Receitas', formatarMoeda(dados.totalReceitas)],
    ['Total Despesas', formatarMoeda(dados.totalDespesas)],
    ['Resultado', formatarMoeda(dados.resultadoTotal)],
    [''],
    ['Período', `${dados.periodo.inicio} a ${dados.periodo.fim}`],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  wsResumo['!cols'] = [{ wch: 20 }, { wch: 20 }];

  // Criar workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DRE Comparativo');
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Gerar nome do arquivo
  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `relatorio-comparativo-mensal-${dataAtual}.xlsx`;

  // Fazer download
  XLSX.writeFile(wb, nomeArquivo);
};
