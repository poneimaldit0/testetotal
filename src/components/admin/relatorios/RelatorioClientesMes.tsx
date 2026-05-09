import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, FileSpreadsheet, Users, Calendar, MapPin, EyeOff, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { type RelatorioClientesMes as IRelatorioClientesMes, type FornecedorInscrito } from '@/hooks/useRelatoriosAdmin';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RelatorioClientesMesProps {
  dados: IRelatorioClientesMes[];
  filtrosAplicados: boolean;
  loading: boolean;
  dataInicio: string;
  dataFim: string;
}

const STATUS_COLORS = {
  'aberto': 'bg-green-100 text-green-800',
  'fechado': 'bg-gray-100 text-gray-800',
} as const;

const ACOMPANHAMENTO_COLORS = {
  '1_contato_realizado': 'bg-blue-100 text-blue-800',
  '2_contato_realizado': 'bg-blue-100 text-blue-800',
  '3_contato_realizado': 'bg-blue-100 text-blue-800',
  '4_contato_realizado': 'bg-blue-100 text-blue-800',
  '5_contato_realizado': 'bg-blue-100 text-blue-800',
  'cliente_respondeu_nao_agendou': 'bg-yellow-100 text-yellow-800',
  'visita_agendada': 'bg-purple-100 text-purple-800',
  'visita_realizada': 'bg-indigo-100 text-indigo-800',
  'orcamento_enviado': 'bg-orange-100 text-orange-800',
  'negocio_fechado': 'bg-green-100 text-green-800',
  'negocio_perdido': 'bg-red-100 text-red-800',
  'nao_respondeu_mensagens': 'bg-gray-100 text-gray-800',
} as const;

