import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ReputacaoFornecedor } from '@/components/fornecedor/ReputacaoFornecedor';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { FornecedorReputacao as FornecedorReputacaoType } from '@/types/fornecedor-reputacao';
import { 
  Building2, 
  Mail, 
  Phone, 
  ExternalLink, 
  Share2,
  Star,
  Award,
  Calendar,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const PerfilFornecedor = () => {
  const { id } = useParams<{ id: string }>();
  const { buscarReputacaoFornecedor } = useFornecedorReputacao();
  const { toast } = useToast();
  
  const [reputacao, setReputacao] = useState<FornecedorReputacaoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarDados = async () => {
      if (!id) {
        setError('ID do fornecedor não informado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const dados = await buscarReputacaoFornecedor(id);
        
        if (!dados) {
          setError('Fornecedor não encontrado ou inativo');
        } else {
          setReputacao(dados);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil do fornecedor:', err);
        setError('Erro ao carregar dados do fornecedor');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [id, buscarReputacaoFornecedor]);

  const compartilharPerfil = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${reputacao?.nome} - ${reputacao?.empresa}`,
          text: `Conheça o perfil profissional de ${reputacao?.nome}`,
          url: url,
        });
      } catch (err) {
        // Fallback para cópia manual se o usuário cancelar o compartilhamento
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copiado!",
          description: "O link do perfil foi copiado para a área de transferência",
        });
      }
    } else {
      // Fallback para navegadores que não suportam Web Share API
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado!",
        description: "O link do perfil foi copiado para a área de transferência",
      });
    }
  };

  const formatarEstatisticas = () => {
    if (!reputacao) return null;
    
    const stats = [
      {
        icon: Calendar,
        label: 'Projetos',
        value: reputacao.portfolios.length,
        color: 'text-blue-600'
      },
      {
        icon: Users,
        label: 'Depoimentos',
        value: reputacao.depoimentos.length,
        color: 'text-green-600'
      },
      {
        icon: Award,
        label: 'Certificações',
        value: reputacao.selos.length,
        color: 'text-purple-600'
      },
      {
        icon: Star,
        label: 'Avaliações',
        value: reputacao.media_avaliacoes.total_avaliacoes,
        color: 'text-yellow-600'
      }
    ];

    return stats;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando perfil...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reputacao) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md w-full">
              <CardContent className="text-center py-8">
                <div className="text-6xl mb-4">😔</div>
                <h2 className="text-xl font-semibold mb-2">Perfil não encontrado</h2>
                <p className="text-muted-foreground mb-4">
                  {error || 'Este fornecedor não foi encontrado ou não está disponível publicamente.'}
                </p>
                <Button onClick={() => window.history.back()}>
                  Voltar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const stats = formatarEstatisticas();

  return (
    <div className="min-h-screen bg-background">
      {/* Header do perfil */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Avatar e informações principais */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 lg:h-24 lg:w-24">
                {reputacao.logo_url ? (
                  <img 
                    src={reputacao.logo_url} 
                    alt={`Logo ${reputacao.empresa}`}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <AvatarFallback className="text-lg">
                    {reputacao.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  {reputacao.nome}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Building2 className="h-4 w-4" />
                  <span className="text-lg">{reputacao.empresa}</span>
                </div>
                {reputacao.descricao_fornecedor && (
                  <p className="text-muted-foreground max-w-2xl">
                    {reputacao.descricao_fornecedor}
                  </p>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="lg:ml-auto flex gap-2">
              <Button 
                onClick={compartilharPerfil}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>

          {/* Estatísticas rápidas */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {stats.map((stat, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-center mb-2">
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8">
        <ReputacaoFornecedor reputacao={reputacao} compacto={false} />
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            Perfil público de {reputacao.nome} - {reputacao.empresa}
          </div>
        </div>
      </footer>
    </div>
  );
};