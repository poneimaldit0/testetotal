import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, User, Building2, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useDesistenciasPropostas } from '@/hooks/useDesistenciasPropostas';
import { useDesistenciasAdmin } from '@/hooks/useDesistenciasAdmin';
import { useAuth } from '@/hooks/useAuth';
import { AvaliarDesistenciaModal } from './AvaliarDesistenciaModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DesistenciaComDados {
  id: string;
  candidaturaId: string;
  motivoCategoria: string;
  justificativa: string;
  dataHora: Date;
  aprovada?: boolean;
  orcamentoInfo?: {
    necessidade: string;
    codigo: string;
  };
  fornecedorInfo?: {
    nome: string;
    email: string;
    empresa: string;
  };
}

export const FilaDesistenciasPropostas = () => {
  const { profile } = useAuth();
  
  // Usar hook específico baseado no tipo de usuário
  const isAdmin = profile?.tipo_usuario === 'admin' || profile?.tipo_usuario === 'master';
  const adminHook = useDesistenciasAdmin();
  const fornecedorHook = useDesistenciasPropostas();
  
  const { desistencias, loading, recarregar } = isAdmin ? adminHook : fornecedorHook;
  const [selectedDesistencia, setSelectedDesistencia] = useState<DesistenciaComDados | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const pendentes = desistencias.filter(d => d.aprovada === undefined);
  const aprovadas = desistencias.filter(d => d.aprovada === true);
  const rejeitadas = desistencias.filter(d => d.aprovada === false);

  const handleAvaliar = (desistencia: DesistenciaComDados) => {
    setSelectedDesistencia(desistencia);
    setModalOpen(true);
  };

  const getStatusBadge = (aprovada?: boolean) => {
    if (aprovada === undefined) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
    if (aprovada) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprovada</Badge>;
    }
    return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
  };

  const renderTable = (items: DesistenciaComDados[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Orçamento</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((desistencia) => (
          <TableRow key={desistencia.id}>
            <TableCell>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{desistencia.fornecedorInfo?.nome || 'Nome não disponível'}</p>
                  <p className="text-sm text-muted-foreground">{desistencia.fornecedorInfo?.empresa}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{desistencia.orcamentoInfo?.codigo || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {desistencia.orcamentoInfo?.necessidade || 'Descrição não disponível'}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <Badge variant="outline" className="mb-1">
                  {desistencia.motivoCategoria.replace(/_/g, ' ')}
                </Badge>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {desistencia.justificativa}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(desistencia.dataHora, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>
            </TableCell>
            <TableCell>
              {getStatusBadge(desistencia.aprovada)}
            </TableCell>
            <TableCell>
              {desistencia.aprovada === undefined ? (
                <Button
                  size="sm"
                  onClick={() => handleAvaliar(desistencia)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Avaliar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAvaliar(desistencia)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Ver Detalhes
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando desistências...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestão de Desistências</h2>
          <Button onClick={recarregar} variant="outline">
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{pendentes.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{aprovadas.length}</p>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{rejeitadas.length}</p>
                  <p className="text-sm text-muted-foreground">Rejeitadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Desistência</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pendentes" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pendentes" className="relative">
                  Pendentes
                  {pendentes.length > 0 && (
                    <Badge className="ml-2 bg-yellow-500 text-white text-xs">
                      {pendentes.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="aprovadas">Aprovadas</TabsTrigger>
                <TabsTrigger value="rejeitadas">Rejeitadas</TabsTrigger>
              </TabsList>

              <TabsContent value="pendentes" className="mt-4">
                {pendentes.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <p className="text-lg font-medium">Nenhuma solicitação pendente</p>
                    <p className="text-muted-foreground">Todas as solicitações foram avaliadas</p>
                  </div>
                ) : (
                  renderTable(pendentes)
                )}
              </TabsContent>

              <TabsContent value="aprovadas" className="mt-4">
                {aprovadas.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma desistência aprovada</p>
                  </div>
                ) : (
                  renderTable(aprovadas)
                )}
              </TabsContent>

              <TabsContent value="rejeitadas" className="mt-4">
                {rejeitadas.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma desistência rejeitada</p>
                  </div>
                ) : (
                  renderTable(rejeitadas)
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AvaliarDesistenciaModal
        desistencia={selectedDesistencia}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={recarregar}
      />
    </>
  );
};