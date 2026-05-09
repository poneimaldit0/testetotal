
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Mail, Phone, Users, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrcamentoGlobal } from '@/hooks/useOrcamentosGlobal';
import { ContatoSection } from './ContatoSection';
import { AnexosOrcamento } from './AnexosOrcamento';

interface OrcamentoCardProps {
  orcamento: OrcamentoGlobal;
  jaInscrito: boolean;
  onOpenModal: (orcamentoId: string) => void;
  onAbrirWhatsApp: (telefone: string, nome: string, orcamentoId: string) => void;
}

export const OrcamentoCard: React.FC<OrcamentoCardProps> = ({
  orcamento,
  jaInscrito,
  onOpenModal,
  onAbrirWhatsApp,
}) => {
  // Função para exibir o prazo pretendido
  const exibirPrazoInicio = () => {
    // Se existe prazoInicioTexto (texto do prazo), exibir isso
    if (orcamento.prazoInicioTexto) {
      return orcamento.prazoInicioTexto;
    }
    
    // Caso contrário, formatar como data
    if (orcamento.dataInicio instanceof Date) {
      return format(orcamento.dataInicio, 'dd/MM/yyyy');
    }
    
    // Se for string mas não for um prazo conhecido, tentar exibir como está
    return typeof orcamento.dataInicio === 'string' ? orcamento.dataInicio : 'Não informado';
  };

  const isHistorico = orcamento.status === 'fechado' && !orcamento.estaInscrito;
  
  return (
    <Card className={`w-full max-w-full box-border overflow-hidden bg-white shadow-lg border rounded-xl hover:shadow-xl transition-shadow ${
      isHistorico ? 'border-gray-200 opacity-90' : 'border-gray-100'
    }`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className={`text-lg font-semibold ${
              isHistorico ? 'text-gray-600' : 'text-gray-800'
            }`}>
              Orçamento #{orcamento.id.slice(-8)}
              {isHistorico && (
                <span className="text-xs text-gray-500 ml-2 font-normal">(Histórico)</span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Publicado em {format(orcamento.dataPublicacao, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            {orcamento.estaInscrito && orcamento.inscritoEm && (
              <p className="text-xs text-blue-600">
                Inscrito em {format(orcamento.inscritoEm, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap max-w-full overflow-hidden">
            <Badge className={orcamento.status === 'aberto' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'}>
              {orcamento.status.toUpperCase()}
            </Badge>
            {orcamento.estaInscrito && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                INSCRITO
              </Badge>
            )}
            {orcamento.categorias.map((categoria, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 max-w-[120px] truncate">
                {categoria}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-700 break-words overflow-wrap-anywhere">{orcamento.necessidade}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm min-w-0 max-w-full overflow-hidden">
            <div className="min-w-0 max-w-full overflow-hidden">
              <span className="font-medium text-gray-600">Local:</span> 
              <span className="ml-1 text-gray-800 truncate block">{orcamento.local}</span>
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              <span className="font-medium text-gray-600">Tamanho:</span> 
              <span className="ml-1 text-gray-800 truncate block">{orcamento.tamanhoImovel || 'N/A'} m²</span>
            </div>
            <div className="flex items-center gap-1 min-w-0 max-w-full overflow-hidden">
              <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-600">Empresas:</span> 
              <span className="ml-1 text-gray-800 truncate">{orcamento.quantidadeEmpresas}/3</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-600">Início pretendido:</span>{' '}
              {exibirPrazoInicio()}
            </div>
            
            {/* Botões de ação */}
            {orcamento.status === 'aberto' && !orcamento.estaInscrito ? (
              <DialogTrigger asChild>
                <Button 
                  onClick={() => onOpenModal(orcamento.id)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Inscrever-se
                </Button>
              </DialogTrigger>
            ) : orcamento.estaInscrito ? (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                Inscrito
              </Badge>
            ) : orcamento.status === 'fechado' ? (
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-gray-500" />
                <Badge variant="secondary" className="text-gray-600">
                  Fechado - 3 empresas
                </Badge>
              </div>
            ) : null}
          </div>

          {/* Debug dos anexos */}
          {(() => {
            console.log(`📂 [OrcamentoCard] ${orcamento.id}: estaInscrito=${orcamento.estaInscrito}, arquivos=${orcamento.arquivos?.length}, fotos=${orcamento.fotos?.length}`);
            console.log(`📂 [OrcamentoCard] ${orcamento.id}: arquivos=`, orcamento.arquivos);
            console.log(`📂 [OrcamentoCard] ${orcamento.id}: fotos=`, orcamento.fotos);
            return null;
          })()}
          
          {/* Exibir anexos se o fornecedor estiver inscrito */}
          {orcamento.estaInscrito && (orcamento.arquivos?.length > 0 || orcamento.fotos?.length > 0) && (
            <AnexosOrcamento 
              arquivos={orcamento.arquivos || []} 
              fotos={orcamento.fotos || []} 
            />
          )}

          {/* Mostrar dados do cliente se inscrito e orçamento fechado */}
          {orcamento.estaInscrito && orcamento.status === 'fechado' && orcamento.dadosContato && (
            <ContatoSection
              dadosContato={orcamento.dadosContato}
              orcamentoId={orcamento.id}
              localReforma={orcamento.local}
            />
          )}

        </div>
      </CardContent>
    </Card>
  );
};
