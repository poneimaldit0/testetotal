
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Mail, Phone, Users, Clock, FileText } from 'lucide-react';
import { StatusSelector } from './StatusSelector';
import { ChecklistProposta } from './ChecklistProposta';
import { AnexosOrcamento } from './AnexosOrcamento';
import { OrcamentoMeusOrcamentos } from '@/hooks/useMeusOrcamentosFix';
import { useOrcamentoChecklist } from '@/hooks/useOrcamentoChecklist';
import { useAuth } from '@/hooks/useAuth';
import { abrirWhatsApp } from '@/utils/orcamentoUtils';

interface MeusOrcamentosCardProps {
  orcamento: OrcamentoMeusOrcamentos;
  onStatusChange: () => void;
}

export const MeusOrcamentosCard: React.FC<MeusOrcamentosCardProps> = ({
  orcamento,
  onStatusChange,
}) => {
  const { profile } = useAuth();
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const { checklistItems } = useOrcamentoChecklist(orcamento.id);
  const [candidaturaId, setCandidaturaId] = useState<string | null>(null);

  // Buscar candidatura ID quando necessário
  useEffect(() => {
    if (checklistModalOpen && !candidaturaId) {
      setCandidaturaId(orcamento.inscricaoId);
    }
  }, [checklistModalOpen, candidaturaId, orcamento.inscricaoId]);

  const handleWhatsApp = (telefone: string, nomeCliente: string, orcamentoId: string) => {
    abrirWhatsApp(
      telefone, nomeCliente, orcamentoId,
      profile?.nome || 'Fornecedor',
      profile?.empresa || 'Empresa',
      orcamento.local
    );
  };

  const getStatusColor = (status: string) => {
    return status === 'aberto' 
      ? 'bg-green-500 hover:bg-green-600' 
      : 'bg-gray-500 hover:bg-gray-600';
  };

  return (
    <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-gray-800 font-semibold">
              Orçamento #{orcamento.id.slice(-8)}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Inscrito em {format(orcamento.dataInscricao, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Badge className={getStatusColor(orcamento.status)}>
              {orcamento.status.toUpperCase()}
            </Badge>
            {orcamento.categorias.map((categoria, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                {categoria}
              </Badge>
            ))}
            <StatusSelector
              inscricaoId={orcamento.inscricaoId}
              statusAtual={orcamento.statusAcompanhamento}
              onStatusChange={onStatusChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{orcamento.necessidade}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Local:</span> 
              <span className="ml-1 text-gray-800">{orcamento.local}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Tamanho:</span> 
              <span className="ml-1 text-gray-800">{orcamento.tamanhoImovel || 'N/A'} m²</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-600">Empresas:</span> 
              <span className="ml-1 text-gray-800">{orcamento.quantidadeEmpresas}/{orcamento.horariosVisitaTotal ?? 3}</span>
            </div>
          </div>

          {/* Debug dos anexos */}
          {(() => {
            console.log(`📂 [MeusOrcamentosCard] ${orcamento.id}: arquivos=${orcamento.arquivos?.length}, fotos=${orcamento.fotos?.length}`);
            console.log(`📂 [MeusOrcamentosCard] ${orcamento.id}: arquivos=`, orcamento.arquivos);
            console.log(`📂 [MeusOrcamentosCard] ${orcamento.id}: fotos=`, orcamento.fotos);
            return null;
          })()}
          
          {/* Exibir anexos - sempre disponíveis em "Minhas Candidaturas" */}
          {(orcamento.arquivos?.length > 0 || orcamento.fotos?.length > 0) && (
            <AnexosOrcamento 
              arquivos={orcamento.arquivos || []} 
              fotos={orcamento.fotos || []} 
            />
          )}

          {orcamento.dadosContato ? (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Dados de Contato do Cliente:
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Nome:</strong> {orcamento.dadosContato.nome}</p>
                <p><strong>Telefone:</strong> {orcamento.dadosContato.telefone}</p>
                <p><strong>E-mail:</strong> {orcamento.dadosContato.email}</p>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button
                  onClick={() => handleWhatsApp(
                    orcamento.dadosContato!.telefone, 
                    orcamento.dadosContato!.nome, 
                    orcamento.id
                  )}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  onClick={() => window.open(`mailto:${orcamento.dadosContato!.email}`, '_blank')}
                  variant="outline"
                  size="sm"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  E-mail
                </Button>
                
                {/* Botão do Checklist */}
                {checklistItems.length > 0 && (
                  <Button
                    onClick={() => setChecklistModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Preencher Proposta
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                {orcamento.status === 'fechado' ? (
                  <>
                    <Users className="h-3 w-3" />
                    Orçamento fechado - Entre em contato o quanto antes!
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    Orçamento ainda aberto - Você pode entrar em contato.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                ⚠️ Os dados de contato não estão disponíveis para este orçamento.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal do Checklist */}
      <Dialog open={checklistModalOpen} onOpenChange={setChecklistModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposta para Orçamento #{orcamento.id.slice(-8)}</DialogTitle>
          </DialogHeader>
          
          {candidaturaId && (
            <ChecklistProposta
              orcamentoId={orcamento.id}
              candidaturaId={candidaturaId}
              readonly={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
