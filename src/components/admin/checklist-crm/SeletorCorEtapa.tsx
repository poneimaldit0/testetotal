import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface SeletorCorEtapaProps {
  corAtual: string;
  onChange: (cor: string) => void;
}

const CORES_DISPONIVEIS = [
  { nome: 'Azul', classe: 'bg-blue-500', hex: '#3b82f6' },
  { nome: 'Amarelo', classe: 'bg-yellow-500', hex: '#eab308' },
  { nome: 'Laranja', classe: 'bg-orange-500', hex: '#f97316' },
  { nome: 'Roxo', classe: 'bg-purple-500', hex: '#a855f7' },
  { nome: 'Índigo', classe: 'bg-indigo-500', hex: '#6366f1' },
  { nome: 'Verde', classe: 'bg-green-500', hex: '#22c55e' },
  { nome: 'Teal', classe: 'bg-teal-500', hex: '#14b8a6' },
  { nome: 'Esmeralda', classe: 'bg-emerald-600', hex: '#059669' },
  { nome: 'Vermelho', classe: 'bg-red-600', hex: '#dc2626' },
  { nome: 'Cinza', classe: 'bg-gray-500', hex: '#6b7280' },
  { nome: 'Slate', classe: 'bg-slate-500', hex: '#64748b' },
  { nome: 'Ciano', classe: 'bg-cyan-500', hex: '#06b6d4' },
  { nome: 'Rosa', classe: 'bg-pink-500', hex: '#ec4899' },
  { nome: 'Violeta', classe: 'bg-violet-500', hex: '#8b5cf6' },
];

export function SeletorCorEtapa({ corAtual, onChange }: SeletorCorEtapaProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Cor da Etapa</label>
      <div className="grid grid-cols-7 gap-2">
        {CORES_DISPONIVEIS.map((cor) => (
          <Button
            key={cor.classe}
            type="button"
            variant="outline"
            size="icon"
            className={`h-10 w-10 ${cor.classe} hover:opacity-80 relative ${
              corAtual === cor.classe ? 'ring-2 ring-offset-2 ring-foreground' : ''
            }`}
            onClick={() => onChange(cor.classe)}
            title={cor.nome}
          >
            {corAtual === cor.classe && (
              <Check className="h-4 w-4 text-white absolute" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}