import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PropostaResumo } from '@/hooks/usePropostas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TabelaPropostasProps {
  propostas: PropostaResumo[];
  loading: boolean;
  onVerDetalhes: (propostaId: string) => void;
}

export const TabelaPropostas: React.FC<TabelaPropostasProps> = ({
  propostas,
  loading,
  onVerDetalhes
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'bg-gray-100 text-gray-800';
      case 'enviado':
        return 'bg-blue-100 text-blue-800';
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'Rascunho';
      case 'enviado':
        return 'Enviado';
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando propostas...</span>
      </div>
    );
  }

  if (propostas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma proposta encontrada.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orçamento</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data da Proposta</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {propostas.map((proposta) => (
            <TableRow key={proposta.id} className="hover:bg-muted/50">
              <TableCell>
                <div>
                  <div className="font-medium">
                    {proposta.orcamento?.codigo_orcamento || 
                     `ORG-${proposta.candidatura?.orcamento_id?.slice(0, 8)}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {proposta.orcamento?.local}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{proposta.candidatura?.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    {proposta.candidatura?.email}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {proposta.candidatura?.empresa}
              </TableCell>
              <TableCell>
                <span className="font-semibold text-primary">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(proposta.valor_total_estimado || 0)}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(proposta.status)}>
                  {getStatusText(proposta.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(proposta.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR
                })}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  onClick={() => onVerDetalhes(proposta.id)}
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};