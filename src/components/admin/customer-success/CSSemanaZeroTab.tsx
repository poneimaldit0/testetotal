import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChecklistSemanaZero, useSalvarChecklistSemanaZero } from '@/hooks/useCustomerSuccessCRM';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Rocket, MessageCircle, Users, BookOpen, FileText } from 'lucide-react';

interface CSSemanaZeroTabProps {
  csFornecedorId: string;
}

const CHECKLIST_ITEMS = [
  { 
    key: 'boas_vindas_enviada', 
    label: 'Enviar mensagem de boas-vindas para o fornecedor',
    icon: MessageCircle,
    description: 'Primeira comunicação com o fornecedor'
  },
  { 
    key: 'grupo_whatsapp_criado', 
    label: 'Adicionar no grupo de WhatsApp as pessoas envolvidas',
    icon: Users,
    description: 'Incluir todos os stakeholders no grupo'
  },
  { 
    key: 'material_educativo_enviado', 
    label: 'Enviar material educativo',
    icon: BookOpen,
    description: 'Documentação e materiais de apoio'
  },
  { 
    key: 'documentos_solicitados', 
    label: 'Pedir documentos e portfólio para a reunião inicial',
    icon: FileText,
    description: 'Solicitar materiais necessários para o kickoff'
  },
] as const;

type ChecklistKey = typeof CHECKLIST_ITEMS[number]['key'];

export function CSSemanaZeroTab({ csFornecedorId }: CSSemanaZeroTabProps) {
  const { profile } = useAuth();
  const { data: checklistExistente, isLoading } = useChecklistSemanaZero(csFornecedorId);
  const salvarChecklist = useSalvarChecklistSemanaZero();

  const [formData, setFormData] = useState({
    boas_vindas_enviada: false,
    grupo_whatsapp_criado: false,
    material_educativo_enviado: false,
    documentos_solicitados: false,
    observacoes: '',
  });

  // Sync form data with existing checklist
  useEffect(() => {
    if (checklistExistente) {
      setFormData({
        boas_vindas_enviada: checklistExistente.boas_vindas_enviada,
        grupo_whatsapp_criado: checklistExistente.grupo_whatsapp_criado,
        material_educativo_enviado: checklistExistente.material_educativo_enviado,
        documentos_solicitados: checklistExistente.documentos_solicitados,
        observacoes: checklistExistente.observacoes || '',
      });
    }
  }, [checklistExistente]);

  const todosItensCompletos = CHECKLIST_ITEMS.every(
    item => formData[item.key as ChecklistKey]
  );

  const itensConcluidos = CHECKLIST_ITEMS.filter(
    item => formData[item.key as ChecklistKey]
  ).length;

  const handleSalvar = async (concluir: boolean) => {
    if (!profile) return;
    
    await salvarChecklist.mutateAsync({
      cs_fornecedor_id: csFornecedorId,
      formData,
      concluir,
      userId: profile.id,
      userName: profile.nome
    });
  };

  const checklistConcluido = checklistExistente?.concluido;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Semana 0 - Pré-Onboarding</h3>
            <p className="text-sm text-muted-foreground">
              Preparação inicial antes do acompanhamento semanal
            </p>
          </div>
        </div>
        {checklistConcluido && (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Concluída
          </Badge>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(itensConcluidos / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {itensConcluidos}/{CHECKLIST_ITEMS.length}
        </span>
      </div>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">✅ Checklist de Preparação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = item.icon;
            const isChecked = formData[item.key as ChecklistKey];
            
            return (
              <div 
                key={item.key} 
                className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                  isChecked 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-background border-border hover:border-primary/30'
                }`}
              >
                <Checkbox 
                  id={item.key}
                  checked={isChecked} 
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, [item.key]: !!checked }))
                  }
                  disabled={checklistConcluido}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={item.key}
                    className={`font-medium cursor-pointer ${isChecked ? 'text-primary' : ''}`}
                  >
                    {item.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Icon className={`h-4 w-4 ${isChecked ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📝 Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Anotações adicionais sobre a preparação inicial..."
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            disabled={checklistConcluido}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Ações */}
      {!checklistConcluido && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSalvar(false)} 
            disabled={salvarChecklist.isPending}
          >
            {salvarChecklist.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Rascunho
          </Button>
          <Button 
            onClick={() => handleSalvar(true)} 
            disabled={salvarChecklist.isPending || !todosItensCompletos}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluir Semana 0
          </Button>
        </div>
      )}

      {/* Info quando não pode concluir */}
      {!checklistConcluido && !todosItensCompletos && (
        <p className="text-xs text-muted-foreground">
          Complete todos os itens do checklist para poder concluir a Semana 0.
        </p>
      )}

      {/* Info de conclusão */}
      {checklistConcluido && checklistExistente && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          Concluída por <strong>{checklistExistente.concluido_por_nome}</strong> em{' '}
          {new Date(checklistExistente.data_conclusao!).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}
    </div>
  );
}
