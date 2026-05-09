import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTokenComparacao } from '@/hooks/useTokenComparacao';
import { Link, Copy, MessageCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GeradorTokenComparacaoProps {
  orcamento: {
    id: string;
    necessidade: string;
    local: string;
    dados_contato?: {
      nome?: string;
      telefone?: string;
      email?: string;
    };
  };
  onClose?: () => void;
}

const GeradorTokenComparacao = ({ orcamento, onClose }: GeradorTokenComparacaoProps) => {
  const { gerarToken, gerarLinkWhatsApp, loading } = useTokenComparacao();
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [telefoneContato, setTelefoneContato] = useState(orcamento.dados_contato?.telefone || '');

  const handleGerarToken = async () => {
    const resultado = await gerarToken(orcamento.id);
    if (resultado.success) {
      setTokenGerado(resultado.token);
      setLinkGerado(resultado.link);
    }
  };

  const copiarLink = async () => {
    if (linkGerado) {
      await navigator.clipboard.writeText(linkGerado);
    }
  };

  const abrirWhatsApp = () => {
    if (linkGerado && telefoneContato) {
      const whatsappUrl = gerarLinkWhatsApp(telefoneContato, linkGerado, orcamento.necessidade);
      window.open(whatsappUrl, '_blank');
    }
  };

  const visualizarComparador = () => {
    if (linkGerado) {
      window.open(linkGerado, '_blank');
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          Gerador de Link de Comparação
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gere um link seguro para o cliente comparar as propostas
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Informações do Orçamento */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Orçamento</Label>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">{orcamento.necessidade}</p>
            <p className="text-sm text-muted-foreground">{orcamento.local}</p>
          </div>
        </div>

        {/* Dados de Contato */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Dados de Contato (Opcional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="telefone" className="text-xs">Telefone</Label>
              <Input
                id="telefone"
                value={telefoneContato}
                onChange={(e) => setTelefoneContato(e.target.value)}
                placeholder="(11) 99999-9999"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                value={orcamento.dados_contato?.email || ''}
                placeholder="cliente@email.com"
                disabled
                className="text-sm bg-muted"
              />
            </div>
          </div>
        </div>

        {/* Botão Gerar Token */}
        {!tokenGerado && (
          <Button 
            onClick={handleGerarToken} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Gerando...' : 'Gerar Link de Comparação'}
          </Button>
        )}

        {/* Link Gerado */}
        {linkGerado && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Link Gerado
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-green-700">Link de Acesso</Label>
                  <div className="flex gap-2 max-w-full overflow-hidden">
                    <Input
                      value={linkGerado}
                      readOnly
                      className="text-xs bg-white border-green-300 truncate min-w-0"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copiarLink}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={visualizarComparador}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </Button>
                  
                  {telefoneContato && (
                    <Button
                      size="sm"
                      onClick={abrirWhatsApp}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Instruções */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• O link expira em 30 dias após a criação</p>
              <p>• Apenas pessoas com o link podem acessar a comparação</p>
              <p>• O acesso é registrado para auditoria</p>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GeradorTokenComparacao;