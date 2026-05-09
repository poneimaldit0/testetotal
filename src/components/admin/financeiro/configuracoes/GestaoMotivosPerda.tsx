import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';

interface MotivoPerda {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export function GestaoMotivosPerda() {
  const [modalAberto, setModalAberto] = useState(false);
  const [motivoEditando, setMotivoEditando] = useState<MotivoPerda | null>(null);
  const [motivoParaExcluir, setMotivoParaExcluir] = useState<MotivoPerda | null>(null);
  
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ordem, setOrdem] = useState<number>(1);

  const queryClient = useQueryClient();

  // Query para listar motivos
  const { data: motivos = [], isLoading } = useQuery({
    queryKey: ['motivos-perda-financeiro-gestao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_perda_financeiro')
        .select('*')
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      return data as MotivoPerda[];
    },
  });

  // Mutation para criar/atualizar
  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (motivoEditando) {
        const { error } = await supabase
          .from('motivos_perda_financeiro')
          .update({ 
            nome: nome.trim(), 
            descricao: descricao.trim() || null, 
            ordem 
          })
          .eq('id', motivoEditando.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('motivos_perda_financeiro')
          .insert({ 
            nome: nome.trim(), 
            descricao: descricao.trim() || null, 
            ordem, 
            ativo: true 
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-perda-financeiro-gestao'] });
      toast.success(motivoEditando ? 'Motivo atualizado' : 'Motivo criado');
      fecharModal();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar motivo: ' + error.message);
    },
  });

  // Mutation para excluir (com validação)
  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verificar uso em contas_receber
      const { count, error: countError } = await supabase
        .from('contas_receber')
        .select('*', { count: 'exact', head: true })
        .eq('motivo_perda_id', id);

      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error(
          `Este motivo não pode ser excluído pois está sendo usado em ${count} conta(s). ` +
          `Primeiro altere essas contas para outro motivo ou desative este motivo.`
        );
      }

      const { error } = await supabase
        .from('motivos_perda_financeiro')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-perda-financeiro-gestao'] });
      toast.success('Motivo excluído');
      setMotivoParaExcluir(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
      setMotivoParaExcluir(null);
    },
  });

  // Mutation para toggle ativo/inativo
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('motivos_perda_financeiro')
        .update({ ativo: !ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-perda-financeiro-gestao'] });
      toast.success('Status atualizado');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const abrirModalNovo = () => {
    setMotivoEditando(null);
    setNome('');
    setDescricao('');
    // Próxima ordem disponível
    const maxOrdem = motivos.reduce((max, m) => Math.max(max, m.ordem), 0);
    setOrdem(maxOrdem + 1);
    setModalAberto(true);
  };

  const abrirModalEditar = (motivo: MotivoPerda) => {
    setMotivoEditando(motivo);
    setNome(motivo.nome);
    setDescricao(motivo.descricao || '');
    setOrdem(motivo.ordem);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setMotivoEditando(null);
    setNome('');
    setDescricao('');
    setOrdem(1);
  };

  const handleSalvar = () => {
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (ordem < 1) {
      toast.error('Ordem deve ser um número positivo');
      return;
    }

    salvarMutation.mutate();
  };

  const handleToggleAtivo = (motivo: MotivoPerda) => {
    toggleAtivoMutation.mutate({ id: motivo.id, ativo: motivo.ativo });
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Gerencie os motivos que podem ser selecionados ao marcar uma conta a receber como perda
        </p>
        <Button onClick={abrirModalNovo}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Motivo
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Ordem</TableHead>
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
                  <TableCell className="font-medium">{motivo.ordem}</TableCell>
                  <TableCell className="font-medium">{motivo.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {motivo.descricao || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={motivo.ativo ? 'default' : 'secondary'}>
                      {motivo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleAtivo(motivo)}
                      title={motivo.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {motivo.ativo ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirModalEditar(motivo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMotivoParaExcluir(motivo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {motivoEditando ? 'Editar Motivo de Perda' : 'Novo Motivo de Perda'}
            </DialogTitle>
            <DialogDescription>
              {motivoEditando
                ? 'Altere os dados do motivo de perda'
                : 'Preencha os dados para criar um novo motivo de perda'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Cliente desistiu do projeto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição opcional do motivo"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordem">Ordem *</Label>
              <Input
                id="ordem"
                type="number"
                min="1"
                value={ordem}
                onChange={(e) => setOrdem(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Define a ordem de exibição na lista
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvarMutation.isPending}>
              {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={motivoParaExcluir !== null} onOpenChange={(open) => !open && setMotivoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Motivo de Perda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o motivo "{motivoParaExcluir?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (motivoParaExcluir) {
                  excluirMutation.mutate(motivoParaExcluir.id);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
