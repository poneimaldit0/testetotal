
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Loader2, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
}

interface InscricaoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  onFormDataChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  hasProfile: boolean;
  horarioSelecionado?: { id: string; data_hora: string } | null;
  isFilaEspera?: boolean;
}

export const InscricaoModal: React.FC<InscricaoModalProps> = ({
  isOpen,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  isSubmitting,
  hasProfile,
  horarioSelecionado,
  isFilaEspera = false,
}) => {
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.telefone || !formData.empresa) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    await onSubmit(e);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Inscrição no Orçamento
            {hasProfile && (
              <Badge variant="outline" className="text-primary border-primary">
                <UserCheck className="h-3 w-3 mr-1" />
                Dados preenchidos automaticamente
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Contexto da inscrição */}
        {horarioSelecionado ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Visita técnica agendada para:</p>
              <p className="text-sm text-green-700">
                📅 {format(new Date(horarioSelecionado.data_hora), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        ) : isFilaEspera ? (
          <div className="p-3 rounded-lg" style={{ background: '#F3F4F6', border: '1.5px solid #E5E7EB' }}>
            <p className="text-sm font-semibold" style={{ color: '#6B7280', marginBottom: 4 }}>⏳ Fila de espera</p>
            <p className="text-xs" style={{ color: '#6B7280', lineHeight: 1.55 }}>
              Você entrará na fila de espera caso uma empresa falte, desista ou não confirme.
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Nome da Empresa *</Label>
            <Input
              id="empresa"
              value={formData.empresa}
              onChange={(e) => onFormDataChange('empresa', e.target.value)}
              placeholder="Sua empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Seu Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => onFormDataChange('nome', e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormDataChange('email', e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => onFormDataChange('telefone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full goodref-button-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Inscrevendo...
              </>
            ) : (
              horarioSelecionado ? 'Confirmar Inscrição e Agendar Visita' : isFilaEspera ? 'Entrar na fila de espera' : 'Confirmar Inscrição'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
