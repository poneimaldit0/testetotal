import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface SeletorIconeEtapaProps {
  iconeAtual: string;
  onChange: (icone: string) => void;
}

const ICONES_COMUNS = [
  '📋', '📞', '📝', '📨', '🔄', '📄', '⭐', '🎉', '❌',
  '🤖', '👋', '🎨', '📊', '🗓️', '💼', '📂', '🔔', '✅',
  '⏰', '🎯', '💰', '📈', '🏆', '🔥', '💡', '🚀', '📦'
];

export function SeletorIconeEtapa({ iconeAtual, onChange }: SeletorIconeEtapaProps) {
  const [customIcone, setCustomIcone] = useState('');

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Ícone da Etapa</label>
      
      <div className="grid grid-cols-9 gap-2">
        {ICONES_COMUNS.map((icone) => (
          <Button
            key={icone}
            type="button"
            variant="outline"
            size="icon"
            className={`h-10 w-10 text-2xl ${
              iconeAtual === icone ? 'ring-2 ring-offset-2 ring-primary' : ''
            }`}
            onClick={() => onChange(icone)}
          >
            {icone}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Ou digite um emoji personalizado:</label>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: 🌟"
            value={customIcone}
            onChange={(e) => setCustomIcone(e.target.value)}
            maxLength={2}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (customIcone.trim()) {
                onChange(customIcone.trim());
                setCustomIcone('');
              }
            }}
            disabled={!customIcone.trim()}
          >
            Usar
          </Button>
        </div>
      </div>
    </div>
  );
}