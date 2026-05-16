/**
 * AgendamentoCompatModal — modal leve para o consultor agendar a apresentação
 * da compatibilização DESDE A RECEPÇÃO da ficha, antes da IA rodar.
 *
 * - Reusa visualmente o bloco D10 que já existe no ModalCompatibilizacaoConsultor,
 *   mas é um componente autônomo (pode ser invocado de qualquer card).
 * - Não dispara IA — apenas agenda. A IA é parte separada do fluxo.
 * - Vide memória feedback_compat_nao_e_sdr.md: compatibilização ≠ IA ≠ SDR.
 */

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAgendamentoCompat, type AgendamentoCanal } from '@/hooks/useAgendamentoCompat';

interface Props {
  orcamentoId: string | null;
  nomeOrcamento?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgendado?: () => void; // callback pós-save (para invalidar caches do Kanban)
}

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AgendamentoCompatModal({ orcamentoId, nomeOrcamento, open, onOpenChange, onAgendado }: Props) {
  const queryClient = useQueryClient();
  const { estado, loading, saving, agendar, limparAgendamento } = useAgendamentoCompat(orcamentoId);

  // Invalida caches relevantes após qualquer mutação no agendamento.
  // Garante que o card do Kanban, listas e Rota100 reflitam a mudança.
  const invalidarCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['crm-orcamentos'] });
    queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
  };

  const [dataLocal, setDataLocal] = useState('');
  const [canal, setCanal]         = useState<AgendamentoCanal | ''>('');
  const [link, setLink]           = useState('');
  const [obs, setObs]              = useState('');
  const [removendo, setRemovendo]  = useState(false);

  // Sincroniza o form quando o estado do banco carrega/muda ou modal abre
  useEffect(() => {
    if (!open) return;
    setDataLocal(toDateTimeLocal(estado?.apresentacao_agendada_em));
    setCanal(estado?.apresentacao_canal ?? '');
    setLink(estado?.apresentacao_link ?? '');
    setObs(estado?.apresentacao_observacao ?? '');
  }, [open, estado?.id, estado?.apresentacao_agendada_em, estado?.apresentacao_canal, estado?.apresentacao_link, estado?.apresentacao_observacao]);

  const jaAgendada = !!estado?.apresentacao_agendada_em;

  const handleSalvar = async () => {
    if (!dataLocal) { toast.error('Defina a data e hora da apresentação.'); return; }
    const res = await agendar({
      apresentacao_agendada_em: new Date(dataLocal).toISOString(),
      apresentacao_canal:       canal || null,
      apresentacao_link:        link.trim() || null,
      apresentacao_observacao:  obs.trim() || null,
    });
    if (!res.ok) { toast.error(`Erro ao salvar: ${res.erro ?? 'desconhecido'}`); return; }
    toast.success(jaAgendada ? 'Agendamento atualizado.' : 'Compatibilização agendada.');
    invalidarCaches();
    onAgendado?.();
    onOpenChange(false);
  };

  const handleRemover = async () => {
    setRemovendo(true);
    try {
      const res = await limparAgendamento();
      if (!res.ok) { toast.error(`Erro ao remover: ${res.erro ?? 'desconhecido'}`); return; }
      toast.success('Agendamento removido.');
      invalidarCaches();
      onAgendado?.();
      onOpenChange(false);
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            {jaAgendada ? 'Atualizar agendamento da compatibilização' : 'Agendar compatibilização'}
            {jaAgendada && (
              <Badge variant="outline" className="text-[10px] border-green-300 bg-green-50 text-green-700">
                Agendada
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {nomeOrcamento ? `Orçamento: ${nomeOrcamento}. ` : ''}
            A data definida aqui vira o prazo limite para os fornecedores enviarem propostas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Data e hora *</label>
                <Input
                  type="datetime-local"
                  value={dataLocal}
                  onChange={(e) => setDataLocal(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Canal</label>
                <select
                  value={canal}
                  onChange={(e) => setCanal(e.target.value as AgendamentoCanal | '')}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm outline-none"
                >
                  <option value="">Selecione…</option>
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {(canal === 'online' || canal === 'whatsapp') && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {canal === 'online' ? 'Link da reunião' : 'Link WhatsApp (opcional)'}
                </label>
                <Input
                  type="url"
                  placeholder={canal === 'online' ? 'https://meet.google.com/...' : 'https://wa.me/...'}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Observação (opcional)</label>
              <Textarea
                rows={3}
                placeholder="Anotações para o time…"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="text-sm resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {jaAgendada && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemover}
              disabled={saving || removendo}
              className="border-red-200 text-red-700 hover:bg-red-50 gap-1.5 mr-auto"
            >
              {removendo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Remover agendamento
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSalvar} disabled={saving || !dataLocal} className="gap-1.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calendar className="h-3 w-3" />}
            {jaAgendada ? 'Atualizar' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
