import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Edit, Trash2, Eye, EyeOff, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useAvisos } from '@/hooks/useAvisos';
import { format } from 'date-fns';
import type { Aviso } from '@/types';

const tipoLabels = {
  info: 'Informação',
  warning: 'Aviso',
  success: 'Sucesso',
  error: 'Erro'
};

const tipoIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle
};

const tipoColors = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800'
};

export const GestaoAvisos = () => {
  const { todosAvisos, isLoadingTodos, criarAviso, editarAviso, excluirAviso, toggleAtivo } = useAvisos();
  const [modalAberto, setModalAberto] = useState(false);
  const [avisoEdicao, setAvisoEdicao] = useState<Aviso | null>(null);
  const [avisoExcluir, setAvisoExcluir] = useState<string | null>(null);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [ativo, setAtivo] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const resetarForm = () => {
    setTitulo('');
    setConteudo('');
    setTipo('info');
    setAtivo(true);
    setDataInicio('');
    setDataFim('');
    setAvisoEdicao(null);
  };

  const abrirModalNovo = () => {
    resetarForm();
    setModalAberto(true);
  };

  const abrirModalEdicao = (aviso: Aviso) => {
    setAvisoEdicao(aviso);
    setTitulo(aviso.titulo);
    setConteudo(aviso.conteudo);
    setTipo(aviso.tipo);
    setAtivo(aviso.ativo);
    setDataInicio(aviso.data_inicio ? format(new Date(aviso.data_inicio), "yyyy-MM-dd'T'HH:mm") : '');
    setDataFim(aviso.data_fim ? format(new Date(aviso.data_fim), "yyyy-MM-dd'T'HH:mm") : '');
    setModalAberto(true);
  };

  const handleSalvar = async () => {
    if (!titulo.trim() || !conteudo.trim()) {
      return;
    }

    const dadosAviso = {
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      tipo,
      ativo,
      data_inicio: dataInicio ? new Date(dataInicio).toISOString() : null,
      data_fim: dataFim ? new Date(dataFim).toISOString() : null,
    };

    if (avisoEdicao) {
      await editarAviso.mutateAsync({ id: avisoEdicao.id, ...dadosAviso });
    } else {
      await criarAviso.mutateAsync(dadosAviso);
    }

    setModalAberto(false);
    resetarForm();
  };

  const handleExcluir = async () => {
    if (avisoExcluir) {
      await excluirAviso.mutateAsync(avisoExcluir);
      setAvisoExcluir(null);
    }
  };

  const handleToggleAtivo = async (id: string, novoStatus: boolean) => {
    await toggleAtivo.mutateAsync({ id, ativo: novoStatus });
  };

  if (isLoadingTodos) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mural de Avisos</h2>
        <Button onClick={abrirModalNovo}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Aviso
        </Button>
      </div>

      <div className="grid gap-4">
        {todosAvisos?.map((aviso) => {
          const Icon = tipoIcons[aviso.tipo];
          return (
            <Card key={aviso.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={tipoColors[aviso.tipo]}>
                          {tipoLabels[aviso.tipo]}
                        </Badge>
                        <Badge variant={aviso.ativo ? 'default' : 'secondary'}>
                          {aviso.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {aviso.data_inicio && (
                          <Badge variant="outline">
                            Início: {format(new Date(aviso.data_inicio), 'dd/MM/yyyy HH:mm')}
                          </Badge>
                        )}
                        {aviso.data_fim && (
                          <Badge variant="outline">
                            Fim: {format(new Date(aviso.data_fim), 'dd/MM/yyyy HH:mm')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleAtivo(aviso.id, !aviso.ativo)}
                      title={aviso.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {aviso.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirModalEdicao(aviso)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAvisoExcluir(aviso.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{aviso.conteudo}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{avisoEdicao ? 'Editar Aviso' : 'Novo Aviso'}</DialogTitle>
            <DialogDescription>
              Crie ou edite avisos para serem exibidos no mural para todos os usuários
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título do aviso"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="conteudo">Conteúdo</Label>
              <Textarea
                id="conteudo"
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Conteúdo do aviso"
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {conteudo.length}/500 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informação</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={ativo}
                onCheckedChange={setAtivo}
              />
              <Label htmlFor="ativo">Aviso ativo</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataInicio">Data Início (opcional)</Label>
                <Input
                  id="dataInicio"
                  type="datetime-local"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dataFim">Data Fim (opcional)</Label>
                <Input
                  id="dataFim"
                  type="datetime-local"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={!titulo.trim() || !conteudo.trim()}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={!!avisoExcluir} onOpenChange={() => setAvisoExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};