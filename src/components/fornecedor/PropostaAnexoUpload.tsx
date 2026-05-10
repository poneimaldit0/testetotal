import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Download, CheckCircle, Loader2 } from 'lucide-react';
import { usePropostasArquivos } from '@/hooks/usePropostasArquivos';
import { useAnalisePropostaIA } from '@/hooks/useAnalisePropostaIA';
import { PropostaProcessando } from './PropostaProcessando';
import { AnalisePropostaCard, AnaliseFallbackCard, type EstadoFallback } from './AnalisePropostaCard';
import { PropostaIncompletaCard } from './PropostaIncompletaCard';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PropostaAnexoUploadProps {
  candidaturaId: string;
  orcamentoId: string;
  readonly?: boolean;
  hideAnalise?: boolean;
}

export const PropostaAnexoUpload: React.FC<PropostaAnexoUploadProps> = ({
  candidaturaId,
  orcamentoId,
  readonly = false,
  hideAnalise = false,
}) => {
  const {
    arquivos,
    loading,
    uploading,
    uploadArquivo,
    removerArquivo,
    downloadArquivo,
    temProposta,
  } = usePropostasArquivos(candidaturaId, orcamentoId);

  const { analise, statusAnalise, solicitarAnalise, resetAnalise } = useAnalisePropostaIA(candidaturaId);

  // Quando todos os arquivos são removidos, limpa o estado de análise imediatamente
  useEffect(() => {
    if (arquivos.length === 0) {
      resetAnalise();
    }
  }, [arquivos.length, resetAnalise]);
  const { toast } = useToast();

  const LIMITE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const arquivoId = await uploadArquivo(file);
      if (arquivoId) {
        await solicitarAnalise(arquivoId);
      }
    }
  }, [uploadArquivo, solicitarAnalise]);

  const onDropRejected = useCallback(() => {
    toast({
      title: "Arquivo não aceito",
      description: "Formato não suportado ou arquivo excede 10MB. Envie PDF, JPEG ou PNG.",
      variant: "destructive",
    });
  }, [toast]);

  const { getInputProps, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: LIMITE_UPLOAD_BYTES,
    disabled: readonly || uploading,
    noClick: true,
    noKeyboard: true,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.includes('pdf')) return '📄';
    if (tipo.includes('word') || tipo.includes('document')) return '📝';
    if (tipo.includes('image')) return '🖼️';
    return '📎';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isProcessing = statusAnalise === 'processing' || uploading;

  const LIMITE_ANALISE_BYTES = 10 * 1024 * 1024;
  const maxTamanho = arquivos.length > 0 ? Math.max(...arquivos.map((a) => a.tamanho)) : 0;
  const temArquivoGrande = maxTamanho > LIMITE_ANALISE_BYTES;

  const analiseTemDados = analise != null && analise.valor_proposta != null;

  // Proposta sem valor total: análise bloqueada, não entra na compatibilização.
  // Detecta tanto status='invalid' (novo) quanto failed+proposta_incompleta (legado).
  const bloquearCompat =
    temProposta && (
      statusAnalise === 'invalid' ||
      (statusAnalise === 'failed' && analise?.qualidade_leitura === 'proposta_incompleta')
    );

  function resolverEstadoFallback(): EstadoFallback {
    if (statusAnalise === 'failed' && temArquivoGrande) return 'arquivo_grande';
    if (statusAnalise === 'failed') return 'falha';
    if (statusAnalise === 'completed' && !analiseTemDados) return 'sem_dados';
    return 'aguardando';
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-4">
        {/* Header com status */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Proposta
          </h4>
          {temProposta && (
            <Badge className="bg-green-500 hover:bg-green-600 text-white">
              <CheckCircle className="h-3 w-3 mr-1" />
              Enviada
            </Badge>
          )}
        </div>

        {/* ESTADO 2: Processando upload (nunca baseado em statusAnalise quando não há arquivo) */}
        {uploading && !temProposta && <PropostaProcessando />}

        {/* Lista de arquivos */}
        {arquivos.length > 0 && (
          <div className="space-y-2">
            {arquivos.map((arquivo) => (
              <div
                key={arquivo.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl">{getFileIcon(arquivo.tipo_arquivo)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{arquivo.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(arquivo.tamanho)} • {format(new Date(arquivo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadArquivo(arquivo)}
                    title="Baixar arquivo"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerArquivo(arquivo)}
                      className="text-destructive hover:text-destructive"
                      title="Remover arquivo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Análise IA — visível apenas para admin/consultor, nunca para fornecedor */}
        {!hideAnalise && (
          <>
            {temProposta && statusAnalise === 'processing' && <PropostaProcessando />}

            {bloquearCompat && (
              <PropostaIncompletaCard titulo="Proposta sem valor total. Não é possível analisar." />
            )}

            {temProposta && statusAnalise === 'completed' && analise?.qualidade_leitura === 'proposta_incompleta' && (
              <PropostaIncompletaCard />
            )}

            {temProposta && statusAnalise === 'completed' && analise?.qualidade_leitura !== 'proposta_incompleta' && analiseTemDados && analise && (
              <AnalisePropostaCard analise={analise} />
            )}

            {temProposta && !isProcessing && !bloquearCompat && (
              statusAnalise === 'idle' ||
              statusAnalise === 'failed' ||
              (statusAnalise === 'completed' && !analiseTemDados)
            ) && (
              <AnaliseFallbackCard
                estado={resolverEstadoFallback()}
                tamanhoBytes={temArquivoGrande ? maxTamanho : null}
              />
            )}
          </>
        )}

        {/* ESTADO 1: Botão para upload — visível sempre que não há upload em andamento e não é readonly */}
        {!readonly && !uploading && (
          <div className="flex items-center gap-3">
            <input {...getInputProps()} id="proposta-upload" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={open}
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Anexar Proposta
            </Button>
            <span className="text-xs text-muted-foreground">
              PDF, JPEG ou PNG (máx. 10MB)
            </span>
          </div>
        )}

        {/* Mensagem quando não há arquivos */}
        {arquivos.length === 0 && readonly && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Nenhuma proposta anexada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
