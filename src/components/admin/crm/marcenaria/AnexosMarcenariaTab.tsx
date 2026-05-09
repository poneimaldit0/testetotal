import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Image, Video, Download, Eye, Trash2, 
  Upload, Loader2, FileUp 
} from 'lucide-react';
import { useAnexosMarcenaria } from '@/hooks/useAnexosMarcenaria';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AnexosMarcenariaTabProps {
  leadId: string;
}

export function AnexosMarcenariaTab({ leadId }: AnexosMarcenariaTabProps) {
  const { profile } = useAuth();
  const { 
    anexos, 
    isLoading, 
    uploadArquivo, 
    isUploading,
    deletarAnexo,
    isDeletando
  } = useAnexosMarcenaria(leadId);
  
  const [anexoParaDeletar, setAnexoParaDeletar] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Permissões
  const podeAdicionar = ['master', 'admin', 'gestor_marcenaria', 'consultor_marcenaria', 'customer_success']
    .includes(profile?.tipo_usuario || '');
  
  const podeDeletar = ['master', 'admin', 'gestor_marcenaria', 'customer_success']
    .includes(profile?.tipo_usuario || '');
  
  // Separar por categoria
  const documentos = anexos.filter(a => a.categoria === 'documento');
  const imagens = anexos.filter(a => a.categoria === 'imagem');
  const videos = anexos.filter(a => a.categoria === 'video');
  
  const formatarTamanho = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        // Validar tamanho (20MB para documentos/imagens, 100MB para vídeos)
        const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`${file.name} excede o tamanho máximo permitido`);
          return;
        }
        uploadArquivo(file);
      });
    }
    e.target.value = ''; // Reset input
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`${file.name} excede o tamanho máximo permitido`);
          return;
        }
        uploadArquivo(file);
      });
    }
  };
  
  const handleDownload = (url: string, nome: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleVisualizacao = (url: string) => {
    window.open(url, '_blank');
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando anexos...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      {podeAdicionar && (
        <Card className="p-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
              disabled={isUploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {isUploading ? (
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              ) : (
                <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {isUploading 
                  ? 'Enviando arquivo...' 
                  : isDragging 
                    ? 'Solte os arquivos aqui...' 
                    : 'Clique ou arraste arquivos para fazer upload'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Imagens, vídeos, PDF, DOC, XLS (até 20MB para docs, 100MB para vídeos)
              </p>
            </label>
          </div>
        </Card>
      )}
      
      {/* Lista de Anexos */}
      {anexos.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum anexo adicionado ainda</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Documentos */}
          {documentos.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos ({documentos.length})
              </h4>
              <div className="space-y-2">
                {documentos.map((anexo) => (
                  <div key={anexo.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{anexo.nome_arquivo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {anexo.tipo_arquivo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatarTamanho(anexo.tamanho)}
                          </span>
                          {anexo.adicionado_por_nome && (
                            <span className="text-xs text-muted-foreground">
                              por {anexo.adicionado_por_nome}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVisualizacao(anexo.url_arquivo)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(anexo.url_arquivo, anexo.nome_arquivo)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      {podeDeletar && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAnexoParaDeletar(anexo)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          disabled={isDeletando}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {/* Imagens */}
          {imagens.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Image className="h-4 w-4" />
                Imagens ({imagens.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {imagens.map((anexo) => (
                  <div key={anexo.id} className="relative group">
                    <img 
                      src={anexo.url_arquivo} 
                      alt={anexo.nome_arquivo}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleVisualizacao(anexo.url_arquivo)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(anexo.url_arquivo, anexo.nome_arquivo)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      {podeDeletar && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setAnexoParaDeletar(anexo)}
                          className="h-8 w-8 p-0"
                          disabled={isDeletando}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {anexo.nome_arquivo}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {/* Vídeos */}
          {videos.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Video className="h-4 w-4" />
                Vídeos ({videos.length})
              </h4>
              <div className="space-y-3">
                {videos.map((anexo) => (
                  <div key={anexo.id} className="border rounded-lg p-3">
                    <video 
                      controls 
                      className="w-full rounded-md max-h-64 bg-black mb-2"
                      preload="metadata"
                    >
                      <source src={anexo.url_arquivo} type={anexo.tipo_arquivo} />
                      Seu navegador não suporta reprodução de vídeo.
                    </video>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{anexo.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatarTamanho(anexo.tamanho)}
                          {anexo.adicionado_por_nome && ` • por ${anexo.adicionado_por_nome}`}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(anexo.url_arquivo, anexo.nome_arquivo)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {podeDeletar && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAnexoParaDeletar(anexo)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            disabled={isDeletando}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
      
      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!anexoParaDeletar} onOpenChange={() => setAnexoParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo <strong>{anexoParaDeletar?.nome_arquivo}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (anexoParaDeletar) {
                  deletarAnexo(anexoParaDeletar);
                  setAnexoParaDeletar(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
