
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Mail, Phone, Building2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CadastroPendente {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  empresa: string;
  created_at: string;
}

interface TabelaCadastrosPendentesProps {
  cadastros: CadastroPendente[];
  onAprovar: (id: string) => void;
  onRejeitar: (id: string) => void;
  processando?: string;
}

const TabelaCadastrosPendentes = ({ 
  cadastros, 
  onAprovar, 
  onRejeitar,
  processando 
}: TabelaCadastrosPendentesProps) => {
  if (cadastros.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum cadastro pendente</h3>
          <p className="text-gray-600">Não há solicitações de cadastro aguardando aprovação.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Data do Cadastro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cadastros.map((cadastro) => (
              <TableRow key={cadastro.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div>
                      <p className="font-medium">{cadastro.nome}</p>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        <span>{cadastro.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm">
                    <Phone className="h-3 w-3 text-gray-500" />
                    <span>{cadastro.telefone || 'Não informado'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm">
                    <Building2 className="h-3 w-3 text-gray-500" />
                    <span>{cadastro.empresa || 'Não informado'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span>
                      {format(new Date(cadastro.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      onClick={() => onAprovar(cadastro.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={processando === cadastro.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => onRejeitar(cadastro.id)}
                      size="sm"
                      variant="destructive"
                      disabled={processando === cadastro.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TabelaCadastrosPendentes;
