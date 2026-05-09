import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, Snowflake, Thermometer, Flame, User, Clock } from 'lucide-react';
import { useAvaliacaoLead } from '@/hooks/useAvaliacaoLead';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AvaliacaoInternaLeadProps {
  orcamentoId: string;
}

interface CriterioAvaliacao {
  key: keyof typeof defaultCriterios;
  label: string;
  pontos: number;
}

const defaultCriterios = {
  perfil_ideal: false,
  orcamento_compativel: false,
  decisor_direto: false,
  prazo_curto: false,
  engajamento_alto: false,
  fornecedor_consegue_orcar: false,
};

const CRITERIOS: CriterioAvaliacao[] = [
  { key: 'perfil_ideal', label: 'Perfil ideal (médio/alto padrão)', pontos: 2 },
  { key: 'orcamento_compativel', label: 'Orçamento compatível', pontos: 2 },
  { key: 'decisor_direto', label: 'Decisor direto', pontos: 1 },
  { key: 'prazo_curto', label: 'Prazo ≤ 90 dias', pontos: 1 },
  { key: 'engajamento_alto', label: 'Engajamento alto', pontos: 2 },
  { key: 'fornecedor_consegue_orcar', label: 'Fornecedor consegue orçar', pontos: 2 },
];

const calcularPontuacao = (criterios: typeof defaultCriterios): number => {
  return CRITERIOS.reduce((total, c) => total + (criterios[c.key] ? c.pontos : 0), 0);
};

const getClassificacao = (pontuacao: number) => {
  if (pontuacao <= 3) {
    return {
      label: 'Lead Frio',
      icon: Snowflake,
      className: 'bg-blue-100 text-blue-800 border-blue-300',
      progressColor: 'bg-blue-500',
    };
  }
  if (pontuacao <= 6) {
    return {
      label: 'Lead Morno',
      icon: Thermometer,
      className: 'bg-amber-100 text-amber-800 border-amber-300',
      progressColor: 'bg-amber-500',
    };
  }
  return {
    label: 'Lead Quente',
    icon: Flame,
    className: 'bg-green-100 text-green-800 border-green-300',
    progressColor: 'bg-green-500',
  };
};

export const AvaliacaoInternaLead = ({ orcamentoId }: AvaliacaoInternaLeadProps) => {
  const { avaliacao, isLoading, salvarAvaliacao, isSaving } = useAvaliacaoLead(orcamentoId);
  const [criterios, setCriterios] = useState(defaultCriterios);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (avaliacao) {
      setCriterios({
        perfil_ideal: avaliacao.perfil_ideal ?? false,
        orcamento_compativel: avaliacao.orcamento_compativel ?? false,
        decisor_direto: avaliacao.decisor_direto ?? false,
        prazo_curto: avaliacao.prazo_curto ?? false,
        engajamento_alto: avaliacao.engajamento_alto ?? false,
        fornecedor_consegue_orcar: avaliacao.fornecedor_consegue_orcar ?? false,
      });
      setHasChanges(false);
    }
  }, [avaliacao]);

  const handleCriterioChange = (key: keyof typeof defaultCriterios, checked: boolean) => {
    setCriterios(prev => ({ ...prev, [key]: checked }));
    setHasChanges(true);
  };

  const handleSalvar = () => {
    salvarAvaliacao(criterios);
    setHasChanges(false);
  };

  const pontuacao = calcularPontuacao(criterios);
  const classificacao = getClassificacao(pontuacao);
  const ClassificacaoIcon = classificacao.icon;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com pontuação */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">{pontuacao}/10</div>
            <Badge variant="outline" className={cn('gap-1', classificacao.className)}>
              <ClassificacaoIcon className="h-3 w-3" />
              {classificacao.label}
            </Badge>
          </div>
        </div>
        <Progress 
          value={pontuacao * 10} 
          className="h-2"
        />
      </div>

      {/* Critérios de avaliação */}
      <div className="space-y-3">
        {CRITERIOS.map((criterio) => (
          <div
            key={criterio.key}
            className={cn(
              'flex items-center justify-between p-3 border rounded-lg transition-colors',
              criterios[criterio.key] ? 'bg-primary/5 border-primary/30' : 'bg-background'
            )}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                id={criterio.key}
                checked={criterios[criterio.key]}
                onCheckedChange={(checked) => 
                  handleCriterioChange(criterio.key, checked === true)
                }
              />
              <label
                htmlFor={criterio.key}
                className="text-sm font-medium cursor-pointer"
              >
                {criterio.label}
              </label>
            </div>
            <Badge variant="secondary" className="text-xs">
              +{criterio.pontos} pt{criterio.pontos > 1 ? 's' : ''}
            </Badge>
          </div>
        ))}
      </div>

      {/* Botão salvar */}
      <Button
        onClick={handleSalvar}
        disabled={isSaving || !hasChanges}
        className="w-full"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Salvar Avaliação
          </>
        )}
      </Button>

      {/* Informação de quem avaliou */}
      {avaliacao && avaliacao.avaliado_por_nome && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{avaliacao.avaliado_por_nome}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {format(new Date(avaliacao.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
