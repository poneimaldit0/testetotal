import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataIntegrityCheck } from '@/hooks/useDataIntegrityCheck';
import { Search, AlertTriangle, RefreshCw, Wrench } from 'lucide-react';

export const DataIntegrityPanel = () => {
  const { loading, problemas, verificarIntegridadeDados, corrigirProblem } = useDataIntegrityCheck();

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
          <Search className="h-5 w-5" />
          Verificação de Integridade de Dados
        </CardTitle>
        <CardDescription>
          Identifica e corrige problemas de integridade nas propostas, especialmente relacionados a revisões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={verificarIntegridadeDados}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Verificando...' : 'Verificar Integridade'}
          </Button>
        </div>

        {problemas.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Encontrados {problemas.length} problema(s) de integridade que podem afetar a exibição no comparador cliente.
            </AlertDescription>
          </Alert>
        )}

        {problemas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Problemas Encontrados</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Respostas</TableHead>
                  <TableHead>Problema</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problemas.map((problema, index) => (
                  <TableRow key={index}>
                    <TableCell>{problema.fornecedor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatarValor(problema.valorTotal)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={problema.respostasCount === 0 ? "destructive" : "secondary"}>
                        {problema.respostasCount} respostas
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {problema.problema}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => corrigirProblem(problema.checklistPropostaId)}
                        className="flex items-center gap-1"
                      >
                        <Wrench className="h-3 w-3" />
                        Corrigir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && problemas.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              Nenhum problema de integridade encontrado ou verificação ainda não executada.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};