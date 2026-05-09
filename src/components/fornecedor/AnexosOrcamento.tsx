
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, Download, Eye, Video } from 'lucide-react';

interface Arquivo {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho: number;
  url_arquivo: string;
}

interface AnexosOrcamentoProps {
  arquivos: Arquivo[];
  fotos: Arquivo[];
}

export const AnexosOrcamento: React.FC<AnexosOrcamentoProps> = ({ arquivos, fotos }) => {
  // Separar vídeos dos documentos
  const videos = arquivos.filter(a => a.tipo_arquivo.startsWith('video/'));
  const documentos = arquivos.filter(a => !a.tipo_arquivo.startsWith('video/'));
  
  const formatarTamanho = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  if (documentos.length === 0 && fotos.length === 0 && videos.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Anexos do Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Documentos e Arquivos */}
        {documentos.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Documentos ({documentos.length})
            </h4>
            <div className="space-y-2">
              {documentos.map((arquivo) => (
                <div key={arquivo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{arquivo.nome_arquivo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {arquivo.tipo_arquivo}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatarTamanho(arquivo.tamanho)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVisualizacao(arquivo.url_arquivo)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(arquivo.url_arquivo, arquivo.nome_arquivo)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos e Imagens */}
        {fotos.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <Image className="h-3 w-3" />
              Imagens ({fotos.length})
            </h4>
            <div className="space-y-2">
              {fotos.map((foto) => (
                <div key={foto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Image className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{foto.nome_arquivo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {foto.tipo_arquivo}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatarTamanho(foto.tamanho)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVisualizacao(foto.url_arquivo)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(foto.url_arquivo, foto.nome_arquivo)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vídeos */}
        {videos.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <Video className="h-3 w-3" />
              Vídeos ({videos.length})
            </h4>
            <div className="space-y-2">
              {videos.map((video) => (
                <div key={video.id} className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Video className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{video.nome_arquivo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {video.tipo_arquivo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatarTamanho(video.tamanho)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(video.url_arquivo, video.nome_arquivo)}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Preview do vídeo */}
                  <video 
                    controls 
                    className="w-full rounded-md max-h-64 bg-black"
                    preload="metadata"
                  >
                    <source src={video.url_arquivo} type={video.tipo_arquivo} />
                    Seu navegador não suporta reprodução de vídeo.
                  </video>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