export const RelatorioClientesMes: React.FC<RelatorioClientesMesProps> = ({
  dados,
  filtrosAplicados,
  loading,
  dataInicio,
  dataFim
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [ocultarInformacoes, setOcultarInformacoes] = useState(false);

  const toggleRow = (orcamentoId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orcamentoId)) {
      newExpanded.delete(orcamentoId);
    } else {
      newExpanded.add(orcamentoId);
    }
    setExpandedRows(newExpanded);
  };

  const exportarExcel = () => {
    try {
      // Planilha principal com dados dos clientes
      const dadosClientes = dados.map(item => ({
        'ID Orçamento': item.orcamento_id,
        'Código': item.codigo_orcamento || 'Sem código',
        'Data Publicação': format(new Date(item.data_publicacao), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Cliente Nome': ocultarInformacoes ? '*** Informação Oculta ***' : (item.cliente_nome || 'Não informado'),
        'Cliente Email': ocultarInformacoes ? '*** Email Oculto ***' : (item.cliente_email || 'Não informado'),
        'Cliente Telefone': ocultarInformacoes ? '*** Telefone Oculto ***' : (item.cliente_telefone || 'Não informado'),
        'Necessidade': item.necessidade,
        'Local': item.local,
        'Categorias': item.categorias.join(', '),
        'Tamanho Imóvel': item.tamanho_imovel || 'Não informado',
        'Status': item.status_orcamento,
        'Gestor de Conta': item.gestor_conta_nome || 'Não atribuído',
        'Total Fornecedores': item.total_fornecedores_inscritos
      }));

      // Planilha com detalhes dos fornecedores
      const dadosFornecedores: any[] = [];
      dados.forEach(item => {
        item.fornecedores_inscritos.forEach(fornecedor => {
          dadosFornecedores.push({
            'ID Orçamento': item.orcamento_id,
            'Código Orçamento': item.codigo_orcamento || 'Sem código',
            'Cliente': ocultarInformacoes ? '*** Informação Oculta ***' : (item.cliente_nome || 'Não informado'),
            'Fornecedor Nome': fornecedor.nome,
            'Fornecedor Email': ocultarInformacoes ? '*** Email Oculto ***' : fornecedor.email,
            'Fornecedor Telefone': fornecedor.telefone,
            'Empresa': fornecedor.empresa,
            'Data Candidatura': format(new Date(fornecedor.data_candidatura), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
            'Status Acompanhamento': fornecedor.status_acompanhamento || 'Não definido'
          });
        });
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();
      
      // Adicionar planilhas
      const wsClientes = XLSX.utils.json_to_sheet(dadosClientes);
      const wsFornecedores = XLSX.utils.json_to_sheet(dadosFornecedores);
      
      XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes');
      XLSX.utils.book_append_sheet(wb, wsFornecedores, 'Fornecedores');

      // Gerar nome do arquivo
      const nomeArquivo = `relatorio-clientes-${format(new Date(dataInicio), 'dd-MM-yyyy')}-${format(new Date(dataFim), 'dd-MM-yyyy')}.xlsx`;
      
      // Download
      XLSX.writeFile(wb, nomeArquivo);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const exportarPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Configurações
      doc.setFontSize(20);
      doc.text('Relatório de Clientes Postados no Mês', 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`, 14, 32);
      doc.text(`Total de clientes: ${dados.length}`, 14, 40);

      // Preparar dados para tabela principal
      const dadosTabela = dados.map(item => [
        item.codigo_orcamento || 'Sem código',
        format(new Date(item.data_publicacao), 'dd/MM/yyyy', { locale: ptBR }),
        ocultarInformacoes ? '*** Oculto ***' : (item.cliente_nome || 'Não informado'),
        ocultarInformacoes ? '*** Oculto ***' : (item.cliente_email || 'Não informado'),
        item.necessidade.length > 50 ? item.necessidade.substring(0, 50) + '...' : item.necessidade,
        item.local,
        item.status_orcamento,
        item.total_fornecedores_inscritos.toString(),
        item.gestor_conta_nome || 'Não atribuído'
      ]);

      // Adicionar tabela principal
      autoTable(doc, {
        startY: 50,
        head: [['Código', 'Data', 'Cliente', 'Email', 'Necessidade', 'Local', 'Status', 'Fornecedores', 'Gestor']],
        body: dadosTabela,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          2: { cellWidth: 'auto' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 'wrap' }
        },
        margin: { top: 50 }
      });

      // Se houver fornecedores, adicionar nova página
      const fornecedoresData = dados.filter(item => item.fornecedores_inscritos.length > 0);
      
      if (fornecedoresData.length > 0) {
        doc.addPage();
        
        doc.setFontSize(16);
        doc.text('Detalhes dos Fornecedores Inscritos', 14, 22);
        
        const dadosFornecedores = [];
        fornecedoresData.forEach(item => {
          item.fornecedores_inscritos.forEach(fornecedor => {
            dadosFornecedores.push([
              item.codigo_orcamento || 'Sem código',
              ocultarInformacoes ? '*** Oculto ***' : (item.cliente_nome || 'Não informado'),
              fornecedor.nome,
              fornecedor.empresa || 'Não informado',
              ocultarInformacoes ? '*** Oculto ***' : fornecedor.email,
              format(new Date(fornecedor.data_candidatura), 'dd/MM/yyyy', { locale: ptBR }),
              fornecedor.status_acompanhamento?.replace(/_/g, ' ') || 'Não definido'
            ]);
          });
        });

        autoTable(doc, {
          startY: 35,
          head: [['Código Orçamento', 'Cliente', 'Fornecedor', 'Empresa', 'Email', 'Data Candidatura', 'Status']],
          body: dadosFornecedores,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] },
          margin: { top: 35 }
        });
      }

      // Gerar nome do arquivo
      const nomeArquivo = `relatorio-clientes-${format(new Date(dataInicio), 'dd-MM-yyyy')}-${format(new Date(dataFim), 'dd-MM-yyyy')}.pdf`;
      
      // Download
      doc.save(nomeArquivo);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório PDF');
    }
  };

  if (!filtrosAplicados) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Relatório de Clientes Postados no Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Selecione um período e clique em "Aplicar Filtros" para visualizar o relatório de clientes.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Relatório de Clientes Postados no Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Carregando relatório...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Relatório de Clientes Postados no Mês
            <Badge variant="secondary" className="ml-2">
              {dados.length} cliente{dados.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {dados.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={exportarExcel} variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              <Button onClick={exportarPDF} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum cliente encontrado para o período selecionado.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2 mb-4">
              <Label htmlFor="ocultar-info" className="text-sm flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Ocultar informações do cliente
              </Label>
              <Switch
                id="ocultar-info"
                checked={ocultarInformacoes}
                onCheckedChange={setOcultarInformacoes}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fornecedores</TableHead>
                  <TableHead>Gestor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item) => (
                  <React.Fragment key={item.orcamento_id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(item.orcamento_id)}>
                      <TableCell>
                        {expandedRows.has(item.orcamento_id) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {ocultarInformacoes ? '*** Informação Oculta ***' : (item.cliente_nome || 'Não informado')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ocultarInformacoes ? '*** Email Oculto ***' : item.cliente_email}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ocultarInformacoes ? '*** Telefone Oculto ***' : item.cliente_telefone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">{item.codigo_orcamento || 'Sem código'}</div>
                          <div className="text-sm">{item.necessidade}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {item.local}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.data_publicacao), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={STATUS_COLORS[item.status_orcamento as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}
                        >
                          {item.status_orcamento}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.total_fornecedores_inscritos} inscrito{item.total_fornecedores_inscritos !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {item.gestor_conta_nome || 'Não atribuído'}
                        </span>
                      </TableCell>
                    </TableRow>
                    
                    {expandedRows.has(item.orcamento_id) && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2">Detalhes do Orçamento</h4>
                                <div className="space-y-1 text-sm">
                                  <div><strong>Categorias:</strong> {item.categorias.join(', ')}</div>
                                  {item.tamanho_imovel && (
                                    <div><strong>Tamanho:</strong> {item.tamanho_imovel}m²</div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-medium mb-2">Fornecedores Inscritos ({item.total_fornecedores_inscritos})</h4>
                                {item.fornecedores_inscritos.length > 0 ? (
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {item.fornecedores_inscritos.map((fornecedor) => (
                                      <div key={fornecedor.id} className="p-2 bg-background rounded border">
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="font-medium text-sm">{fornecedor.nome}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {format(new Date(fornecedor.data_candidatura), 'dd/MM HH:mm', { locale: ptBR })}
                                          </div>
                                        </div>
                                         <div className="text-sm text-muted-foreground">{fornecedor.empresa}</div>
                                         <div className="text-sm text-muted-foreground">
                                           {ocultarInformacoes ? '*** Email Oculto ***' : fornecedor.email}
                                         </div>
                                        {fornecedor.status_acompanhamento && (
                                          <Badge 
                                            variant="secondary" 
                                            className={`mt-1 ${ACOMPANHAMENTO_COLORS[fornecedor.status_acompanhamento as keyof typeof ACOMPANHAMENTO_COLORS] || 'bg-gray-100 text-gray-800'}`}
                                          >
                                            {fornecedor.status_acompanhamento.replace(/_/g, ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Nenhum fornecedor inscrito ainda.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};