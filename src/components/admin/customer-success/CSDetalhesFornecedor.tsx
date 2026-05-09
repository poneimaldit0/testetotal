import { useState } from 'react';
import { CSFornecedor } from '@/types/customerSuccess';
import { useCSFornecedor, useCSRituaisFornecedor, useCSHistorico } from '@/hooks/useCustomerSuccessCRM';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CSRitualSemanalTab } from './CSRitualSemanalTab';
import { CSHistoricoTab } from './CSHistoricoTab';
import { CSAnaliseTab } from './CSAnaliseTab';

interface CSDetalhesFornecedorProps {
  csFornecedor: CSFornecedor;
  onClose: () => void;
}

export function CSDetalhesFornecedor({ csFornecedor, onClose }: CSDetalhesFornecedorProps) {
  const { data: fornecedorAtualizado } = useCSFornecedor(csFornecedor.id);
  const { data: rituais } = useCSRituaisFornecedor(csFornecedor.id);
  const { data: historico } = useCSHistorico(csFornecedor.id);

  const [abaAtiva, setAbaAtiva] = useState('ritual');

  const fornecedor = fornecedorAtualizado || csFornecedor;
  const rituaisConcluidos = rituais?.filter(r => r.concluido).length || 0;

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {fornecedor.fornecedor?.nome || 'Fornecedor'}
              </h2>
              {fornecedor.fornecedor?.empresa && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {fornecedor.fornecedor.empresa}
                </div>
              )}
            </div>
            <Badge variant="outline">
              Semana {fornecedor.semana_atual}
              {fornecedor.semana_atual > 12 && ` (Ciclo ${Math.ceil(fornecedor.semana_atual / 12)})`}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Info do fornecedor */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            {fornecedor.fornecedor?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{fornecedor.fornecedor.email}</span>
              </div>
            )}
            {fornecedor.fornecedor?.telefone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{fornecedor.fornecedor.telefone}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Início: {format(new Date(fornecedor.data_inicio_acompanhamento), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
            {fornecedor.cs_responsavel && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>CS: {fornecedor.cs_responsavel.nome}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progresso geral */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progresso {fornecedor.semana_atual > 12 ? `Ciclo ${Math.ceil(fornecedor.semana_atual / 12)}` : '90 dias'}
            </span>
            <span className="text-sm text-muted-foreground">
              {rituaisConcluidos} semanas concluídas
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(((rituaisConcluidos - 1) % 12 + 1) / 12) * 100}%` }}
            />
          </div>
        </div>

        {/* Abas */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
          <TabsList className="w-full">
            <TabsTrigger value="ritual" className="flex-1">
              📅 Ritual
            </TabsTrigger>
            <TabsTrigger value="analise" className="flex-1">
              📊 Análise
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex-1">
              📜 Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ritual" className="mt-4">
            <CSRitualSemanalTab 
              csFornecedorId={fornecedor.id} 
              semanaAtual={fornecedor.semana_atual}
              rituais={rituais || []}
            />
          </TabsContent>

          <TabsContent value="analise" className="mt-4">
            <CSAnaliseTab rituais={rituais || []} />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <CSHistoricoTab 
              historico={historico || []}
              rituais={rituais || []}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
