import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useTarefasCRM } from '@/hooks/useTarefasCRM';
import { Plus, Calendar, Trash2, Edit2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { parseDateLocal } from '@/utils/orcamentoUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TarefasCRMTabProps {
  orcamentoId: string;
}

export function TarefasCRMTab({ orcamentoId }: TarefasCRMTabProps) {
  const { tarefas, isLoading, adicionarTarefa, toggleTarefa, editarTarefa, deletarTarefa } = useTarefasCRM(orcamentoId);
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [tarefaParaDeletar, setTarefaParaDeletar] = useState<string | null>(null);

  const resetFormulario = () => {
    setTitulo('');
    setDescricao('');
    setDataVencimento('');
    setEditando(null);
    setMostrarFormulario(false);
  };

  const handleSubmit = () => {
    if (!titulo || !dataVencimento) return;

    if (editando) {
      editarTarefa({
        tarefaId: editando,
        titulo,
        descricao,
        dataVencimento,
      });
    } else {
      adicionarTarefa({
        titulo,
        descricao,
        dataVencimento,
      });
    }

    resetFormulario();
  };

  const handleEditar = (tarefaId: string) => {
    const tarefa = tarefas.find(t => t.id === tarefaId);
    if (tarefa) {
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao || '');
      setDataVencimento(tarefa.data_vencimento);
      setEditando(tarefaId);
      setMostrarFormulario(true);
    }
  };

  const handleDeletar = (tarefaId: string) => {
    deletarTarefa(tarefaId);
    setTarefaParaDeletar(null);
  };

  const getTarefaStatus = (dataVencimento: string, concluida: boolean) => {
    if (concluida) return 'concluida';
    const data = parseDateLocal(dataVencimento);
    if (isPast(data) && !isToday(data)) return 'atrasada';
    if (isToday(data)) return 'hoje';
    return 'pendente';
  };

  const tarefasPendentes = tarefas.filter(t => !t.concluida);
  const tarefasConcluidas = tarefas.filter(t => t.concluida);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando tarefas...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Total</div>
          <div className="text-2xl font-bold">{tarefas.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Pendentes</div>
          <div className="text-2xl font-bold text-blue-600">{tarefasPendentes.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground mb-1">Concluídas</div>
          <div className="text-2xl font-bold text-green-600">{tarefasConcluidas.length}</div>
        </Card>
      </div>

      {/* Botão Nova Tarefa */}
      {!mostrarFormulario && (
        <Button onClick={() => setMostrarFormulario(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      )}

      {/* Formulário */}
      {mostrarFormulario && (
        <Card className="p-4 space-y-3 border-primary">
          <h4 className="font-semibold">{editando ? 'Editar Tarefa' : 'Nova Tarefa'}</h4>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Título *</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Digite o título da tarefa"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Descrição</label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da tarefa (opcional)"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Data de Vencimento *</label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!titulo || !dataVencimento}>
              {editando ? 'Salvar Alterações' : 'Adicionar Tarefa'}
            </Button>
            <Button variant="outline" onClick={resetFormulario}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de Tarefas Pendentes */}
      {tarefasPendentes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tarefas Pendentes ({tarefasPendentes.length})
          </h4>
          
          {tarefasPendentes.map((tarefa) => {
            const status = getTarefaStatus(tarefa.data_vencimento, tarefa.concluida);
            
            return (
              <Card
                key={tarefa.id}
                className={cn(
                  "p-4",
                  status === 'atrasada' && "border-l-4 border-l-destructive bg-destructive/5",
                  status === 'hoje' && "border-l-4 border-l-blue-500 bg-blue-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={tarefa.concluida}
                    onCheckedChange={() => toggleTarefa(tarefa.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h5 className="font-medium">{tarefa.titulo}</h5>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditar(tarefa.id)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setTarefaParaDeletar(tarefa.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {tarefa.descricao && (
                      <p className="text-sm text-muted-foreground mb-2">{tarefa.descricao}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(parseDateLocal(tarefa.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      
                      {status === 'atrasada' && (
                        <Badge variant="destructive" className="text-xs ml-2">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Atrasada
                        </Badge>
                      )}
                      
                      {status === 'hoje' && (
                        <Badge className="text-xs ml-2 bg-blue-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Hoje
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      Criada por {tarefa.criado_por_nome}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lista de Tarefas Concluídas */}
      {tarefasConcluidas.length > 0 && (
        <>
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Tarefas Concluídas ({tarefasConcluidas.length})
            </h4>
            
            {tarefasConcluidas.map((tarefa) => (
              <Card key={tarefa.id} className="p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={tarefa.concluida}
                    onCheckedChange={() => toggleTarefa(tarefa.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h5 className="font-medium line-through text-muted-foreground">
                        {tarefa.titulo}
                      </h5>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTarefaParaDeletar(tarefa.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {tarefa.descricao && (
                      <p className="text-sm text-muted-foreground mb-2 line-through">
                        {tarefa.descricao}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Vencimento: {format(parseDateLocal(tarefa.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {tarefa.data_conclusao && (
                        <p className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Concluída em {format(parseDateLocal(tarefa.data_conclusao.split('T')[0]), "dd/MM/yyyy", { locale: ptBR })}
                          {tarefa.concluida_por_nome && ` por ${tarefa.concluida_por_nome}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Estado vazio */}
      {tarefas.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma tarefa cadastrada ainda</p>
          <p className="text-sm mt-1">Clique em "Nova Tarefa" para começar</p>
        </div>
      )}

      {/* Dialog de Confirmação de Deleção */}
      <AlertDialog open={!!tarefaParaDeletar} onOpenChange={() => setTarefaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tarefaParaDeletar && handleDeletar(tarefaParaDeletar)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
