import { CSRitualSemanal } from '@/types/customerSuccess';
import { CSFunilConversao } from './CSFunilConversao';
import { CSComparativoSemanal } from './CSComparativoSemanal';
import { CSEvolucaoGrafico } from './CSEvolucaoGrafico';

interface CSAnaliseTabProps {
  rituais: CSRitualSemanal[];
}

export function CSAnaliseTab({ rituais }: CSAnaliseTabProps) {
  return (
    <div className="space-y-6">
      <CSFunilConversao rituais={rituais} />
      <CSComparativoSemanal rituais={rituais} />
      <CSEvolucaoGrafico rituais={rituais} />
    </div>
  );
}
