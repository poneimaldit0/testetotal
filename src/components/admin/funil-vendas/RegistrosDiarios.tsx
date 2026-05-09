import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFunilVendas } from '@/hooks/useFunilVendas';
import { ETAPAS_FUNIL, FunilVendasRegistro, FunilReuniao, FunilCanalOrigem } from '@/types/funilVendas';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const RegistrosDiarios: React.FC = () => {
  const { buscarRegistros, buscarClosers, buscarPreVendas, atualizarRegistro, buscarReunioes, buscarCanaisOrigem } = useFunilVendas();
  const [registros, setRegistros] = useState<FunilVendasRegistro[]>([]);
  const [closers, setClosers] = useState<any[]>([]);
  const [filterCloser, setFilterCloser] = useState<string>('todos');
  const [editando, setEditando] = useState<FunilVendasRegistro | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [reunioes, setReunioes] = useState<FunilReuniao[]>([]);
  const [canais, setCanais] = useState<FunilCanalOrigem[]>([]);

  const hoje = new Date();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd');

    const [regs, closersList, preVendasList, reunioesData, canaisData] = await Promise.all([
      buscarRegistros({ dataInicio: inicioMes, dataFim: fimMes }),
      buscarClosers(),
      buscarPreVendas(),
      buscarReunioes({ dataInicio: inicioMes, dataFim: fimMes }),
      buscarCanaisOrigem(),
    ]);

    setRegistros(regs);
    setClosers([...(closersList || []), ...(preVendasList || [])]);
    setReunioes(reunioesData || []);
    setCanais(canaisData || []);
    setLoading(false);
  };

  const handleEditar = (reg: FunilVendasRegistro) => {
    setEditando(reg);
    setEditForm({ ...reg });
  };

  const handleSalvarEdicao = async () => {
    if (!editando) return;
    const { id, created_at, updated_at, closer_id, data, ...updates } = editForm;
    const ok = await atualizarRegistro(editando.id, updates);
    if (ok) {
      setEditando(null);
      loadData();
    }
  };

  const filtered = filterCloser === 'todos' ? registros : registros.filter(r => r.closer_id === filterCloser);
  const closerNome = (id: string) => closers.find(c => c.id === id)?.nome || 'Desconhecido';

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 mt-4">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Registros Diários</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCloser} onValueChange={setFilterCloser}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar closer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {closers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome || c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>SDR / Closer</TableHead>
                {ETAPAS_FUNIL.map(e => <TableHead key={e.key} className="text-center">{e.label}</TableHead>)}
                <TableHead className="text-right">Caixa</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.data + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{closerNome(r.closer_id)}</TableCell>
                  {ETAPAS_FUNIL.map(e => (
                    <TableCell key={e.key} className="text-center">{r[e.key as keyof FunilVendasRegistro] as number}</TableCell>
                  ))}
                  <TableCell className="text-right">{Number(r.caixa_coletado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">{Number(r.faturamento_gerado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEditar(r)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog de edição */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {ETAPAS_FUNIL.map(e => (
              <div key={e.key}>
                <Label className="text-xs">{e.label}</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm[e.key] || 0}
                  onChange={(ev) => setEditForm({ ...editForm, [e.key]: parseInt(ev.target.value) || 0 })}
                />
              </div>
            ))}
            <div>
              <Label className="text-xs">Caixa (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.caixa_coletado || 0}
                onChange={(e) => setEditForm({ ...editForm, caixa_coletado: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs">Faturamento (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.faturamento_gerado || 0}
                onChange={(e) => setEditForm({ ...editForm, faturamento_gerado: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button onClick={handleSalvarEdicao} className="mt-4 w-full">Salvar Alterações</Button>
        </DialogContent>
      </Dialog>
    </Card>

      {reunioes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reuniões Individuais ({reunioes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Reunião</TableHead>
                    <TableHead>Closer</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Pitch</TableHead>
                    <TableHead className="text-center">Venda</TableHead>
                    <TableHead className="text-right">Caixa</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reunioes.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.data_agendada + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{closers.find(c => c.id === r.closer_id)?.nome || '—'}</TableCell>
                      <TableCell className="text-xs">{canais.find(c => c.id === r.canal_origem_id)?.nome || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'realizada' ? 'default' : r.status.startsWith('no_show') ? 'destructive' : 'outline'}>
                          {r.status === 'agendada' ? 'Agendada' : r.status === 'realizada' ? 'Realizada' : r.status === 'no_show_desapareceu' ? 'No Show - Desapareceu' : r.status === 'no_show_remarcar' ? 'No Show - Remarcar' : r.status === 'no_show_cancelar' ? 'No Show - Cancelar' : r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{r.teve_pitch ? '✅' : '—'}</TableCell>
                      <TableCell className="text-center">{r.teve_venda ? '✅' : '—'}</TableCell>
                      <TableCell className="text-right">{Number(r.caixa_coletado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{Number(r.faturamento_gerado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
