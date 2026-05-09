import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, RefreshCw, Eye, Calendar, User, Building } from 'lucide-react';
import { useCodigosAcesso } from '@/hooks/useCodigosAcesso';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CandidaturaComCodigo } from '@/types/acessoPropostas';

interface GeradorCodigosAcessoProps {
  orcamentoId: string;
  orcamentoNecessidade: string;
}

export const GeradorCodigosAcesso = ({ orcamentoId, orcamentoNecessidade }: GeradorCodigosAcessoProps) => {
  const [candidaturas, setCandidaturas] = useState<CandidaturaComCodigo[]>([]);
  const { 
    loading, 
    listarCodigosOrcamento, 
    gerarCodigoAcesso, 
    regenerarCodigoFornecedor,
    extrairCodigoOrcamento 
  } = useCodigosAcesso();
  const { toast } = useToast();

  const codigoOrcamento = extrairCodigoOrcamento(orcamentoId);

  useEffect(() => {
    carregarCandidaturas();
  }, [orcamentoId]);

  const carregarCandidaturas = async () => {
    const data = await listarCodigosOrcamento(orcamentoId);
    setCandidaturas(data);
  };

  const handleGerarCodigo = async (candidaturaId: string) => {
    const resultado = await gerarCodigoAcesso(orcamentoId, candidaturaId);
    if (resultado) {
      await carregarCandidaturas();
    }
  };

  const handleRegerarCodigo = async (candidaturaId: string) => {
    const sucesso = await regenerarCodigoFornecedor(candidaturaId);
    if (sucesso) {
      await carregarCandidaturas();
    }
  };

  const copiarCodigos = (codigoFornecedor: string, empresa: string) => {
    const baseUrl = window.location.origin;
    const texto = `Códigos de Acesso - ${empresa}

Acesse sua proposta em: ${baseUrl}/acesso-proposta

Código do Orçamento: ${codigoOrcamento}
Código do Fornecedor: ${codigoFornecedor}

Instruções:
1. Acesse o link acima
2. Digite o código do orçamento
3. Digite o código do fornecedor
4. Clique em "Acessar Proposta"

Os códigos são válidos por 30 dias.`;
    
    navigator.clipboard.writeText(texto);
    toast({
      title: "Códigos copiados",
      description: `Instruções para ${empresa} copiadas para área de transferência.`,
    });
  };

  const isCodigoExpirado = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header com código do orçamento */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Gerador de Códigos de Acesso
          </CardTitle>
          <CardDescription>
            Orçamento: {orcamentoNecessidade}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-background rounded-lg border">
            <div className="text-sm text-muted-foreground">Código do Orçamento:</div>
            <div className="font-mono text-lg font-bold text-primary">{codigoOrcamento}</div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(codigoOrcamento);
                toast({ title: "Código copiado", description: "Código do orçamento copiado." });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de candidaturas */}
      <div className="grid gap-4">
        {candidaturas.map((candidatura) => (
          <Card key={candidatura.candidatura_id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {candidatura.nome}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {candidatura.empresa}
                  </CardDescription>
                </div>
                {candidatura.status_acompanhamento && (
                  <Badge variant="outline">
                    {candidatura.status_acompanhamento}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Email:</div>
                  <div>{candidatura.email}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Telefone:</div>
                  <div>{candidatura.telefone}</div>
                </div>
              </div>

              <Separator />

              {candidatura.codigo_acesso ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Código do Fornecedor:</div>
                      <div className="font-mono text-lg font-bold bg-background p-2 rounded border">
                        {candidatura.codigo_acesso.codigo_fornecedor}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Status:</div>
                      <Badge 
                        variant={isCodigoExpirado(candidatura.codigo_acesso.expires_at!) ? "destructive" : "default"}
                        className="w-fit"
                      >
                        {isCodigoExpirado(candidatura.codigo_acesso.expires_at!) ? "Expirado" : "Ativo"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{candidatura.codigo_acesso.visualizacoes} visualizações</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Expira em {format(new Date(candidatura.codigo_acesso.expires_at!), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    {candidatura.codigo_acesso.ultimo_acesso && (
                      <div className="text-sm text-muted-foreground">
                        Último acesso: {format(new Date(candidatura.codigo_acesso.ultimo_acesso), 'dd/MM HH:mm', { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => copiarCodigos(candidatura.codigo_acesso!.codigo_fornecedor, candidatura.empresa)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Instruções
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRegerarCodigo(candidatura.candidatura_id)}
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">Nenhum código gerado para este fornecedor</p>
                  <Button
                    onClick={() => handleGerarCodigo(candidatura.candidatura_id)}
                    disabled={loading}
                  >
                    Gerar Código de Acesso
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {candidaturas.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhuma candidatura encontrada para este orçamento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};