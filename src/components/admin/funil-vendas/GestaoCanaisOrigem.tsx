import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useFunilVendas } from '@/hooks/useFunilVendas';
import { FunilCanalOrigem } from '@/types/funilVendas';

export const GestaoCanaisOrigem: React.FC = () => {
  const { buscarTodosCanaisOrigem, criarCanalOrigem, atualizarCanalOrigem, excluirCanalOrigem } = useFunilVendas();
  const [canais, setCanais] = useState<FunilCanalOrigem[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await buscarTodosCanaisOrigem();
    setCanais(data);
    setLoading(false);
  };

  const handleCriar = async () => {
    if (!novoNome.trim()) return;
    const result = await criarCanalOrigem(novoNome.trim());
    if (result) {
      setNovoNome('');
      loadData();
    }
  };

  const handleToggle = async (canal: FunilCanalOrigem) => {
    const ok = await atualizarCanalOrigem(canal.id, { ativo: !canal.ativo });
    if (ok) loadData();
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal?')) return;
    const ok = await excluirCanalOrigem(id);
    if (ok) loadData();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Canais de Origem</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              placeholder="Nome do novo canal..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
            />
          </div>
          <Button onClick={handleCriar} disabled={!novoNome.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {canais.map(canal => (
              <TableRow key={canal.id}>
                <TableCell className="font-medium">{canal.nome}</TableCell>
                <TableCell>
                  <Badge variant={canal.ativo ? 'default' : 'secondary'}>
                    {canal.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(canal)}>
                      {canal.ativo ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleExcluir(canal.id)}>
                      <Trash2 className="h-4 w-4" />
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