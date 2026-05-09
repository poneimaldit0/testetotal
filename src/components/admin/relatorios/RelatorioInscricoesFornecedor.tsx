
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, MapPin, FileDown } from 'lucide-react';
import { useRelatoriosAdmin, RelatorioInscricoesFornecedor as TipoRelatorioInscricoes } from '@/hooks/useRelatoriosAdmin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { StatusSelectorCompact } from '@/components/fornecedor/StatusSelectorCompact';
import { ObservacoesCompact } from '@/components/fornecedor/ObservacoesCompact';

interface Props {
  fornecedorId: string;
  fornecedorNome?: string;
  fornecedorEmpresa?: string;
  dataInicio: string;
  dataFim: string;
}

export const RelatorioInscricoesFornecedor: React.FC<Props> = ({ fornecedorId, fornecedorNome, fornecedorEmpresa, dataInicio, dataFim }) => {
  const { buscarInscricoesFornecedor, loading } = useRelatoriosAdmin();
  const [dados, setDados] = useState<TipoRelatorioInscricoes[]>([]);

  const carregarDados = useCallback(async () => {
    try {
      const resultado = await buscarInscricoesFornecedor(fornecedorId, dataInicio, dataFim);
      setDados(resultado);
    } catch (error) {
      console.error('Erro ao carregar inscrições do fornecedor:', error);
    }
  }, [fornecedorId, dataInicio, dataFim, buscarInscricoesFornecedor]);

  useEffect(() => {
    if (fornecedorId) {
      carregarDados();
    }
  }, [fornecedorId, carregarDados]);

  const exportarExcel = () => {
    const dadosExport = dados.map(item => ({
      'Código': item.codigo_orcamento || 'N/A',
      'Necessidade': item.necessidade,
      'Local': item.local,
      'Cliente': item.cliente_nome || 'N/A',
      'Email Cliente': item.cliente_email || 'N/A',
      'Telefone Cliente': item.cliente_telefone || 'N/A',
      'Tamanho (m²)': item.tamanho_imovel || 'N/A',
      'Data Inscrição': format(new Date(item.data_inscricao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Última Atualização': item.data_ultima_atualizacao ? format(new Date(item.data_ultima_atualizacao), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Sem atualização',
      'Status Orçamento': item.status_orcamento,
      'Status Acompanhamento': getStatusAcompanhamento(item.status_acompanhamento),
      'Observações': item.observacoes_acompanhamento || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscrições');
    XLSX.writeFile(wb, `inscricoes-fornecedor-${dataInicio}-${dataFim}.xlsx`);
  };

  const exportarPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Inscrições por Fornecedor', 14, 20);
      
      // Linha divisória
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 25, 196, 25);
      
      // Informações do Fornecedor
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fornecedor: ${fornecedorNome || 'N/A'}`, 14, 35);
      doc.text(`Empresa: ${fornecedorEmpresa || 'N/A'}`, 14, 42);
      doc.text(`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy')} a ${format(new Date(dataFim), 'dd/MM/yyyy')}`, 14, 49);
      
      // Resumo em destaque
      const totalInscricoes = dados.length;
      const orcamentosAbertos = dados.filter(i => i.status_orcamento === 'aberto').length;
      const orcamentosFechados = dados.filter(i => i.status_orcamento === 'fechado').length;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(14, 55, 182, 18, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO', 14, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Inscrições: ${totalInscricoes}`, 14, 69);
      doc.text(`Orçamentos Abertos: ${orcamentosAbertos}`, 80, 69);
      doc.text(`Orçamentos Fechados: ${orcamentosFechados}`, 150, 69);
      
      // Tabela de detalhamento
      const dadosTabela = dados.map(item => [
        item.codigo_orcamento?.substring(0, 8) || 'N/A',
        (item.cliente_nome || 'N/A').substring(0, 20),
        item.local.substring(0, 15),
        item.tamanho_imovel ? `${item.tamanho_imovel} m²` : 'N/A',
        format(new Date(item.data_inscricao), 'dd/MM/yyyy'),
        item.data_ultima_atualizacao ? format(new Date(item.data_ultima_atualizacao), 'dd/MM/yyyy') : 'N/A',
        item.status_orcamento === 'aberto' ? 'Aberto' : 'Fechado',
        getStatusAcompanhamento(item.status_acompanhamento).substring(0, 15)
      ]);
      
      autoTable(doc, {
        startY: 80,
        head: [['Código', 'Cliente', 'Local', 'Tamanho', 'Data', 'Últ. Atualização', 'Status', 'Acompanhamento']],
        body: dadosTabela,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { cellWidth: 20 },
          5: { cellWidth: 22 },
          6: { cellWidth: 16 },
          7: { cellWidth: 27 }
        }
      });
      
      // Rodapé com data de geração
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, finalY);
      
      const nomeArquivo = fornecedorNome?.replace(/\s/g, '-').toLowerCase() || 'fornecedor';
      doc.save(`inscricoes-${nomeArquivo}-${dataInicio}-${dataFim}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      'aberto': { color: 'bg-green-100 text-green-800', text: 'Aberto' },
      'fechado': { color: 'bg-red-100 text-red-800', text: 'Fechado' },
    };

    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.text}
      </Badge>
    );
  };

  const getStatusAcompanhamento = (status: string | null) => {
    if (!status) return 'Sem status';
    
    const statusMap: { [key: string]: string } = {
      '1_contato_realizado': '1º Contato',
      '2_contato_realizado': '2º Contato',
      '3_contato_realizado': '3º Contato',
      '4_contato_realizado': '4º Contato',
      '5_contato_realizado': '5º Contato',
      'cliente_respondeu_nao_agendou': 'Cliente Respondeu',
      'visita_agendada': 'Visita Agendada',
      'visita_realizada': 'Visita Realizada',
      'orcamento_enviado': 'Orçamento Enviado',
      'negocio_fechado': 'Negócio Fechado',
      'negocio_perdido': 'Negócio Perdido',
      'nao_respondeu_mensagens': 'Não Respondeu'
    };

    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{dados.length}</p>
                <p className="text-sm text-muted-foreground">Total de Inscrições</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">
                  {dados.filter(item => item.status_orcamento === 'aberto').length}
                </p>
                <p className="text-sm text-muted-foreground">Orçamentos Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">
                  {dados.filter(item => item.status_orcamento === 'fechado').length}
                </p>
                <p className="text-sm text-muted-foreground">Orçamentos Fechados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Detalhamento das Inscrições</CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportarPDF} variant="outline" size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={exportarExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : dados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Necessidade</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data Inscrição</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead>Status Orçamento</TableHead>
                    <TableHead>Status Acompanhamento</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">
                        {item.codigo_orcamento || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={item.necessidade}>
                        {item.necessidade}
                      </TableCell>
                      <TableCell>{item.local}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.cliente_nome || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{item.cliente_email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.cliente_telefone || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.tamanho_imovel ? `${item.tamanho_imovel} m²` : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.data_inscricao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {item.data_ultima_atualizacao 
                          ? format(new Date(item.data_ultima_atualizacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : <span className="text-muted-foreground text-sm">Sem atualização</span>
                        }
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status_orcamento)}
                      </TableCell>
                      <TableCell>
                        <StatusSelectorCompact
                          inscricaoId={item.inscricao_id}
                          statusAtual={item.status_acompanhamento}
                          onStatusChange={carregarDados}
                        />
                      </TableCell>
                      <TableCell>
                        <ObservacoesCompact
                          inscricaoId={item.inscricao_id}
                          observacoesAtuais={item.observacoes_acompanhamento}
                          onSave={carregarDados}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma inscrição encontrada para o período selecionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
