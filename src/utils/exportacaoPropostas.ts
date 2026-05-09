import * as XLSX from 'xlsx';
import { PropostaDetalhada } from '@/hooks/usePropostas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const exportarPropostaExcel = (proposta: PropostaDetalhada) => {
  try {
    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Dados gerais da proposta
    const dadosGerais = [
      ['PROPOSTA DE ORÇAMENTO'],
      [''],
      ['Dados do Orçamento:'],
      ['Código', proposta.orcamento.codigo_orcamento || 'N/A'],
      ['Necessidade', proposta.orcamento.necessidade],
      ['Local', proposta.orcamento.local],
      ['Tamanho do Imóvel', `${proposta.orcamento.tamanho_imovel || 'N/A'} m²`],
      [''],
      ['Dados do Fornecedor:'],
      ['Nome', proposta.candidatura.nome],
      ['Empresa', proposta.candidatura.empresa],
      ['Email', proposta.candidatura.email],
      ['Telefone', proposta.candidatura.telefone],
      [''],
      ['Dados da Proposta:'],
      ['Valor Total Estimado', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_total_estimado)],
      ['Forma de Pagamento', (() => {
        if (!proposta.forma_pagamento) return 'Não informado';
        if (typeof proposta.forma_pagamento === 'string') return proposta.forma_pagamento;
        
        const formaPagamento = proposta.forma_pagamento as any;
        switch (formaPagamento.tipo) {
          case 'a_vista':
            return `À Vista com ${formaPagamento.desconto_percentual}% de desconto`;
          case 'entrada_medicoes':
            return `Entrada de ${formaPagamento.entrada_percentual}% + Medições ${formaPagamento.medicoes_frequencia}`;
          case 'medicoes':
            return `Medições ${formaPagamento.medicoes_frequencia}`;
          case 'boletos':
            return `${formaPagamento.boletos_quantidade} boletos`;
          case 'cartao':
            return `Cartão em ${formaPagamento.cartao_parcelas}x`;
          case 'personalizado':
            return formaPagamento.texto_personalizado || 'Personalizado';
          default:
            return 'Não especificado';
        }
      })()],
      ['Status', proposta.status],
      ['Data da Proposta', format(new Date(proposta.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })],
      [''],
      ['DETALHAMENTO POR CATEGORIA:'],
      ['']
    ];

    // Agrupar respostas por categoria
    const respostasPorCategoria = proposta.respostas.reduce((acc, resposta) => {
      const categoria = resposta.item.categoria;
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(resposta);
      return acc;
    }, {} as Record<string, typeof proposta.respostas>);

    // Adicionar dados por categoria
    let totalGeral = 0;
    Object.entries(respostasPorCategoria).forEach(([categoria, respostas]) => {
      // Calcular total da categoria
      const totalCategoria = respostas
        .filter(r => r.incluido)
        .reduce((sum, r) => sum + (r.valor_estimado || 0), 0);
      
      totalGeral += totalCategoria;

      dadosGerais.push([`CATEGORIA: ${categoria.toUpperCase()}`]);
      dadosGerais.push(['Item', 'Incluído', 'Valor Estimado', 'Ambientes', 'Observações']);
      
      // Ordenar por ordem do item
      respostas.sort((a, b) => a.item.ordem - b.item.ordem);
      
      respostas.forEach(resposta => {
        dadosGerais.push([
          resposta.item.nome,
          resposta.incluido ? 'SIM' : 'NÃO',
          resposta.incluido ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resposta.valor_estimado || 0) : '-',
          resposta.incluido && resposta.ambientes?.length > 0 ? resposta.ambientes.join(', ') : '-',
          resposta.observacoes || '-'
        ]);
      });
      
      dadosGerais.push([
        '',
        '',
        `SUBTOTAL ${categoria}:`,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCategoria),
        ''
      ]);
      dadosGerais.push(['']);
    });

    // Total geral
    dadosGerais.push([
      '',
      '',
      'VALOR TOTAL GERAL:',
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral),
      ''
    ]);

    if (proposta.observacoes) {
      dadosGerais.push(['']);
      dadosGerais.push(['Observações Gerais:']);
      dadosGerais.push([proposta.observacoes]);
    }

    // Criar planilha principal
    const ws = XLSX.utils.aoa_to_sheet(dadosGerais);

    // Estilizar a planilha
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // Coluna A - Item/Label
      { wch: 15 }, // Coluna B - Incluído/Valor
      { wch: 20 }, // Coluna C - Valor/Label
      { wch: 25 }, // Coluna D - Ambientes/Valor
      { wch: 40 }  // Coluna E - Observações
    ];

    // Adicionar planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Proposta');

    // Criar planilha resumo financeiro
    const resumoFinanceiro = [
      ['RESUMO FINANCEIRO POR CATEGORIA'],
      [''],
      ['Categoria', 'Valor']
    ];

    Object.entries(respostasPorCategoria).forEach(([categoria, respostas]) => {
      const totalCategoria = respostas
        .filter(r => r.incluido)
        .reduce((sum, r) => sum + (r.valor_estimado || 0), 0);
      
      if (totalCategoria > 0) {
        resumoFinanceiro.push([
          categoria,
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCategoria)
        ]);
      }
    });

    resumoFinanceiro.push(['']);
    resumoFinanceiro.push([
      'TOTAL GERAL',
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGeral)
    ]);

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoFinanceiro);
    wsResumo['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Financeiro');

    // Gerar nome do arquivo
    const nomeArquivo = `Proposta_${proposta.candidatura.empresa}_${proposta.orcamento.codigo_orcamento || proposta.candidatura.orcamento_id.slice(0, 8)}_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`;

    // Baixar arquivo
    XLSX.writeFile(wb, nomeArquivo);

    return true;
  } catch (error) {
    console.error('Erro ao exportar proposta:', error);
    return false;
  }
};

export const exportarListaPropostas = (propostas: any[]) => {
  try {
    const wb = XLSX.utils.book_new();

    const dadosLista = [
      ['LISTA DE PROPOSTAS'],
      [''],
      ['Orçamento', 'Fornecedor', 'Empresa', 'Valor Total', 'Status', 'Data da Proposta']
    ];

    propostas.forEach(proposta => {
      dadosLista.push([
        proposta.orcamento?.codigo_orcamento || proposta.candidatura?.orcamento_id?.slice(0, 8) || 'N/A',
        proposta.candidatura?.nome || 'N/A',
        proposta.candidatura?.empresa || 'N/A',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposta.valor_total_estimado || 0),
        proposta.status || 'N/A',
        format(new Date(proposta.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(dadosLista);
    ws['!cols'] = [
      { wch: 20 }, // Orçamento
      { wch: 25 }, // Fornecedor
      { wch: 30 }, // Empresa
      { wch: 20 }, // Valor
      { wch: 15 }, // Status
      { wch: 20 }  // Data
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Propostas');

    const nomeArquivo = `Lista_Propostas_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);

    return true;
  } catch (error) {
    console.error('Erro ao exportar lista de propostas:', error);
    return false;
  }
};