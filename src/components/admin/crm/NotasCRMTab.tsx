import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotaCRM } from "@/types/crm";
import { useNotasCRM } from "@/hooks/useNotasCRM";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Edit2, Trash2, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

interface NotasCRMTabProps {
  orcamentoId: string;
}

export function NotasCRMTab({ orcamentoId }: NotasCRMTabProps) {
  const { profile } = useAuth();
  const { notas, isLoading, adicionarNota, isAdicionando, editarNota, deletarNota } = useNotasCRM(orcamentoId);
  
  const [novoConteudo, setNovoConteudo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [conteudoEditado, setConteudoEditado] = useState("");
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  const handleAdicionarNota = () => {
    if (!novoConteudo.trim() || !profile) return;
    
    adicionarNota({
      orcamentoId,
      conteudo: novoConteudo.trim(),
      autorNome: profile.nome,
    });
    
    setNovoConteudo("");
  };

  const handleIniciarEdicao = (nota: NotaCRM) => {
    setEditandoId(nota.id);
    setConteudoEditado(nota.conteudo);
  };

  const handleSalvarEdicao = (notaId: string) => {
    if (!conteudoEditado.trim()) return;
    
    editarNota({ notaId, conteudo: conteudoEditado.trim() });
    setEditandoId(null);
    setConteudoEditado("");
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setConteudoEditado("");
  };

  const handleDeletar = (notaId: string) => {
    deletarNota(notaId);
    setDeletandoId(null);
  };

  const podeEditar = (nota: NotaCRM) => {
    return profile?.id === nota.criado_por_id;
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diferencaHoras = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60 * 60));
    
    if (diferencaHoras < 24) {
      if (diferencaHoras < 1) {
        const diferencaMinutos = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60));
        if (diferencaMinutos < 1) return "agora";
        return `há ${diferencaMinutos} minuto${diferencaMinutos > 1 ? 's' : ''}`;
      }
      return `há ${diferencaHoras} hora${diferencaHoras > 1 ? 's' : ''}`;
    }
    
    return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulário para nova nota */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Edit2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Nova Nota</h3>
            </div>
            <Textarea
              placeholder="Digite sua anotação aqui..."
              value={novoConteudo}
              onChange={(e) => setNovoConteudo(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isAdicionando}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAdicionarNota}
                disabled={!novoConteudo.trim() || isAdicionando}
                size="sm"
              >
                {isAdicionando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Adicionar Nota
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de notas */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground">
          Histórico de Notas ({notas.length})
        </h3>

        {notas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma nota registrada ainda.
            </CardContent>
          </Card>
        ) : (
          notas.map((nota) => (
            <Card key={nota.id}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Cabeçalho da nota */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">
                          {nota.criado_por_nome}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {formatarData(nota.created_at)}
                          </p>
                          {nota.editada && (
                            <Badge variant="outline" className="text-xs">
                              Editada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    {podeEditar(nota) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {editandoId !== nota.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleIniciarEdicao(nota)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletandoId(nota.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  {editandoId === nota.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={conteudoEditado}
                        onChange={(e) => setConteudoEditado(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelarEdicao}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSalvarEdicao(nota.id)}
                          disabled={!conteudoEditado.trim()}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {nota.conteudo}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletandoId} onOpenChange={() => setDeletandoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta nota? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletandoId && handleDeletar(deletandoId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
