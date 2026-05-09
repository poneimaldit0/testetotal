import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Wrench } from 'lucide-react';
import { useDataRecovery } from '@/hooks/useDataRecovery';

export const DataRecoveryPanel: React.FC = () => {
  const { 
    loading, 
    propostas, 
    detectarPropostasProblematicas, 
    tentarRecuperarProposta 
  } = useDataRecovery();

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Recuperação de Dados
        </CardTitle>
        <CardDescription>
          Detecta e recupera propostas que perderam dados durante o processo de revisão
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={detectarPropostasProblematicas}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Detectando...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Detectar Propostas Problemáticas
            </>
          )}
        </Button>

        {propostas.length > 0 && (
          <>
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {propostas.length} proposta(s) com problemas de integridade detectada(s).
                Estas propostas possuem valor total mas perderam as respostas do checklist.
              </AlertDescription>
            </Alert>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Respostas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostas.map((proposta) => (
                  <TableRow key={proposta.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proposta.fornecedor_nome}</div>
                        <div className="text-sm text-muted-foreground">{proposta.fornecedor_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{proposta.orcamento_necessidade}</div>
                        <div className="text-sm text-muted-foreground">{proposta.orcamento_local}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatarValor(proposta.valor_total_estimado)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {proposta.respostas_count} respostas
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => tentarRecuperarProposta(proposta.id)}
                      >
                        <Wrench className="w-4 h-4 mr-1" />
                        Recuperar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {propostas.length === 0 && !loading && (
          <Alert>
            <AlertDescription>
              Execute a detecção para verificar se há propostas com problemas de integridade.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};