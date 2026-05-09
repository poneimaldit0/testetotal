import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Search, Edit, Save, X, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FornecedorLimite {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  limiteAtual: number | null;
  proposasAbertas: number;
  status: string;
}

export const GerenciadorLimitesPropostas: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<FornecedorLimite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [novoLimite, setNovoLimite] = useState<number | ''>('');
  const [semLimite, setSemLimite] = useState(false);
  const [busca, setBusca] = useState('');
  const { toast } = useToast();

  const carregarFornecedores = async () => {
    try {
      setLoading(true);

      // Buscar fornecedores com seus limites e contar propostas abertas
      const { data: fornecedoresData, error: fornecedoresError } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          email,
          empresa,
          limite_propostas_abertas,
          status
        `)
        .eq('tipo_usuario', 'fornecedor')
        .order('nome');

      if (fornecedoresError) {
        console.error('Erro ao buscar fornecedores:', fornecedoresError);
        toast({
          title: "Erro",
          description: "Erro ao carregar lista de fornecedores",
          variant: "destructive"
        });
        return;
      }

      // Para cada fornecedor, contar propostas abertas
      const fornecedoresComLimites: FornecedorLimite[] = [];
      
      for (const fornecedor of fornecedoresData || []) {
        const { count } = await supabase
          .from('candidaturas_fornecedores')
          .select('*', { count: 'exact', head: true })
          .eq('fornecedor_id', fornecedor.id)
          .eq('proposta_enviada', false)
          .is('data_desistencia', null);

        fornecedoresComLimites.push({
          id: fornecedor.id,
          nome: fornecedor.nome || 'Sem nome',
          email: fornecedor.email || 'Sem email',
          empresa: fornecedor.empresa || 'Sem empresa',
          limiteAtual: fornecedor.limite_propostas_abertas,
          proposasAbertas: count || 0,
          status: fornecedor.status || 'ativo'
        });
      }

      setFornecedores(fornecedoresComLimites);

    } catch (error) {
      console.error('Erro geral ao carregar fornecedores:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const salvarLimite = async (fornecedorId: string) => {
    try {
      const valorLimite = semLimite ? null : Number(novoLimite);

      const { error } = await supabase
        .from('profiles')
        .update({
          limite_propostas_abertas: valorLimite
        })
        .eq('id', fornecedorId);

      if (error) {
        console.error('Erro ao salvar limite:', error);
        toast({
          title: "Erro",
          description: "Erro ao salvar limite",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Limite atualizado com sucesso"
      });

      setEditando(null);
      setNovoLimite('');
      setSemLimite(false);
      carregarFornecedores();

    } catch (error) {
      console.error('Erro geral ao salvar limite:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar",
        variant: "destructive"
      });
    }
  };

  const iniciarEdicao = (fornecedor: FornecedorLimite) => {
    setEditando(fornecedor.id);
    setNovoLimite(fornecedor.limiteAtual || '');
    setSemLimite(fornecedor.limiteAtual === null);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setNovoLimite('');
    setSemLimite(false);
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  // Filtrar fornecedores pela busca
  const fornecedoresFiltrados = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    f.email.toLowerCase().includes(busca.toLowerCase()) ||
    f.empresa.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Limites de Propostas</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600">
            <Users className="h-3 w-3 mr-1" />
            {fornecedores.length} fornecedores
          </Badge>
          <Button onClick={carregarFornecedores} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou empresa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de fornecedores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando fornecedores...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Limite Atual</TableHead>
                  <TableHead>Propostas Abertas</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedoresFiltrados.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{fornecedor.nome}</p>
                        <p className="text-sm text-gray-500">{fornecedor.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{fornecedor.empresa}</TableCell>
                    <TableCell>
                      <Badge variant={fornecedor.status === 'ativo' ? 'default' : 'secondary'}>
                        {fornecedor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editando === fornecedor.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={semLimite}
                              onCheckedChange={setSemLimite}
                            />
                            <Label className="text-xs">Sem limite</Label>
                          </div>
                          {!semLimite && (
                            <Input
                              type="number"
                              value={novoLimite}
                              onChange={(e) => setNovoLimite(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-20"
                              min="1"
                              max="100"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">
                          {fornecedor.limiteAtual === null ? 'Sem limite' : fornecedor.limiteAtual}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{fornecedor.proposasAbertas}</span>
                    </TableCell>
                    <TableCell>
                      {fornecedor.limiteAtual !== null && fornecedor.proposasAbertas >= fornecedor.limiteAtual ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Limite atingido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 text-xs">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editando === fornecedor.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => salvarLimite(fornecedor.id)}
                            disabled={!semLimite && (novoLimite === '' || Number(novoLimite) < 1)}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelarEdicao}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => iniciarEdicao(fornecedor)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && fornecedoresFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>Nenhum fornecedor encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};