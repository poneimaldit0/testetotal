import { useState, useEffect } from 'react';
import { FiltrosMarcenaria, EtapaMarcenaria } from '@/types/crmMarcenaria';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { X, Search, AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { ETAPAS_MARCENARIA } from '@/constants/crmMarcenaria';

interface FiltrosAvancadosMarcenariaProps {
  filtros: FiltrosMarcenaria;
  onFiltrosChange: (filtros: FiltrosMarcenaria) => void;
  onClose: () => void;
  consultores: Array<{ id: string; nome: string }>;
}

const FILTROS_RAPIDOS_PERIODO = [
  { valor: 'todos', label: 'Todos os períodos' },
  { valor: 'ultimos_7_dias', label: 'Últimos 7 dias' },
  { valor: 'ultimos_30_dias', label: 'Últimos 30 dias' },
  { valor: 'mes_atual', label: 'Este mês' },
  { valor: 'mes_anterior', label: 'Mês anterior' },
  { valor: 'personalizado', label: 'Período Personalizado' }
];

const CATEGORIAS_MARCENARIA = [
  'Cozinha', 'Closet', 'Home Office', 'Sala', 'Dormitório', 
  'Banheiro', 'Área de Serviço', 'Varanda', 'Outros'
];

const ESTILOS_DISPONIVEIS = [
  'Moderno', 'Clássico', 'Minimalista', 'Industrial', 
  'Rústico', 'Contemporâneo', 'Escandinavo'
];

export const FiltrosAvancadosMarcenaria = ({
  filtros,
  onFiltrosChange,
  onClose,
  consultores
}: FiltrosAvancadosMarcenariaProps) => {
  const [filtrosLocais, setFiltrosLocais] = useState<FiltrosMarcenaria>(filtros);
  const [buscaDebounce, setBuscaDebounce] = useState(filtros.busca || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltrosLocais((prev) => ({ ...prev, busca: buscaDebounce }));
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaDebounce]);

  const handleLimpar = () => {
    const novos: FiltrosMarcenaria = { consultor: 'todos' };
    setFiltrosLocais(novos);
    setBuscaDebounce('');
    onFiltrosChange(novos);
    onClose();
  };

  const handleAplicar = () => {
    onFiltrosChange(filtrosLocais);
    onClose();
  };

  const toggleEtapa = (etapa: EtapaMarcenaria) => {
    const atual = filtrosLocais.etapas || [];
    const novos = atual.includes(etapa)
      ? atual.filter((e) => e !== etapa)
      : [...atual, etapa];
    setFiltrosLocais({ ...filtrosLocais, etapas: novos.length > 0 ? novos : undefined });
  };

  const toggleCategoria = (cat: string) => {
    const atual = filtrosLocais.categorias || [];
    const novos = atual.includes(cat)
      ? atual.filter((c) => c !== cat)
      : [...atual, cat];
    setFiltrosLocais({ ...filtrosLocais, categorias: novos.length > 0 ? novos : undefined });
  };

  const toggleEstilo = (estilo: string) => {
    const atual = filtrosLocais.estiloPreferido || [];
    const novos = atual.includes(estilo)
      ? atual.filter((e) => e !== estilo)
      : [...atual, estilo];
    setFiltrosLocais({ ...filtrosLocais, estiloPreferido: novos.length > 0 ? novos : undefined });
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

        {/* Consultor */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">👤 Consultor Responsável</Label>
          <Select
            value={filtrosLocais.consultor || 'todos'}
            onValueChange={(v) => setFiltrosLocais({ ...filtrosLocais, consultor: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os leads</SelectItem>
              <SelectItem value="meus">Somente meus</SelectItem>
              {consultores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Categorias */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🏷️ Categorias</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS_MARCENARIA.map((cat) => (
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

        {/* Etapas */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📊 Etapas</Label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {ETAPAS_MARCENARIA.map((etapa) => (
              <div key={etapa.valor} className="flex items-center gap-2">
                <Checkbox
                  checked={filtrosLocais.etapas?.includes(etapa.valor) || false}
                  onCheckedChange={() => toggleEtapa(etapa.valor)}
                />
                <span className="text-sm">{etapa.icone} {etapa.titulo}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Estilo Preferido */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🎨 Estilo Preferido</Label>
          <div className="flex flex-wrap gap-2">
            {ESTILOS_DISPONIVEIS.map((estilo) => (
              <Button
                key={estilo}
                variant={filtrosLocais.estiloPreferido?.includes(estilo) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleEstilo(estilo)}
              >
                {estilo}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Status do Briefing */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">☑️ Status do Briefing</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filtrosLocais.briefing?.temPlanta === true}
                onCheckedChange={(checked) => {
                  setFiltrosLocais({
                    ...filtrosLocais,
                    briefing: {
                      ...filtrosLocais.briefing,
                      temPlanta: checked ? true : undefined
                    }
                  });
                }}
              />
              <span className="text-sm">Com planta</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filtrosLocais.briefing?.temMedidas === true}
                onCheckedChange={(checked) => {
                  setFiltrosLocais({
                    ...filtrosLocais,
                    briefing: {
                      ...filtrosLocais.briefing,
                      temMedidas: checked ? true : undefined
                    }
                  });
                }}
              />
              <span className="text-sm">Com medidas</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filtrosLocais.briefing?.temFotos === true}
                onCheckedChange={(checked) => {
                  setFiltrosLocais({
                    ...filtrosLocais,
                    briefing: {
                      ...filtrosLocais.briefing,
                      temFotos: checked ? true : undefined
                    }
                  });
                }}
              />
              <span className="text-sm">Com fotos</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Projeto */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">📐 Projeto</Label>
          <Select
            value={filtrosLocais.projeto || 'todos'}
            onValueChange={(v) => {
              setFiltrosLocais({ 
                ...filtrosLocais, 
                projeto: v as 'todos' | 'enviado' | 'nao_enviado'
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="enviado">Projeto enviado</SelectItem>
              <SelectItem value="nao_enviado">Projeto não enviado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Reunião */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">🗓️ Reunião</Label>
          <Select
            value={filtrosLocais.reuniao || 'todos'}
            onValueChange={(v) => {
              setFiltrosLocais({ 
                ...filtrosLocais, 
                reuniao: v as 'todos' | 'agendada' | 'realizada' | 'pendente'
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
              <SelectItem value="realizada">Realizada</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Valor Estimado */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">💰 Valor Estimado</Label>
          <Select
            value={
              !filtrosLocais.valorEstimado ? 'todos' :
              filtrosLocais.valorEstimado.min === 0 && filtrosLocais.valorEstimado.max === 10000 ? '0-10k' :
              filtrosLocais.valorEstimado.min === 10000 && filtrosLocais.valorEstimado.max === 30000 ? '10k-30k' :
              filtrosLocais.valorEstimado.min === 30000 && filtrosLocais.valorEstimado.max === 50000 ? '30k-50k' :
              filtrosLocais.valorEstimado.min === 50000 ? '50k+' : 'todos'
            }
            onValueChange={(v) => {
              if (v === 'todos') {
                const { valorEstimado, ...resto } = filtrosLocais;
                setFiltrosLocais(resto);
              } else if (v === '0-10k') {
                setFiltrosLocais({ ...filtrosLocais, valorEstimado: { min: 0, max: 10000 } });
              } else if (v === '10k-30k') {
                setFiltrosLocais({ ...filtrosLocais, valorEstimado: { min: 10000, max: 30000 } });
              } else if (v === '30k-50k') {
                setFiltrosLocais({ ...filtrosLocais, valorEstimado: { min: 30000, max: 50000 } });
              } else if (v === '50k+') {
                setFiltrosLocais({ ...filtrosLocais, valorEstimado: { min: 50000 } });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer valor</SelectItem>
              <SelectItem value="0-10k">R$ 0 - R$ 10.000</SelectItem>
              <SelectItem value="10k-30k">R$ 10.000 - R$ 30.000</SelectItem>
              <SelectItem value="30k-50k">R$ 30.000 - R$ 50.000</SelectItem>
              <SelectItem value="50k+">R$ 50.000+</SelectItem>
            </SelectContent>
          </Select>
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

        {/* Alertas e Notas */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">⚠️ Outros Filtros</Label>
          <div className="space-y-2">
            <Select
              value={
                filtrosLocais.temAlertaChecklist === true ? 'com_alerta' :
                filtrosLocais.temAlertaChecklist === false ? 'sem_alerta' : 'todos'
              }
              onValueChange={(v) => {
                if (v === 'todos') {
                  const { temAlertaChecklist, ...resto } = filtrosLocais;
                  setFiltrosLocais(resto);
                } else {
                  setFiltrosLocais({ 
                    ...filtrosLocais, 
                    temAlertaChecklist: v === 'com_alerta' 
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Alertas de checklist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (alertas)</SelectItem>
                <SelectItem value="com_alerta">Com alerta de checklist</SelectItem>
                <SelectItem value="sem_alerta">Sem alerta</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={
                filtrosLocais.comNotas === true ? 'com_notas' :
                filtrosLocais.comNotas === false ? 'sem_notas' : 'todos'
              }
              onValueChange={(v) => {
                if (v === 'todos') {
                  const { comNotas, ...resto } = filtrosLocais;
                  setFiltrosLocais(resto);
                } else {
                  setFiltrosLocais({ 
                    ...filtrosLocais, 
                    comNotas: v === 'com_notas' 
                  });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Notas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (notas)</SelectItem>
                <SelectItem value="com_notas">Com notas</SelectItem>
                <SelectItem value="sem_notas">Sem notas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Dias na Etapa */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">⏱️ Dias na Etapa Atual</Label>
          <Select
            value={
              !filtrosLocais.diasNaEtapa ? 'todos' :
              filtrosLocais.diasNaEtapa.min === 0 && filtrosLocais.diasNaEtapa.max === 7 ? '0-7' :
              filtrosLocais.diasNaEtapa.min === 7 && filtrosLocais.diasNaEtapa.max === 15 ? '7-15' :
              filtrosLocais.diasNaEtapa.min === 15 && filtrosLocais.diasNaEtapa.max === 30 ? '15-30' :
              filtrosLocais.diasNaEtapa.min === 30 ? '30+' : 'todos'
            }
            onValueChange={(v) => {
              if (v === 'todos') {
                const { diasNaEtapa, ...resto } = filtrosLocais;
                setFiltrosLocais(resto);
              } else if (v === '0-7') {
                setFiltrosLocais({ ...filtrosLocais, diasNaEtapa: { min: 0, max: 7 } });
              } else if (v === '7-15') {
                setFiltrosLocais({ ...filtrosLocais, diasNaEtapa: { min: 7, max: 15 } });
              } else if (v === '15-30') {
                setFiltrosLocais({ ...filtrosLocais, diasNaEtapa: { min: 15, max: 30 } });
              } else if (v === '30+') {
                setFiltrosLocais({ ...filtrosLocais, diasNaEtapa: { min: 30 } });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer período</SelectItem>
              <SelectItem value="0-7">0 - 7 dias</SelectItem>
              <SelectItem value="7-15">7 - 15 dias</SelectItem>
              <SelectItem value="15-30">15 - 30 dias</SelectItem>
              <SelectItem value="30+">30+ dias</SelectItem>
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
