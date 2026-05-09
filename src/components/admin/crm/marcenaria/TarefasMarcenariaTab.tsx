import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTarefasMarcenaria } from "@/hooks/useTarefasMarcenaria";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Edit2, Check, X, CalendarIcon, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocal, parseDateLocal } from "@/utils/orcamentoUtils";

interface TarefasMarcenariaTabProps {
  leadId: string;
}

export function TarefasMarcenariaTab({ leadId }: TarefasMarcenariaTabProps) {
  const { profile } = useAuth();
  const { 
    tarefas, 
    isLoading, 
    adicionarTarefa, 
    isAdicionando,
    toggleTarefa,
    editarTarefa,
    isEditando,
    deletarTarefa,
    isDeletando
  } = useTarefasMarcenaria(leadId);

  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaData, setNovaData] = useState<Date>();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editData, setEditData] = useState<Date>();

  const tarefasPendentes = tarefas.filter(t => !t.concluida);
  const tarefasConcluidas = tarefas.filter(t => t.concluida);
  const tarefasExibir = mostrarConcluidas ? tarefas : tarefasPendentes;

  const handleAdicionarTarefa = async () => {
    if (!novoTitulo.trim() || !novaData || !profile) return;
    
    console.log("🔍 [TarefasMarcenariaTab] novaData original:", novaData);
    console.log("🔍 [TarefasMarcenariaTab] novaData type:", typeof novaData);
    console.log("🔍 [TarefasMarcenariaTab] novaData instanceof Date:", novaData instanceof Date);
    
    const dataFormatada = formatDateLocal(novaData);
    console.log("🔍 [TarefasMarcenariaTab] dataFormatada:", dataFormatada);
    
    await adicionarTarefa({
      leadId,
      titulo: novoTitulo.trim(),
      descricao: novaDescricao.trim() || undefined,
      dataVencimento: dataFormatada,
      autorNome: profile.nome
    });

    setNovoTitulo("");
    setNovaDescricao("");
    setNovaData(undefined);
  };

  const handleToggleTarefa = async (tarefaId: string, concluida: boolean) => {
    if (!profile) return;
    await toggleTarefa({ tarefaId, concluida: !concluida, autorNome: profile.nome });
  };

  const handleEditarTarefa = async (tarefaId: string) => {
    if (!editTitulo.trim() || !editData) return;

    await editarTarefa({
      tarefaId,
      titulo: editTitulo.trim(),
      descricao: editDescricao.trim() || undefined,
      dataVencimento: formatDateLocal(editData)
    });

    setEditandoId(null);
    setEditTitulo("");
    setEditDescricao("");
    setEditData(undefined);
  };

  const iniciarEdicao = (tarefa: any) => {
    setEditandoId(tarefa.id);
    setEditTitulo(tarefa.titulo);
    setEditDescricao(tarefa.descricao || "");
    setEditData(parseDateLocal(tarefa.data_vencimento));
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditTitulo("");
    setEditDescricao("");
    setEditData(undefined);
  };

  const getStatusTarefa = (dataVencimento: string, concluida: boolean) => {
    if (concluida) return "concluida";
    const data = parseDateLocal(dataVencimento);
    if (isPast(data) && !isToday(data)) return "atrasada";
    if (isToday(data)) return "hoje";
    return "futura";
  };

  if (isLoading) {
    return <div className="p-4">Carregando tarefas...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant="outline">
            {tarefasPendentes.length} pendente{tarefasPendentes.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary">
            {tarefasConcluidas.length} concluída{tarefasConcluidas.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMostrarConcluidas(!mostrarConcluidas)}
        >
          {mostrarConcluidas ? "Ocultar" : "Mostrar"} concluídas
        </Button>
      </div>

      {/* Formulário Nova Tarefa */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Título da tarefa..."
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              className="flex-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[140px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {novaData ? format(novaData, "dd/MM/yyyy") : "Data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={novaData}
                  onSelect={setNovaData}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Textarea
            placeholder="Descrição (opcional)..."
            value={novaDescricao}
            onChange={(e) => setNovaDescricao(e.target.value)}
            rows={2}
          />
          <Button
            onClick={handleAdicionarTarefa}
            disabled={!novoTitulo.trim() || !novaData || isAdicionando}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tarefa
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Tarefas */}
      <div className="space-y-2">
        {tarefasExibir.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma tarefa {mostrarConcluidas ? "" : "pendente"}
          </div>
        ) : (
          tarefasExibir.map((tarefa) => {
            const status = getStatusTarefa(tarefa.data_vencimento, tarefa.concluida);
            const isEditando = editandoId === tarefa.id;

            return (
              <Card
                key={tarefa.id}
                className={cn(
                  "transition-colors",
                  status === "atrasada" && "border-destructive bg-destructive/5",
                  status === "hoje" && "border-blue-500 bg-blue-50",
                  tarefa.concluida && "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  {isEditando ? (
                    // Modo edição
                    <div className="space-y-3">
                      <Input
                        value={editTitulo}
                        onChange={(e) => setEditTitulo(e.target.value)}
                      />
                      <Textarea
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        rows={2}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editData ? format(editData, "dd/MM/yyyy") : "Data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={editData}
                            onSelect={setEditData}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditarTarefa(tarefa.id)}
                          disabled={isEditando}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelarEdicao}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Modo visualização
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={tarefa.concluida}
                        onCheckedChange={() => handleToggleTarefa(tarefa.id, tarefa.concluida)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={cn(
                              "font-medium",
                              tarefa.concluida && "line-through text-muted-foreground"
                            )}>
                              {tarefa.titulo}
                            </p>
                            {tarefa.descricao && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {tarefa.descricao}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => iniciarEdicao(tarefa)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletarTarefa(tarefa.id)}
                              disabled={isDeletando}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {status === "atrasada" && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Atrasada
                            </Badge>
                          )}
                          {status === "hoje" && (
                            <Badge className="text-xs bg-blue-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Hoje
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(parseDateLocal(tarefa.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          {tarefa.concluida && tarefa.concluida_por_nome && (
                            <span className="text-xs text-muted-foreground">
                              • Concluída por {tarefa.concluida_por_nome}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
