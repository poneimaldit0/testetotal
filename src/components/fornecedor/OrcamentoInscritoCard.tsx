import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Mail, Phone, Users, Clock } from 'lucide-react';
import { StatusSelector } from './StatusSelector';
import { AnexosOrcamento } from './AnexosOrcamento';
import { PropostaAnexoUpload } from './PropostaAnexoUpload';
import { OrcamentoInscrito } from '@/hooks/useMeusOrcamentos';
import { useAuth } from '@/hooks/useAuth';
import { abrirWhatsApp } from '@/utils/orcamentoUtils';

interface OrcamentoInscritoCardProps {
  orcamento: OrcamentoInscrito;
  onStatusChange: () => void;
}

export const OrcamentoInscritoCard: React.FC<OrcamentoInscritoCardProps> = ({
  orcamento,
  onStatusChange,
}) => {
  const { profile } = useAuth();

  const getStatusColor = (status: string) => {
    return status === 'aberto' ? 'bg-primary' : 'bg-accent';
  };

  const handleWhatsApp = (telefone: string, nomeCliente: string, orcamentoId: string) => {
    abrirWhatsApp(
      telefone, nomeCliente, orcamentoId,
      profile?.nome || 'Fornecedor',
      profile?.empresa || 'Empresa',
      orcamento.local
    );
  };

  return (
    <Card className="goodref-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-secondary">{orcamento.id}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Inscrito em {format(orcamento.dataInscricao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Badge className={getStatusColor(orcamento.status)}>
              {orcamento.status.toUpperCase()}
            </Badge>
            {orcamento.categorias.map((categoria, index) => (
              <Badge key={index} variant="secondary">
                {categoria}
              </Badge>
            ))}
            <StatusSelector
              inscricaoId={orcamento.inscricaoId}
              statusAtual={orcamento.statusAcompanhamento}
              onStatusChange={onStatusChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm">{orcamento.necessidade}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Local:</span> {orcamento.local}
            </div>
            <div>
              <span className="font-medium">Tamanho:</span> {orcamento.tamanhoImovel || 'N/A'} m²
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="font-medium">Empresas inscritas:</span> {orcamento.quantidadeEmpresas}/3
            </div>
          </div>

          {/* Exibir anexos quando disponíveis */}
          {(orcamento.arquivos?.length > 0 || orcamento.fotos?.length > 0) && (
            <AnexosOrcamento 
              arquivos={orcamento.arquivos || []} 
              fotos={orcamento.fotos || []} 
            />
          )}

          {/* Upload de Proposta - Novo fluxo simplificado */}
          <div className="border-t pt-4">
            <PropostaAnexoUpload
              candidaturaId={orcamento.inscricaoId}
              orcamentoId={orcamento.id}
            />
          </div>

          {/* Dados de contato */}
          {orcamento.dadosContato ? (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Dados de Contato do Cliente:
              </h4>
              <div className="text-sm text-primary/80 space-y-1">
                <p><strong>Nome:</strong> {orcamento.dadosContato.nome}</p>
                <p><strong>Telefone:</strong> {orcamento.dadosContato.telefone}</p>
                <p><strong>E-mail:</strong> {orcamento.dadosContato.email}</p>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button
                  onClick={() => handleWhatsApp(orcamento.dadosContato!.telefone, orcamento.dadosContato!.nome, orcamento.id)}
                  className="goodref-button-primary"
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chamar no WhatsApp
                </Button>
                <Button
                  onClick={() => window.open(`mailto:${orcamento.dadosContato!.email}`, '_blank')}
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Enviar E-mail
                </Button>
              </div>
              
              {orcamento.status === 'fechado' ? (
                <p className="text-xs text-primary/60 mt-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Orçamento fechado - 3 empresas já se inscreveram. Entre em contato o quanto antes!
                </p>
              ) : (
                <p className="text-xs text-primary/60 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Orçamento ainda aberto - você pode entrar em contato enquanto aguarda mais fornecedores.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                ⚠️ Os dados de contato do cliente não estão disponíveis neste orçamento.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
