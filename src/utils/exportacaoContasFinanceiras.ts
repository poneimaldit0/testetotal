import * as XLSX from 'xlsx';
import type { ContaReceber, ContaPagar, ContaVencimento } from '@/types/financeiro';
import { formatarDataParaExibicao } from '@/utils/dateUtils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const getStatusLabel = (status: string, tipo: 'receber' | 'pagar', dataVencimento?: string) => {
  const hoje = new Date().toISOString().split('T')[0];
  const vencida = status === 'pendente' && dataVencimento && dataVencimento < hoje;
  
  if (vencida) return 'Vencida';
  
  if (tipo === 'receber') {
    switch (status) {
      case 'recebido': return 'Recebido';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelado';
      case 'perda': return 'Perda';
      default: return status;
    }
  } else {
    switch (status) {
      case 'pago': return 'Pago';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  }
};

export const exportarContasReceberExcel = (contas: ContaReceber[]) => {
  const dados = contas.map(conta => ({
    'Descrição': conta.descricao,
    'Cliente': conta.cliente_nome,
    'Valor Original': formatCurrency(conta.valor_original),
    'Valor Recebido': formatCurrency(conta.valor_recebido),
    'Valor Pendente': formatCurrency(conta.valor_original - conta.valor_recebido),
    'Vencimento': formatarDataParaExibicao(conta.data_vencimento),
    'Status': getStatusLabel(conta.status, 'receber', conta.data_vencimento),
    'Categoria': conta.categoria?.nome || '',
    'Subcategoria': conta.subcategoria?.nome || '',
    'Observações': conta.observacoes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contas a Receber');

  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 30 }, // Descrição
    { wch: 25 }, // Cliente
    { wch: 15 }, // Valor Original
    { wch: 15 }, // Valor Recebido
    { wch: 15 }, // Valor Pendente
    { wch: 12 }, // Vencimento
    { wch: 12 }, // Status
    { wch: 20 }, // Categoria
    { wch: 20 }, // Subcategoria
    { wch: 40 }, // Observações
  ];

  const dataAtual = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `contas_receber_${dataAtual}.xlsx`);
};

export const exportarContasPagarExcel = (contas: ContaPagar[]) => {
  const dados = contas.map(conta => ({
    'Descrição': conta.descricao,
    'Fornecedor': conta.fornecedor_nome,
    'Valor Original': formatCurrency(conta.valor_original),
    'Valor Pago': formatCurrency(conta.valor_pago),
    'Valor Pendente': formatCurrency(conta.valor_original - conta.valor_pago),
    'Vencimento': formatarDataParaExibicao(conta.data_vencimento),
    'Status': getStatusLabel(conta.status, 'pagar', conta.data_vencimento),
    'Categoria': conta.categoria?.nome || '',
    'Subcategoria': conta.subcategoria?.nome || '',
    'Observações': conta.observacoes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contas a Pagar');

  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 30 }, // Descrição
    { wch: 25 }, // Fornecedor
    { wch: 15 }, // Valor Original
    { wch: 15 }, // Valor Pago
    { wch: 15 }, // Valor Pendente
    { wch: 12 }, // Vencimento
    { wch: 12 }, // Status
    { wch: 20 }, // Categoria
    { wch: 20 }, // Subcategoria
    { wch: 40 }, // Observações
  ];

  const dataAtual = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `contas_pagar_${dataAtual}.xlsx`);
};

const getTituloExportacao = (tipo: string) => {
  switch (tipo) {
    case 'hoje': return 'Contas que vencem hoje';
    case 'amanha': return 'Contas que vencem amanhã';
    case 'proximos7Dias': return 'Contas próximos 7 dias';
    case 'vencidas': return 'Contas vencidas';
    default: return 'Contas';
  }
};

export const exportarContasVencimentoExcel = (
  contas: ContaVencimento[], 
  tipo: 'hoje' | 'amanha' | 'proximos7Dias' | 'vencidas'
) => {
  const contasReceber = contas.filter(c => c.tipo === 'conta_receber');
  const contasPagar = contas.filter(c => c.tipo === 'conta_pagar');
  
  const totalReceber = contasReceber.reduce((sum, c) => sum + c.valor_pendente, 0);
  const totalPagar = contasPagar.reduce((sum, c) => sum + c.valor_pendente, 0);

  const wb = XLSX.utils.book_new();

  // Aba Resumo
  const resumo = [
    { 'Métrica': 'Período', 'Valor': getTituloExportacao(tipo) },
    { 'Métrica': 'Data de Exportação', 'Valor': formatarDataParaExibicao(new Date().toISOString().split('T')[0]) },
    { 'Métrica': 'Total de Contas', 'Valor': contas.length.toString() },
    { 'Métrica': 'Contas a Receber', 'Valor': contasReceber.length.toString() },
    { 'Métrica': 'Contas a Pagar', 'Valor': contasPagar.length.toString() },
    { 'Métrica': 'Total a Receber', 'Valor': formatCurrency(totalReceber) },
    { 'Métrica': 'Total a Pagar', 'Valor': formatCurrency(totalPagar) },
    { 'Métrica': 'Saldo', 'Valor': formatCurrency(totalReceber - totalPagar) },
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumo);
  wsResumo['!cols'] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Aba Contas a Receber
  if (contasReceber.length > 0) {
    const dadosReceber = contasReceber.map(conta => ({
      'Descrição': conta.descricao,
      'Cliente/Fornecedor': conta.cliente_fornecedor,
      'Valor Pendente': formatCurrency(conta.valor_pendente),
      'Vencimento': formatarDataParaExibicao(conta.data_vencimento),
      'Status': conta.status === 'vencido' ? 'Vencida' : 'Pendente'
    }));
    const wsReceber = XLSX.utils.json_to_sheet(dadosReceber);
    wsReceber['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsReceber, 'Contas a Receber');
  }

  // Aba Contas a Pagar
  if (contasPagar.length > 0) {
    const dadosPagar = contasPagar.map(conta => ({
      'Descrição': conta.descricao,
      'Cliente/Fornecedor': conta.cliente_fornecedor,
      'Valor Pendente': formatCurrency(conta.valor_pendente),
      'Vencimento': formatarDataParaExibicao(conta.data_vencimento),
      'Status': conta.status === 'vencido' ? 'Vencida' : 'Pendente'
    }));
    const wsPagar = XLSX.utils.json_to_sheet(dadosPagar);
    wsPagar['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPagar, 'Contas a Pagar');
  }

  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = tipo === 'vencidas' ? 'contas_vencidas' : `contas_${tipo}`;
  XLSX.writeFile(wb, `${nomeArquivo}_${dataAtual}.xlsx`);
};
