
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CATEGORIAS_SERVICO } from '@/types';
import { PRAZOS_INICIO } from '@/constants/orcamento';
import { useOrcamento } from '@/context/OrcamentoContext';

interface OrcamentoExcel {
  necessidade: string;
  categorias: string;
  local: string;
  tamanhoImovel: number;
  prazoInicio: string;
  nomeContato: string;
  telefoneContato: string;
  emailContato: string;
}

export const ImportacaoExcel: React.FC = () => {
  const { adicionarOrcamento } = useOrcamento();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<OrcamentoExcel[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    const template = [
      {
        necessidade: 'Exemplo: Reforma completa de apartamento de 80m²',
        categorias: 'Elétrica;Hidráulica;Pintura',
        local: 'São Paulo, SP',
        tamanhoImovel: 80,
        prazoInicio: 'Em até 3 meses',
        nomeContato: 'João Silva',
        telefoneContato: '(11) 99999-9999',
        emailContato: 'joao@email.com'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orçamentos");
    XLSX.writeFile(wb, "template_orcamentos.xlsx");

    toast({
      title: "Template baixado",
      description: "Use este arquivo como modelo para importar seus orçamentos.",
    });
  };

  const processExcelFile = (file: File) => {
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as OrcamentoExcel[];

        if (jsonData.length === 0) {
          toast({
            title: "Arquivo vazio",
            description: "O arquivo Excel não contém dados válidos.",
            variant: "destructive",
          });
          return;
        }

        // Validar dados
        const validData = jsonData.filter(row => {
          return row.necessidade && row.categorias && row.local;
        });

        if (validData.length === 0) {
          toast({
            title: "Dados inválidos",
            description: "Nenhum orçamento válido encontrado. Verifique se as colunas necessidade, categorias e local estão preenchidas.",
            variant: "destructive",
          });
          return;
        }

        setPreviewData(validData);
        setShowPreview(true);

        toast({
          title: "Arquivo processado",
          description: `${validData.length} orçamentos válidos encontrados. Revise os dados antes de importar.`,
        });

      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast({
          title: "Erro no processamento",
          description: "Não foi possível processar o arquivo Excel. Verifique o formato.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls).",
        variant: "destructive",
      });
      return;
    }

    processExcelFile(file);
  };

  const importarOrcamentos = async () => {
    setIsProcessing(true);

    try {
      let sucessos = 0;
      let erros = 0;

      for (const orcamento of previewData) {
        try {
          // Processar categorias (separadas por ; ou ,)
          const categorias = orcamento.categorias
            .split(/[;,]/)
            .map(cat => cat.trim())
            .filter(cat => CATEGORIAS_SERVICO.includes(cat));

          if (categorias.length === 0) {
            console.warn('Orçamento ignorado - categorias inválidas:', orcamento);
            erros++;
            continue;
          }

          // Validar prazo de início
          const prazoValido = PRAZOS_INICIO.includes(orcamento.prazoInicio);
          if (orcamento.prazoInicio && !prazoValido) {
            console.warn('Prazo inválido para orçamento:', orcamento.prazoInicio);
          }

          await adicionarOrcamento({
            dataPublicacao: new Date(),
            necessidade: orcamento.necessidade,
            arquivos: [],
            fotos: [],
            videos: [],
            categorias,
            local: orcamento.local,
            tamanhoImovel: Number(orcamento.tamanhoImovel) || 0,
            dataInicio: new Date(), // Mantém data padrão para compatibilidade
            prazoInicioTexto: orcamento.prazoInicio, // Usar o texto do prazo
            status: 'aberto',
            dadosContato: {
              nome: orcamento.nomeContato || '',
              telefone: orcamento.telefoneContato || '',
              email: orcamento.emailContato || '',
            },
          });

          sucessos++;
        } catch (error) {
          console.error('Erro ao criar orçamento:', error);
          erros++;
        }
      }

      toast({
        title: "Importação concluída",
        description: `${sucessos} orçamentos criados com sucesso. ${erros > 0 ? `${erros} erros encontrados.` : ''}`,
      });

      // Limpar preview
      setPreviewData([]);
      setShowPreview(false);

    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Lote via Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Template Excel
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Baixe o modelo e preencha com seus dados
              </p>
            </div>

            <div>
              <Label htmlFor="excel-file">Selecionar Arquivo Excel</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-2">Formato do arquivo Excel:</p>
                <ul className="text-blue-700 space-y-1">
                  <li>• <strong>necessidade</strong>: Descrição do serviço (obrigatório)</li>
                  <li>• <strong>categorias</strong>: Categorias separadas por ; ou , (obrigatório)</li>
                  <li>• <strong>local</strong>: Localização do serviço (obrigatório)</li>
                  <li>• <strong>tamanhoImovel</strong>: Tamanho em m² (opcional)</li>
                  <li>• <strong>prazoInicio</strong>: Uma das opções: {PRAZOS_INICIO.join(', ')} (opcional)</li>
                  <li>• <strong>nomeContato, telefoneContato, emailContato</strong>: Dados do cliente (opcional)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview dos Dados ({previewData.length} orçamentos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {previewData.slice(0, 5).map((orcamento, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><strong>Necessidade:</strong> {orcamento.necessidade}</div>
                      <div><strong>Local:</strong> {orcamento.local}</div>
                      <div><strong>Categorias:</strong> {orcamento.categorias}</div>
                      <div><strong>Prazo:</strong> {orcamento.prazoInicio || 'Não informado'}</div>
                      <div><strong>Contato:</strong> {orcamento.nomeContato || 'Não informado'}</div>
                    </div>
                  </div>
                ))}
                {previewData.length > 5 && (
                  <p className="text-center text-muted-foreground">
                    ... e mais {previewData.length - 5} orçamentos
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                onClick={importarOrcamentos}
                disabled={isProcessing}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? 'Importando...' : `Importar ${previewData.length} Orçamentos`}
              </Button>
              <Button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData([]);
                }}
                variant="outline"
                disabled={isProcessing}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
