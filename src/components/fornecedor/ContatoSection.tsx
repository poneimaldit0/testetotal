import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { abrirWhatsApp } from '@/utils/orcamentoUtils';

interface DadosContato {
  nome: string;
  telefone: string;
  email: string;
}

interface ContatoSectionProps {
  dadosContato: DadosContato;
  orcamentoId: string;
  localReforma: string;
  onAbrirWhatsApp?: (telefone: string, nome: string, orcamentoId: string) => void;
}

export const ContatoSection: React.FC<ContatoSectionProps> = ({
  dadosContato,
  orcamentoId,
  localReforma,
}) => {
  const { profile } = useAuth();

  const handleWhatsApp = () => {
    abrirWhatsApp(
      dadosContato.telefone,
      dadosContato.nome,
      orcamentoId,
      profile?.nome || 'Fornecedor',
      profile?.empresa || 'Empresa',
      localReforma
    );
  };

  return (
    <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
      <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
        <Phone className="h-4 w-4" />
        Dados de Contato do Cliente:
      </h4>
      <div className="text-sm text-primary/80 space-y-1">
        <p><strong>Nome:</strong> {dadosContato.nome}</p>
        <p><strong>Telefone:</strong> {dadosContato.telefone}</p>
        <p><strong>E-mail:</strong> {dadosContato.email}</p>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          onClick={handleWhatsApp}
          className="goodref-button-primary"
          size="sm"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Chamar no WhatsApp
        </Button>
        <Button
          onClick={() => window.open(`mailto:${dadosContato.email}`, '_blank')}
          variant="outline"
          size="sm"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Mail className="h-4 w-4 mr-1" />
          Enviar E-mail
        </Button>
      </div>
    </div>
  );
};
