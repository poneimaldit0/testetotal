import { useState, useEffect } from 'react';
import { FiltrosCRM, StatusContato } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { X, Search, Tag, Check, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { STATUS_CONTATO } from '@/constants/crmEtapas';
import { PRAZOS_INICIO } from '@/constants/orcamento';
import { FornecedorSearchInput } from './FornecedorSearchInput';
import { useTags } from '@/hooks/useTags';

interface FiltrosAvancadosCRMProps {
  filtros: FiltrosCRM;
  onFiltrosChange: (filtros: FiltrosCRM) => void;
  onClose: () => void;
  concierges: Array<{ id: string; nome: string }>;
}

const FILTROS_RAPIDOS_PERIODO = [
  { valor: 'todos', label: 'Todos os períodos' },
  { valor: 'ultimos_7_dias', label: 'Últimos 7 dias' },
  { valor: 'ultimos_30_dias', label: 'Últimos 30 dias' },
  { valor: 'mes_atual', label: 'Este mês' },
  { valor: 'mes_anterior', label: 'Mês anterior' },
  { valor: 'personalizado', label: 'Período Personalizado' }
];

const CATEGORIAS_DISPONIVEIS = [
  'Reforma', 'Pintura', 'Elétrica', 'Hidráulica', 'Marcenaria', 
  'Gesso', 'Alvenaria', 'Paisagismo', 'Decoração'
];

export const FiltrosAvancadosCRM = ({
  filtros,
  onFiltrosChange,
  onClose,
  concierges
}: FiltrosAvancadosCRMProps) => {
  const [filtrosLocais, setFiltrosLocais] = useState<FiltrosCRM>(filtros);
  const [buscaDebounce, setBuscaDebounce] = useState(filtros.busca || '');
  const { tags } = useTags();

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltrosLocais((prev) => ({ ...prev, busca: buscaDebounce }));
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaDebounce]);

  const handleLimpar = () => {
    const novos: FiltrosCRM = { 
      concierge: 'todos'
    };
    setFiltrosLocais(novos);
    setBuscaDebounce('');
    onFiltrosChange(novos);
    onClose();
  };

  const handleAplicar = () => {
    onFiltrosChange(filtrosLocais);
    onClose();
  };

  const toggleStatusContato = (status: StatusContato) => {
    const atual = filtrosLocais.statusContato || [];
    const novos = atual.includes(status)
      ? atual.filter((s) => s !== status)
      : [...atual, status];
    setFiltrosLocais({ ...filtrosLocais, statusContato: novos.length > 0 ? novos : undefined });
  };

  const toggleCategoria = (cat: string) => {
    const atual = filtrosLocais.categorias || [];
    const novos = atual.includes(cat)
      ? atual.filter((c) => c !== cat)
      : [...atual, cat];
    setFiltrosLocais({ ...filtrosLocais, categorias: novos.length > 0 ? novos : undefined });
  };

  const toggleInicioPretendido = (prazo: string) => {
    const atual = filtrosLocais.iniciosPretendidos || [];
    const novos = atual.includes(prazo)
      ? atual.filter((p) => p !== prazo)
      : [...atual, prazo];
    setFiltrosLocais({ ...filtrosLocais, iniciosPretendidos: novos.length > 0 ? novos : undefined });
  };

  const toggleTag = (tagId: string) => {
    const atual = filtrosLocais.tags || [];
    const novos = atual.includes(tagId)
      ? atual.filter(id => id !== tagId)
      : [...atual, tagId];
    
    setFiltrosLocais({
      ...filtrosLocais,
      tags: novos.length > 0 ? novos : undefined
    });
  };

  const handleFornecedoresChange = (fornecedorIds: string[]) => {
    setFiltrosLocais({ 
      ...filtrosLocais, 
      fornecedoresIds: fornecedorIds.length > 0 ? fornecedorIds : undefined 
    });
  };

  return (
    <div className="w-[450px] max-h-[600px] overflow-y-auto">
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <h3 className="font-semibold text-lg">🔍 Filtros Avançados</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Busca por texto */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🔍 Buscar por texto</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome, telefone, código, local..."
              value={buscaDebounce}
              onChange={(e) => setBuscaDebounce(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Separator />

        {/* Concierge */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">👤 Concierge</Label>
          <Select
            value={filtrosLocais.concierge || 'todos'}
            onValueChange={(v) => setFiltrosLocais({ ...filtrosLocais, concierge: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os orçamentos</SelectItem>
              <SelectItem value="meus">Somente meus</SelectItem>
              <SelectItem value="sem_responsavel">🚫 Sem responsável</SelectItem>
              {concierges.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Status de contato */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📞 Status de Contato</Label>
          <div className="space-y-2">
            {STATUS_CONTATO.map((status) => (
              <div key={status.valor} className="flex items-center gap-2">
                <Checkbox
                  checked={filtrosLocais.statusContato?.includes(status.valor as StatusContato) || false}
                  onCheckedChange={() => toggleStatusContato(status.valor as StatusContato)}
                />
                <span className="text-sm">{status.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Período */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📅 Período de Criação</Label>
          <Select
            value={filtrosLocais.periodo?.tipo || 'todos'}
            onValueChange={(v) => {
              if (v === 'todos') {
                const { periodo, ...resto } = filtrosLocais;
                setFiltrosLocais(resto);
              } else {
                setFiltrosLocais({
                  ...filtrosLocais,
                  periodo: { tipo: v as any, inicio: undefined, fim: undefined }
                });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTROS_RAPIDOS_PERIODO.map((f) => (
                <SelectItem key={f.valor} value={f.valor}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtrosLocais.periodo?.tipo === 'personalizado' && (
            <div className="mt-3 p-3 border rounded-lg space-y-2 bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={filtrosLocais.periodo?.inicio || ''}
                  onChange={(e) => setFiltrosLocais({
                    ...filtrosLocais,
                    periodo: { ...filtrosLocais.periodo!, inicio: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={filtrosLocais.periodo?.fim || ''}
                  onChange={(e) => setFiltrosLocais({
                    ...filtrosLocais,
                    periodo: { ...filtrosLocais.periodo!, fim: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Início Pretendido */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">⏰ Início Pretendido</Label>
          <div className="flex flex-wrap gap-2">
            {PRAZOS_INICIO.map((prazo) => (
              <Button
                key={prazo}
                variant={filtrosLocais.iniciosPretendidos?.includes(prazo) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleInicioPretendido(prazo)}
              >
                {prazo}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Fornecedores inscritos */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📊 Fornecedores Inscritos</Label>
          <Select
            value={
              filtrosLocais.fornecedoresInscritos?.min === 0 && filtrosLocais.fornecedoresInscritos?.max === 0 ? '0' :
              filtrosLocais.fornecedoresInscritos?.min === 1 && filtrosLocais.fornecedoresInscritos?.max === 3 ? '1-3' :
              filtrosLocais.fornecedoresInscritos?.min === 4 && filtrosLocais.fornecedoresInscritos?.max === 6 ? '4-6' :
              filtrosLocais.fornecedoresInscritos?.min === 7 ? '7+' : 'todos'
            }
            onValueChange={(v) => {
              if (v === 'todos') {
                const { fornecedoresInscritos, ...resto } = filtrosLocais;
                setFiltrosLocais(resto);
              } else if (v === '0') {
                setFiltrosLocais({ ...filtrosLocais, fornecedoresInscritos: { min: 0, max: 0 } });
              } else if (v === '1-3') {
                setFiltrosLocais({ ...filtrosLocais, fornecedoresInscritos: { min: 1, max: 3 } });
              } else if (v === '4-6') {
                setFiltrosLocais({ ...filtrosLocais, fornecedoresInscritos: { min: 4, max: 6 } });
              } else if (v === '7+') {
                setFiltrosLocais({ ...filtrosLocais, fornecedoresInscritos: { min: 7 } });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer quantidade</SelectItem>
              <SelectItem value="0">Nenhum (0)</SelectItem>
              <SelectItem value="1-3">Poucos (1-3)</SelectItem>
              <SelectItem value="4-6">Médio (4-6)</SelectItem>
              <SelectItem value="7+">Muitos (7+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Propostas enviadas */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📝 Propostas Enviadas</Label>
          <Select
            value={
              filtrosLocais.propostasEnviadas?.min === 0 && filtrosLocais.propostasEnviadas?.max === 0 ? '0' :
              filtrosLocais.propostasEnviadas?.min === 1 && filtrosLocais.propostasEnviadas?.max === 2 ? '1-2' :
              filtrosLocais.propostasEnviadas?.min === 3 && filtrosLocais.propostasEnviadas?.max === 5 ? '3-5' :
              filtrosLocais.propostasEnviadas?.min === 6 ? '6+' : 'todos'
            }
            onValueChange={(v) => {
              if (v === 'todos') {
                const { propostasEnviadas, ...resto } = filtrosLocais;
                setFiltrosLocais(resto);
              } else if (v === '0') {
                setFiltrosLocais({ ...filtrosLocais, propostasEnviadas: { min: 0, max: 0 } });
              } else if (v === '1-2') {
                setFiltrosLocais({ ...filtrosLocais, propostasEnviadas: { min: 1, max: 2 } });
              } else if (v === '3-5') {
                setFiltrosLocais({ ...filtrosLocais, propostasEnviadas: { min: 3, max: 5 } });
              } else if (v === '6+') {
                setFiltrosLocais({ ...filtrosLocais, propostasEnviadas: { min: 6 } });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer quantidade</SelectItem>
              <SelectItem value="0">Nenhuma (0)</SelectItem>
              <SelectItem value="1-2">Poucas (1-2)</SelectItem>
              <SelectItem value="3-5">Médio (3-5)</SelectItem>
              <SelectItem value="6+">Muitas (6+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Categorias */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🏷️ Categorias</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS_DISPONIVEIS.map((cat) => (
              <Button
                key={cat}
                variant={filtrosLocais.categorias?.includes(cat) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleCategoria(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Fornecedores */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🏢 Fornecedores</Label>
          <FornecedorSearchInput
            selectedIds={filtrosLocais.fornecedoresIds || []}
            onSelectionChange={handleFornecedoresChange}
          />
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Filtrar por Tags
          </Label>
          
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selecionado = filtrosLocais.tags?.includes(tag.id);
              return (
                <Button
                  key={tag.id}
                  variant={selecionado ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleTag(tag.id)}
                  className="h-7"
                  style={{
                    backgroundColor: selecionado ? tag.cor : undefined,
                    borderColor: tag.cor,
                    color: selecionado ? '#fff' : undefined
                  }}
                >
                  {tag.nome}
                  {selecionado && <Check className="h-3 w-3 ml-1" />}
                </Button>
              );
            })}
          </div>
          
          {filtrosLocais.tags && filtrosLocais.tags.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filtrosLocais.tags.length} tag(s) selecionada(s)
            </p>
          )}
        </div>

        <Separator />

        {/* Filtros de Tarefas */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📋 Tarefas</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="semTarefas"
                checked={filtrosLocais.semTarefas || false}
                onCheckedChange={(checked) =>
                  setFiltrosLocais({ ...filtrosLocais, semTarefas: checked as boolean })
                }
              />
              <label htmlFor="semTarefas" className="text-sm cursor-pointer flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Sem tarefas agendadas
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="tarefasAtrasadas"
                checked={filtrosLocais.tarefasAtrasadas || false}
                onCheckedChange={(checked) =>
                  setFiltrosLocais({ ...filtrosLocais, tarefasAtrasadas: checked as boolean })
                }
              />
              <label htmlFor="tarefasAtrasadas" className="text-sm cursor-pointer flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Com tarefas atrasadas
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="tarefasHoje"
                checked={filtrosLocais.tarefasHoje || false}
                onCheckedChange={(checked) =>
                  setFiltrosLocais({ ...filtrosLocais, tarefasHoje: checked as boolean })
                }
              />
              <label htmlFor="tarefasHoje" className="text-sm cursor-pointer flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Com tarefas para hoje
              </label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Feedback */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">⭐ Feedback</Label>
          <Select
            value={
              filtrosLocais.comFeedback === true ? 'com' :
              filtrosLocais.comFeedback === false ? 'sem' : 'todos'
            }
            onValueChange={(v) => {
              if (v === 'todos') {
                const { comFeedback, ...resto } = filtrosLocais;
                setFiltrosLocais(resto);
              } else {
                setFiltrosLocais({ ...filtrosLocais, comFeedback: v === 'com' });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="com">Com feedback</SelectItem>
              <SelectItem value="sem">Sem feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t p-4 flex gap-2">
        <Button variant="outline" onClick={handleLimpar} className="flex-1">
          Limpar Filtros
        </Button>
        <Button onClick={handleAplicar} className="flex-1">
          Aplicar e Fechar
        </Button>
      </div>
    </div>
  );
};