import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GestorSelector } from './GestorSelector';
import { useEditarOrcamento } from '@/hooks/useEditarOrcamento';
import { CATEGORIAS_SERVICO, PRAZOS_INICIO } from '@/constants/orcamento';
import { Orcamento } from '@/types';
import { Loader2 } from 'lucide-react';

interface EditarOrcamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orcamento: Orcamento | null;
  onSuccess: () => void;
}

export const EditarOrcamentoModal: React.FC<EditarOrcamentoModalProps> = ({
  isOpen,
  onClose,
  orcamento,
  onSuccess,
}) => {
  const { atualizarOrcamento, isLoading } = useEditarOrcamento();
  
  const [formData, setFormData] = useState({
    necessidade: '',
    categorias: [] as string[],
    local: '',
    tamanhoImovel: '',
    prazoInicio: '',
    prazoExplicito: false,
    prazoEnvioProposta: '',
    nomeContato: '',
    telefoneContato: '',
    emailContato: '',
    gestorContaId: null as string | null,
    budgetInformado: '',
  });

  // Preencher formulário quando o orçamento mudar
  useEffect(() => {
    if (orcamento) {
      setFormData({
        necessidade: orcamento.necessidade || '',
        categorias: orcamento.categorias || [],
        local: orcamento.local || '',
        tamanhoImovel: orcamento.tamanhoImovel?.toString() || '',
        prazoInicio: orcamento.prazoInicioTexto || '',
        prazoExplicito: orcamento.prazo_explicitamente_definido || false,
        prazoEnvioProposta: orcamento.prazo_envio_proposta_dias?.toString() || '',
        nomeContato: orcamento.dadosContato?.nome || '',
        telefoneContato: orcamento.dadosContato?.telefone || '',
        emailContato: orcamento.dadosContato?.email || '',
        gestorContaId: orcamento.gestor_conta_id || null,
        budgetInformado: orcamento.budget_informado?.toString() || '',
      });
    }
  }, [orcamento]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoriaChange = (categoria: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categorias: checked 
        ? [...prev.categorias, categoria]
        : prev.categorias.filter(c => c !== categoria)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orcamento) return;

    const success = await atualizarOrcamento(orcamento.id, {
      necessidade: formData.necessidade,
      categorias: formData.categorias,
      local: formData.local,
      tamanho_imovel: formData.tamanhoImovel ? Number(formData.tamanhoImovel) : undefined,
      prazo_inicio_texto: formData.prazoInicio,
      prazo_explicitamente_definido: formData.prazoExplicito,
      prazo_envio_proposta_dias: formData.prazoExplicito ? Number(formData.prazoEnvioProposta) : undefined,
      budget_informado: formData.budgetInformado ? Number(formData.budgetInformado) : undefined,
      dados_contato: {
        nome: formData.nomeContato,
        telefone: formData.telefoneContato,
        email: formData.emailContato,
      },
      gestor_conta_id: formData.gestorContaId,
    });

    if (success) {
      onSuccess();
      onClose();
    }
  };

  if (!orcamento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Categorias de Serviço *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIAS_SERVICO.map((categoria) => (
                  <div key={categoria} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${categoria}`}
                      checked={formData.categorias.includes(categoria)}
                      onCheckedChange={(checked) => handleCategoriaChange(categoria, checked as boolean)}
                    />
                    <Label htmlFor={`edit-${categoria}`} className="text-sm font-normal">
                      {categoria}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-local">Local *</Label>
              <Input
                id="edit-local"
                value={formData.local}
                onChange={(e) => handleInputChange('local', e.target.value)}
                placeholder="Cidade, Estado ou endereço completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tamanhoImovel">Tamanho do Imóvel (m²) *</Label>
              <Input
                id="edit-tamanhoImovel"
                type="number"
                value={formData.tamanhoImovel}
                onChange={(e) => handleInputChange('tamanhoImovel', e.target.value)}
                placeholder="Ex: 120"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-budgetInformado">
                Budget Informado (R$)
                <span className="text-xs text-muted-foreground ml-2">
                  (Confidencial)
                </span>
              </Label>
              <Input
                id="edit-budgetInformado"
                type="number"
                min="0"
                step="0.01"
                value={formData.budgetInformado}
                onChange={(e) => handleInputChange('budgetInformado', e.target.value)}
                placeholder="Ex: 150000.00"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-prazoInicio">Prazo Pretendido para Início *</Label>
              <Select value={formData.prazoInicio} onValueChange={(value) => handleInputChange('prazoInicio', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prazo desejado" />
                </SelectTrigger>
                <SelectContent>
                  {PRAZOS_INICIO.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>
                      {opcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 md:col-span-2 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-prazoExplicito"
                  checked={formData.prazoExplicito}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, prazoExplicito: checked as boolean }))}
                />
                <Label htmlFor="edit-prazoExplicito" className="text-sm">
                  Definir prazo específico para recebimento de propostas
                </Label>
              </div>
              
              {formData.prazoExplicito && (
                <div className="space-y-2">
                  <Label htmlFor="edit-prazoEnvioProposta">Prazo em dias para envio de propostas</Label>
                  <Input
                    id="edit-prazoEnvioProposta"
                    type="number"
                    min="1"
                    max="90"
                    value={formData.prazoEnvioProposta}
                    onChange={(e) => handleInputChange('prazoEnvioProposta', e.target.value)}
                    placeholder="Ex: 7"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fornecedores terão este prazo para enviar suas propostas após se candidatarem
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-necessidade">Descrição da Necessidade *</Label>
            <Textarea
              id="edit-necessidade"
              value={formData.necessidade}
              onChange={(e) => handleInputChange('necessidade', e.target.value)}
              placeholder="Descreva detalhadamente o serviço necessário..."
              rows={4}
              required
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Dados de Contato do Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nomeContato">Nome do Cliente *</Label>
                <Input
                  id="edit-nomeContato"
                  value={formData.nomeContato}
                  onChange={(e) => handleInputChange('nomeContato', e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefoneContato">Telefone *</Label>
                <Input
                  id="edit-telefoneContato"
                  value={formData.telefoneContato}
                  onChange={(e) => handleInputChange('telefoneContato', e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-emailContato">E-mail *</Label>
                <Input
                  id="edit-emailContato"
                  type="email"
                  value={formData.emailContato}
                  onChange={(e) => handleInputChange('emailContato', e.target.value)}
                  placeholder="cliente@email.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <GestorSelector
              value={formData.gestorContaId || undefined}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gestorContaId: value }))}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
