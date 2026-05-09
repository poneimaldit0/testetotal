import React from 'react';
import { UserCircle } from 'lucide-react';

interface ConciergeInfoProps {
  concierge: {
    nome: string;
  };
}

export const ConciergeInfo: React.FC<ConciergeInfoProps> = ({ concierge }) => {
  return (
    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 text-sm text-blue-800">
        <UserCircle className="h-4 w-4" />
        <span className="font-medium">Concierge Responsável:</span>
        <span>{concierge.nome}</span>
      </div>
    </div>
  );
};
