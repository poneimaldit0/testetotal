import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MovimentacaoBancaria, ContaBancaria } from '@/types/financeiro';

interface DadosExportacao {
  movimentacoes: MovimentacaoBancaria[];
  conta: ContaBancaria;
  periodo: {
    dataInicio?: string;
    dataFim?: string;
  };
  totais: {
    totalDebitos: number;
    totalCreditos: number;
    saldo: number;
    totalConciliado: number;
    totalPendente: number;
  };
}

export const exportarConciliacaoBancariaExcel = (dados: DadosExportacao) => {
  try {
    const wb = XLSX.utils.book_new();

    // Seção 1: Cabeçalho e informações do período
    const cabecalho = [
      ['RELATÓRIO DE CONCILIAÇÃO BANCÁRIA'],
      [''],
      ['Conta Bancária:', `${dados.conta.nome} - ${dados.conta.banco}`],
      ['Agência/Conta:', `${dados.conta.agencia || 'N/A'} / ${dados.conta.conta}`],
      ['Período:', dados.periodo.dataInicio && dados.periodo.dataFim
        ? `${format(parseISO(dados.periodo.dataInicio + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })} a ${format(parseISO(dados.periodo.dataFim + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}`
        : 'Todas as datas'
      ],
      ['Data de Geração:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })],
      ['Total de Transações:', dados.movimentacoes.length],
      [''],
      ['RESUMO FINANCEIRO:'],
      ['Total de Débitos:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.totais.totalDebitos)],
      ['Total de Créditos:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.totais.totalCreditos)],
      ['Saldo Líquido:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.totais.saldo)],
      [''],
      ['Transações Conciliadas:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.totais.totalConciliado)],
      ['Transações Pendentes:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.totais.totalPendente)],
      [''],
      [''],
      ['DETALHAMENTO DAS TRANSAÇÕES:'],
      ['']
    ];

    // Seção 2: Cabeçalhos das colunas
    const headers = [
      'Data',
      'Descrição',
      'Tipo',
      'Cliente/Fornecedor',
      'Email',
      'Categoria',
      'Subcategoria',
      'Débito (R$)',
      'Crédito (R$)',
      'Status',
      'Conciliado'
    ];

    // Seção 3: Dados das transações
    const dadosTransacoes = dados.movimentacoes.map(mov => {
      let dataFormatada = '';
      try {
        dataFormatada = mov.data_movimentacao 
          ? format(parseISO(mov.data_movimentacao + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
          : '';
      } catch (error) {
        console.error('Erro ao formatar data da movimentação:', mov.data_movimentacao, error);
        dataFormatada = mov.data_movimentacao || '';
      }
      
      return [
        dataFormatada,
        mov.descricao || '',
        mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
        mov.pessoa_nome || '-',
        mov.pessoa_email || '-',
        mov.categoria_nome || '-',
        mov.subcategoria_nome || '-',
        mov.tipo === 'saida' ? mov.valor : 0,
        mov.tipo === 'entrada' ? mov.valor : 0,
        mov.conciliado ? 'Conciliado' : 'Pendente',
        mov.conciliado ? 'SIM' : 'NÃO'
      ];
    });

    // Combinar tudo
    const todosOsDados = [
      ...cabecalho,
      headers,
      ...dadosTransacoes
    ];

    // Criar planilha
    const ws = XLSX.utils.aoa_to_sheet(todosOsDados);

    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 12 },  // Data
      { wch: 35 },  // Descrição
      { wch: 10 },  // Tipo
      { wch: 25 },  // Cliente/Fornecedor
      { wch: 30 },  // Email
      { wch: 20 },  // Categoria
      { wch: 20 },  // Subcategoria
      { wch: 15 },  // Débito
      { wch: 15 },  // Crédito
      { wch: 12 },  // Status
      { wch: 10 }   // Conciliado
    ];

    // Adicionar planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Conciliação Bancária');

    // Gerar nome do arquivo
    const dataAtual = format(new Date(), 'ddMMyyyy_HHmm');
    const contaNome = dados.conta.nome.replace(/[^a-zA-Z0-9]/g, '_');
    const nomeArquivo = `Conciliacao_${contaNome}_${dataAtual}.xlsx`;

    // Baixar arquivo
    XLSX.writeFile(wb, nomeArquivo);

    return true;
  } catch (error) {
    console.error('Erro ao exportar conciliação bancária:', error);
    return false;
  }
};
