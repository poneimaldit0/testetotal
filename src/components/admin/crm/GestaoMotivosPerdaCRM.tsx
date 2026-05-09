import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MotivoPerda } from '@/types/crm';

export function GestaoMotivosPerdaCRM() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [motivoEditando, setMotivoEditando] = useState<MotivoPerda | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ordem, setOrdem] = useState(1);

  const { data: motivos = [], isLoading } = useQuery({
    queryKey: ['motivos-perda-crm-gestao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_perda_crm')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as MotivoPerda[];
    }
  });

  const salvarMotivo = useMutation({
    mutationFn: async () => {
      if (motivoEditando) {
        const { error } = await supabase
          .from('motivos_perda_crm')
          .update({ nome, descricao, ordem })
          .eq('id', motivoEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('motivos_perda_crm')
          .insert({ nome, descricao, ordem, ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-perda-crm-gestao'] });
      queryClient.invalidateQueries({ queryKey: ['motivos-perda-crm'] });
      toast({ title: motivoEditando ? 'Motivo atualizado!' : 'Motivo criado!' });
      fecharDialog();
    },
    onError: (error) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao salvar motivo',
        description: String(error)
      });
    }
  });

  const excluirMotivo = useMutation({
    mutationFn: async (id: string) => {
      // Verificar se o motivo está sendo usado em CRM
      const { count, error: usoError } = await supabase
        .from('orcamentos_crm_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('motivo_perda_id', id);

      if (usoError) throw usoError;

      if (count && count > 0) {
        throw new Error(
          `Este motivo não pode ser excluído pois está sendo usado em ${count} orçamento(s) no CRM. ` +
          `Primeiro altere esses orçamentos para outro motivo.`
        );
      }

      // Se não está sendo usado, pode excluir
      const { error } = await supabase
        .from('motivos_perda_crm')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-perda-crm-gestao'] });
      toast({ title: 'Motivo excluído com sucesso!' });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Erro desconhecido ao excluir';
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: errorMessage
      });
    }
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('motivos_perda_crm')
        .update({ ativo: !ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-perda-crm-gestao'] });
      toast({ title: 'Status atualizado!' });
    }
  });

  const abrirDialog = (motivo?: MotivoPerda) => {
    if (motivo) {
      setMotivoEditando(motivo);
      setNome(motivo.nome);
      setDescricao(motivo.descricao || '');
      setOrdem(motivo.ordem);
    } else {
      setMotivoEditando(null);
      setNome('');
      setDescricao('');
      setOrdem(motivos.length + 1);
    }
    setDialogAberto(true);
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setMotivoEditando(null);
    setNome('');
    setDescricao('');
    setOrdem(1);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Motivos de Perda - CRM</CardTitle>
              <CardDescription>
                Configure os motivos que podem ser selecionados ao marcar um orçamento como perdido
              </CardDescription>
            </div>
            <Button onClick={() => abrirDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Motivo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {motivos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum motivo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                motivos.map((motivo) => (
                  <TableRow key={motivo.id}>
                    <TableCell>{motivo.ordem}</TableCell>
                    <TableCell className="font-medium">{motivo.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {motivo.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAtivo.mutate({ id: motivo.id, ativo: motivo.ativo })}
                      >
                        {motivo.ativo ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirDialog(motivo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este motivo?')) {
                              excluirMotivo.mutate(motivo.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {motivoEditando ? 'Editar Motivo' : 'Novo Motivo de Perda'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Cliente desistiu"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva mais sobre este motivo..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="ordem">Ordem de exibição</Label>
              <Input
                id="ordem"
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharDialog}>Cancelar</Button>
            <Button 
              onClick={() => salvarMotivo.mutate()}
              disabled={!nome.trim() || salvarMotivo.isPending}
            >
              {salvarMotivo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {motivoEditando ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
