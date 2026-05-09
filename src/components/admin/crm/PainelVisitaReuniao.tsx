import { useState } from 'react';
import { FornecedorInscrito } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Copy, ExternalLink, CheckCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp,
  Video, MapPin, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AcessoReuniao {
  em: string;
  user_id: string;
  empresa: string;
  status: string;
}

interface PainelVisitaReuniaoProps {
  orcamentoId: string;
  fornecedores: FornecedorInscrito[];
  onFornecedoresUpdated: (updated: FornecedorInscrito[]) => void;
}

export function PainelVisitaReuniao({
  fornecedores,
  onFornecedoresUpdated,
}: PainelVisitaReuniaoProps) {
  const [editandoLink, setEditandoLink] = useState<Record<string, string>>({});
  const [salvando,     setSalvando]     = useState<string | null>(null);
  const [expandidos,   setExpandidos]   = useState<Set<string>>(new Set());

  const isOnline = fornecedores.some(f =>
    f.status_acompanhamento === 'reuniao_agendada' ||
    f.status_acompanhamento === 'reuniao_realizada'
  );
  const isPresencial = fornecedores.some(f =>
    f.status_acompanhamento === 'visita_agendada' ||
    f.status_acompanhamento === 'visita_realizada'
  );

  const ativos = fornecedores.filter(f =>
    ['visita_agendada', 'reuniao_agendada', 'visita_realizada', 'reuniao_realizada']
      .includes(f.status_acompanhamento ?? '')
  );

  const gerarLinkFornecedor = (f: FornecedorInscrito) => {
    if (!f.token_visita) return null;
    return `${window.location.origin}/entrar-reuniao/${f.id}/${f.token_visita}`;
  };

  const copiar = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado!`);
  };

  const salvarLink = async (candidaturaId: string, link: string) => {
    setSalvando(candidaturaId);
    try {
      const { error } = await (supabase as any)
        .from('candidaturas_fornecedores')
        .update({ link_reuniao: link.trim() || null })
        .eq('id', candidaturaId);
      if (error) throw error;
      onFornecedoresUpdated(
        fornecedores.map(f =>
          f.id === candidaturaId ? { ...f, link_reuniao: link.trim() || null } : f
        )
      );
      setEditandoLink(prev => { const n = { ...prev }; delete n[candidaturaId]; return n; });
      toast.success('Link de reunião salvo!');
    } catch {
      toast.error('Erro ao salvar link de reunião');
    } finally {
      setSalvando(null);
    }
  };

  const toggleExpandido = (id: string) =>
    setExpandidos(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  if (fornecedores.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        Nenhum fornecedor inscrito neste orçamento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tipo de atendimento */}
      <div className="flex items-center gap-2 flex-wrap">
        {isPresencial && (
          <Badge variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-700">
            <MapPin className="h-3 w-3" />
            Visita presencial
          </Badge>
        )}
        {isOnline && (
          <Badge variant="outline" className="gap-1.5 border-violet-300 bg-violet-50 text-violet-700">
            <Video className="h-3 w-3" />
            Reunião online
          </Badge>
        )}
        {!isPresencial && !isOnline && (
          <p className="text-sm text-muted-foreground">
            Nenhum atendimento técnico agendado ainda.
          </p>
        )}
        {ativos.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {ativos.length} fornecedor{ativos.length > 1 ? 'es' : ''} com atendimento
          </span>
        )}
      </div>

      {/* Lista de fornecedores */}
      <div className="space-y-2.5">
        {fornecedores.map(f => {
          const acessos: AcessoReuniao[] = Array.isArray(f.acessos_reuniao)
            ? (f.acessos_reuniao as AcessoReuniao[])
            : [];
          const linkFornecedor = gerarLinkFornecedor(f);
          const isAtivo = ['visita_agendada','reuniao_agendada','visita_realizada','reuniao_realizada']
            .includes(f.status_acompanhamento ?? '');
          const feito  = f.status_acompanhamento === 'visita_realizada' ||
                         f.status_acompanhamento === 'reuniao_realizada';
          const isReu  = f.status_acompanhamento === 'reuniao_agendada' ||
                         f.status_acompanhamento === 'reuniao_realizada';
          const expandido  = expandidos.has(f.id);
          const linkEdit   = f.id in editandoLink;
          const linkValor  = linkEdit ? editandoLink[f.id] : (f.link_reuniao ?? '');

          return (
            <div
              key={f.id}
              className={cn('border rounded-lg overflow-hidden', !isAtivo && 'opacity-50')}
            >
              {/* Cabeçalho */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-background">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0',
                  feito ? 'bg-green-500' : isAtivo ? 'bg-amber-400' : 'bg-gray-300'
                )} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">
                    {f.empresa && f.empresa !== f.nome ? f.empresa : f.nome}
                  </span>
                  {f.visita_confirmada_em && (
                    <span className="ml-2 text-xs text-green-600">
                      confirmado em {format(new Date(f.visita_confirmada_em), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {feito ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px] h-5 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {f.status_acompanhamento === 'visita_realizada' ? 'Visita realizada' : 'Reunião realizada'}
                    </Badge>
                  ) : isAtivo ? (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[11px] h-5 gap-1">
                      <Clock className="h-3 w-3" />
                      {f.status_acompanhamento === 'visita_agendada' ? 'Visita agendada' : 'Reunião agendada'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Sem agendamento</span>
                  )}
                  {acessos.length > 0 && (
                    <button
                      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => toggleExpandido(f.id)}
                    >
                      {acessos.length} acesso{acessos.length > 1 ? 's' : ''}
                      {expandido ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Painel online: link de reunião */}
              {isReu && (
                <div className="border-t px-3 py-2.5 bg-violet-50/40 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Link da reunião (Zoom, Meet, Teams…)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      className="h-7 text-xs"
                      placeholder="https://meet.google.com/..."
                      value={linkValor}
                      onChange={e =>
                        setEditandoLink(prev => ({ ...prev, [f.id]: e.target.value }))
                      }
                    />
                    {linkEdit && (
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3 flex-shrink-0"
                        disabled={salvando === f.id}
                        onClick={() => salvarLink(f.id, editandoLink[f.id])}
                      >
                        {salvando === f.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : 'Salvar'
                        }
                      </Button>
                    )}
                  </div>

                  {/* Link gerado para o fornecedor */}
                  {linkFornecedor ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Link do fornecedor:</span>
                      <code className="text-[11px] bg-muted rounded px-1.5 py-0.5 max-w-xs truncate">
                        {linkFornecedor}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1"
                        onClick={() => copiar(linkFornecedor, 'Link')}
                      >
                        <Copy className="h-3 w-3" />
                        Copiar
                      </Button>
                      {f.link_reuniao && (
                        <a href={f.link_reuniao} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Abrir
                          </Button>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Token de acesso não gerado. Recarregue a página ou contate o suporte.
                    </p>
                  )}
                </div>
              )}

              {/* Painel presencial: link de validação por fornecedor */}
              {!isReu && isAtivo && linkFornecedor && (
                <div className="border-t px-3 py-2 bg-amber-50/40 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Link de validação presencial:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => copiar(linkFornecedor, 'Link de validação')}
                  >
                    <Copy className="h-3 w-3" />
                    Copiar link do fornecedor
                  </Button>
                </div>
              )}

              {/* Log de acessos expandível */}
              {expandido && acessos.length > 0 && (
                <div className="border-t px-3 py-2.5 bg-slate-50/60 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Registro de acessos</p>
                  {acessos.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        {format(new Date(a.em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {a.empresa ? ` · ${a.empresa}` : ''}
                        {a.status ? ` · ${a.status}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
