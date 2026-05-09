import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FornecedorReputacao } from '@/types/fornecedor-reputacao';
import { useToast } from '@/hooks/use-toast';
import { 
  Star, 
  Award, 
  Calendar,
  User,
  Quote,
  FileText,
  Download,
  Loader2,
  Phone,
  Mail,
  Globe,
  MapPin
} from 'lucide-react';

interface ReputacaoFornecedorProps {
  reputacao: FornecedorReputacao;
  compacto?: boolean;
}

export const ReputacaoFornecedor: React.FC<ReputacaoFornecedorProps> = ({ 
  reputacao, 
  compacto = false 
}) => {
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const downloadPDF = async (url: string, filename: string) => {
    try {
      setDownloadingFiles(prev => new Set(prev).add(url));
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao baixar o arquivo');
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download concluído",
        description: "O arquivo PDF foi baixado com sucesso."
      });
    } catch (error) {
      console.error('Erro no download:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  };

  const renderAvaliacao = (media: number) => {
    const stars = [];
    const fullStars = Math.floor(media);
    const hasHalfStar = media % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }

    return stars;
  };

  if (compacto) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Reputação</CardTitle>
            <div className="flex items-center gap-1">
              {renderAvaliacao(reputacao.media_avaliacoes.nota_geral)}
              <span className="text-sm text-muted-foreground ml-2">
                ({reputacao.media_avaliacoes.total_avaliacoes})
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selos */}
          {reputacao.selos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Certificações</h4>
              <div className="flex flex-wrap gap-2">
                {reputacao.selos.slice(0, 3).map((selo) => (
                  <Badge key={selo.id} variant="secondary" className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {selo.nome_selo}
                  </Badge>
                ))}
                {reputacao.selos.length > 3 && (
                  <Badge variant="outline">+{reputacao.selos.length - 3}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{reputacao.portfolios.length}</div>
              <div className="text-xs text-muted-foreground">Projetos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">{reputacao.depoimentos.length}</div>
              <div className="text-xs text-muted-foreground">Depoimentos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">{reputacao.selos.length}</div>
              <div className="text-xs text-muted-foreground">Selos</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Logo e Descrição da Empresa */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                {reputacao.logo_url && (
                  <AvatarImage src={reputacao.logo_url} alt={reputacao.empresa} />
                )}
                <AvatarFallback className="text-2xl md:text-4xl bg-primary/10 text-primary">
                  {reputacao.empresa.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Informações da Empresa */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {reputacao.empresa}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Representado por {reputacao.nome}
                </p>
              </div>

              {/* Descrição */}
              {reputacao.descricao_fornecedor && (
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {reputacao.descricao_fornecedor}
                </p>
              )}

              {/* Informações de Contato */}
              <div className="flex flex-wrap gap-3">
                {reputacao.telefone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${reputacao.telefone}`, '_blank')}
                    className="gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    {reputacao.telefone}
                  </Button>
                )}
                {reputacao.whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://wa.me/55${reputacao.whatsapp.replace(/\D/g, '')}`, '_blank')}
                    className="gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </Button>
                )}
                {reputacao.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`mailto:${reputacao.email}`, '_blank')}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {reputacao.email}
                  </Button>
                )}
                {reputacao.site_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(reputacao.site_url, '_blank')}
                    className="gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Site
                  </Button>
                )}
                {reputacao.endereco && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled
                  >
                    <MapPin className="h-4 w-4" />
                    {reputacao.endereco}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avaliações Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {reputacao.media_avaliacoes.nota_geral.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderAvaliacao(reputacao.media_avaliacoes.nota_geral)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avaliação Geral
              </div>
              <div className="text-xs text-muted-foreground">
                ({reputacao.media_avaliacoes.total_avaliacoes} avaliações)
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {reputacao.media_avaliacoes.qualidade.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderAvaliacao(reputacao.media_avaliacoes.qualidade)}
              </div>
              <div className="text-sm text-muted-foreground">Qualidade</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {reputacao.media_avaliacoes.prazo.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {renderAvaliacao(reputacao.media_avaliacoes.prazo)}
              </div>
              <div className="text-sm text-muted-foreground">Cumprimento de prazo</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selos e Certificações */}
      {reputacao.selos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certificações e Selos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reputacao.selos.map((selo) => (
                <div key={selo.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Award className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">{selo.nome_selo}</div>
                    {selo.descricao && (
                      <div className="text-sm text-muted-foreground">{selo.descricao}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(selo.data_concessao).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfólio */}
      {reputacao.portfolios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Portfólio de Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reputacao.portfolios.map((portfolio) => (
                <div key={portfolio.id} className="border rounded-lg overflow-hidden">
                  {portfolio.imagem_url && (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {portfolio.imagem_url.endsWith('.pdf') ? (
                        <div className="text-center p-4">
                          <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">Documento PDF</p>
                          <Button 
                            onClick={() => downloadPDF(portfolio.imagem_url!, `${portfolio.titulo}.pdf`)}
                            variant="outline"
                            size="sm"
                            disabled={downloadingFiles.has(portfolio.imagem_url!)}
                          >
                            {downloadingFiles.has(portfolio.imagem_url!) ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            {downloadingFiles.has(portfolio.imagem_url!) ? 'Acessando...' : 'Acessar documento'}
                          </Button>
                        </div>
                      ) : (
                        <img 
                          src={portfolio.imagem_url} 
                          alt={portfolio.titulo}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-medium mb-2">{portfolio.titulo}</h4>
                    {portfolio.descricao && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {portfolio.descricao}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {portfolio.categoria && (
                        <Badge variant="outline" className="text-xs">
                          {portfolio.categoria}
                        </Badge>
                      )}
                       {portfolio.data_projeto && (
                         <span>
                           {new Date(portfolio.data_projeto).toLocaleDateString()}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Depoimentos */}
      {reputacao.depoimentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Quote className="h-5 w-5" />
              Depoimentos de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {reputacao.depoimentos.map((depoimento) => (
                <div key={depoimento.id} className="border-l-4 border-primary pl-4">
                  <blockquote className="text-foreground mb-3">
                    "{depoimento.depoimento}"
                  </blockquote>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {depoimento.cliente_nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{depoimento.cliente_nome}</span>
                    <span>•</span>
                    <span>{depoimento.data_depoimento ? new Date(depoimento.data_depoimento).toLocaleDateString() : 'Data não informada'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};