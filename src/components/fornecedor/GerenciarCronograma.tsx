import React, { useState, useEffect } from 'react';
import { useContratosAtivos } from '@/hooks/useContratosAtivos';
import { useCronogramaObra } from '@/hooks/useCronogramaObra';
import { useObras } from '@/hooks/useObras';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatarDataParaExibicao } from '@/utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Clock, CheckCircle, AlertCircle, Plus, ArrowLeft, Edit, Save, Shield, Target, TrendingUp, Building2, CheckCircle2, Eye } from 'lucide-react';

interface GerenciarCronogramaProps {
  contratoId?: string;
  obraId?: string;
}

export const GerenciarCronograma: React.FC<GerenciarCronogramaProps> = ({ 
  contratoId: contratoIdProp, 
  obraId: obraIdProp 
}) => {
  const [contratoSelecionado, setContratoSelecionado] = useState<string | null>(contratoIdProp || null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoItem, setEditandoItem] = useState<string | null>(null);
  const { contratos, loading: loadingContratos } = useContratosAtivos();
  const { obras, aprovarCronogramaInicial } = useObras();
  const { cronograma, loading: loadingCronograma, carregarCronograma, atualizarItemCronograma, adicionarItemCronograma } = useCronogramaObra(contratoSelecionado || undefined);
  const { toast } = useToast();

  // Dados do formulário
  const [formData, setFormData] = useState({
    item_checklist: '',
    categoria: '',
    data_inicio_prevista: '',
    data_fim_prevista: '',
    data_inicio_real: '',
    data_fim_real: '',
    status: 'planejado' as const,
    porcentagem_conclusao: 0,
    observacoes: '',
    ordem: cronograma.length + 1
  });

  // Obter obra atual para verificar se cronograma inicial foi aprovado
  const obraAtual = obras.find(obra => obra.contrato_id === contratoSelecionado);
  const cronogramaAprovado = obraAtual?.cronograma_inicial_aprovado || false;

  // Filtrar contratos relevantes (assinados ou aprovados para início)
  const contratosDisponiveis = contratos.filter(contrato => 
    contrato.status_assinatura === 'assinado' || 
    contrato.status_assinatura === 'aguardando_assinatura'
  );

  // Encontrar o contrato selecionado
  const contratoAtual = contratosDisponiveis.find(c => c.id === contratoSelecionado);

  // Categorizar contratos
  const contratosRecemFechados = contratosDisponiveis.filter(contrato => 
    !contrato.obra || contrato.obra.status === 'aguardando_inicio'
  );
  
  const contratosEmAndamento = contratosDisponiveis.filter(contrato => 
    contrato.obra && contrato.obra.status === 'em_andamento'
  );

  // Determinar tipo de obra com base no cronograma aprovado
  const tipoObra = (contratoAtual?.status_assinatura === 'assinado' && 
    (contratoAtual?.cliente?.nome || cronograma.length > 0) && 
    cronogramaAprovado) 
    ? 'em_andamento' 
    : 'nova';

  const resetForm = () => {
    setFormData({
      item_checklist: '',
      categoria: '',
      data_inicio_prevista: '',
      data_fim_prevista: '',
      data_inicio_real: '',
      data_fim_real: '',
      status: 'planejado',
      porcentagem_conclusao: 0,
      observacoes: '',
      ordem: cronograma.length + 1
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editandoItem) {
        await atualizarItemCronograma(editandoItem, formData);
      } else {
        await adicionarItemCronograma({
          contrato_id: contratoSelecionado!,
          fornecedor_id: contratoAtual?.fornecedor_id,
          ...formData
        });
      }
      resetForm();
      setModalAberto(false);
      setEditandoItem(null);
    } catch (error) {
      console.error('Erro ao salvar item do cronograma:', error);
    }
  };

  const handleAprovarCronograma = async () => {
    if (!obraAtual?.id) return;
    
    try {
      await aprovarCronogramaInicial(obraAtual.id);
      
      // Criar notificação para o cliente sobre cronograma aprovado
      if (contratoAtual?.cliente_id) {
        // Buscar auth_user_id do cliente
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('auth_user_id, nome')
          .eq('id', contratoAtual.cliente_id)
          .single();
          
        if (clienteData?.auth_user_id) {
          const { error: notificationError } = await supabase
            .from('notificacoes_sistema')
            .insert({
              usuario_id: clienteData.auth_user_id,
              tipo: 'cronograma_aprovado',
              titulo: 'Cronograma da Obra Aprovado',
              mensagem: `O cronograma inicial da sua obra foi aprovado. Você já pode acompanhar todas as etapas e o progresso da execução no seu painel.`,
              tipo_referencia: 'obra',
              referencia_id: obraAtual.id,
              dados_extras: {
                contrato_id: contratoSelecionado,
                total_etapas: cronograma.length
              }
            });
          
          if (notificationError) {
            console.error('Erro ao criar notificação:', notificationError);
          }
        }
      }
      
      toast({
        title: "Cronograma Aprovado!",
        description: "O cronograma inicial foi aprovado e o cliente foi notificado. Agora você pode atualizar apenas o progresso da execução.",
      });
    } catch (error) {
      console.error('Erro ao aprovar cronograma:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-green-500';
      case 'em_andamento':
        return 'bg-blue-500';
      case 'atrasado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'em_andamento':
        return <Clock className="h-4 w-4" />;
      case 'atrasado':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <CalendarDays className="h-4 w-4" />;
    }
  };

  const abrirEdicao = (item: any) => {
    setFormData({
      item_checklist: item.item_checklist,
      categoria: item.categoria,
      data_inicio_prevista: item.data_inicio_prevista ? item.data_inicio_prevista.split('T')[0] : '',
      data_fim_prevista: item.data_fim_prevista ? item.data_fim_prevista.split('T')[0] : '',
      data_inicio_real: item.data_inicio_real ? item.data_inicio_real.split('T')[0] : '',
      data_fim_real: item.data_fim_real ? item.data_fim_real.split('T')[0] : '',
      porcentagem_conclusao: item.porcentagem_conclusao || 0,
      status: item.status,
      observacoes: item.observacoes || '',
      ordem: item.ordem || 0
    });
    setEditandoItem(item.id);
    setModalAberto(true);
  };

  if (loadingContratos || loadingCronograma) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  // Se não há contrato selecionado, mostrar seletor
  if (!contratoSelecionado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Gerenciar Cronograma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Selecione uma obra para gerenciar o cronograma:</h3>
            
            {contratosRecemFechados.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium text-blue-700">Obras recém fechadas - Criar cronograma inicial</h4>
                </div>
                <div className="grid gap-3">
                  {contratosRecemFechados.map((contrato) => (
                    <Card 
                      key={contrato.id} 
                      className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium">{contrato.cliente?.nome}</h5>
                            <p className="text-sm text-muted-foreground">
                              Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contrato.valor_contrato || 0)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Building2 className="h-3 w-3 mr-1" />
                              Novo cronograma
                            </Badge>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                onClick={() => setContratoSelecionado(contrato.id)}
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Target className="h-3 w-3" />
                                Criar Cronograma
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {contratosEmAndamento.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium text-green-700">Obras em andamento - Atualizar progresso</h4>
                </div>
                <div className="grid gap-3">
                  {contratosEmAndamento.map((contrato) => (
                    <Card 
                      key={contrato.id} 
                      className="hover:shadow-md transition-shadow border-l-4 border-l-green-500"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium">{contrato.cliente?.nome}</h5>
                            <p className="text-sm text-muted-foreground">
                              Progresso: {contrato.obra?.porcentagem_conclusao || 0}%
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Em andamento
                            </Badge>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                onClick={() => setContratoSelecionado(contrato.id)}
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <TrendingUp className="h-3 w-3" />
                                Atualizar Progresso
                              </Button>
                              <Button
                                onClick={() => setContratoSelecionado(contrato.id)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Ver Detalhes
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {contratosDisponiveis.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma obra disponível para gerenciar cronograma.
                <br />
                As obras devem estar com contrato assinado para aparecer aqui.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Cronograma da Obra</h1>
            <p className="text-muted-foreground">
              {tipoObra === 'nova' 
                ? 'Defina o cronograma inicial do projeto' 
                : 'Acompanhe e atualize o progresso da obra'}
            </p>
            {cronogramaAprovado && (
              <Badge className="mt-2 bg-green-100 text-green-800 border-green-200">
                <Shield className="h-3 w-3 mr-1" />
                Cronograma Inicial Aprovado
              </Badge>
            )}
          </div>
        </div>
        
        <Button
          onClick={() => setContratoSelecionado(null)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Informações do contrato */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Obra {contratoAtual?.id}</h2>
            <p className="text-muted-foreground">
              Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contratoAtual?.valor_contrato || 0)}
            </p>
          </div>
            {tipoObra === 'nova' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Target className="h-3 w-3 mr-1" />
                Cronograma Inicial
              </Badge>
            )}
            {tipoObra === 'em_andamento' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                Em Execução
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão para aprovar cronograma inicial */}
      {tipoObra === 'nova' && cronograma.length > 0 && !cronogramaAprovado && (
        <div className="mb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                <Save className="h-4 w-4" />
                Salvar Cronograma Inicial
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Aprovar Cronograma Inicial</AlertDialogTitle>
                <AlertDialogDescription>
                  Ao salvar o cronograma inicial, você não poderá mais editar as datas previstas, 
                  categorias e descrições dos itens. Será possível apenas atualizar o progresso 
                  da execução (datas reais, percentual de conclusão e status).
                  <br /><br />
                  Tem certeza que deseja continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleAprovarCronograma}>
                  Sim, Aprovar Cronograma
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Itens do Cronograma
          </CardTitle>
          
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2"
                disabled={cronogramaAprovado && tipoObra === 'nova'}
              >
                <Plus className="h-4 w-4" />
                {cronogramaAprovado ? 'Atualizar Progresso' : 'Adicionar Item'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {cronogramaAprovado 
                    ? 'Atualizar Progresso do Item' 
                    : editandoItem 
                      ? 'Editar Item do Cronograma' 
                      : 'Adicionar Item ao Cronograma'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="item_checklist">Descrição do Item</Label>
                  <Input
                    id="item_checklist"
                    value={formData.item_checklist}
                    onChange={(e) => setFormData({...formData, item_checklist: e.target.value})}
                    placeholder="Ex: Demolição, Alvenaria, Pintura..."
                    required
                    disabled={cronogramaAprovado}
                    className={cronogramaAprovado ? 'opacity-50' : ''}
                  />
                  {cronogramaAprovado && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Campo não editável para cronograma aprovado
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select 
                    value={formData.categoria} 
                    onValueChange={(value) => setFormData({...formData, categoria: value})}
                    required
                    disabled={cronogramaAprovado}
                  >
                    <SelectTrigger className={cronogramaAprovado ? 'opacity-50' : ''}>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preparação">Preparação</SelectItem>
                      <SelectItem value="Estrutura">Estrutura</SelectItem>
                      <SelectItem value="Alvenaria">Alvenaria</SelectItem>
                      <SelectItem value="Instalações">Instalações</SelectItem>
                      <SelectItem value="Acabamento">Acabamento</SelectItem>
                      <SelectItem value="Pintura">Pintura</SelectItem>
                      <SelectItem value="Limpeza">Limpeza</SelectItem>
                    </SelectContent>
                  </Select>
                  {cronogramaAprovado && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Campo não editável para cronograma aprovado
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_inicio_prevista">Data Início Prevista</Label>
                    <Input
                      id="data_inicio_prevista"
                      type="date"
                      value={formData.data_inicio_prevista}
                      onChange={(e) => setFormData({...formData, data_inicio_prevista: e.target.value})}
                      required
                      disabled={cronogramaAprovado}
                      className={cronogramaAprovado ? 'opacity-50' : ''}
                    />
                    {cronogramaAprovado && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Campo não editável para cronograma aprovado
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="data_fim_prevista">Data Fim Prevista</Label>
                    <Input
                      id="data_fim_prevista"
                      type="date"
                      value={formData.data_fim_prevista}
                      onChange={(e) => setFormData({...formData, data_fim_prevista: e.target.value})}
                      required
                      disabled={cronogramaAprovado}
                      className={cronogramaAprovado ? 'opacity-50' : ''}
                    />
                    {cronogramaAprovado && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Campo não editável para cronograma aprovado
                      </p>
                    )}
                  </div>
                </div>
                
                {(tipoObra === 'em_andamento' || cronogramaAprovado) && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="data_inicio_real">Data Início Real</Label>
                        <Input
                          id="data_inicio_real"
                          type="date"
                          value={formData.data_inicio_real}
                          onChange={(e) => setFormData({...formData, data_inicio_real: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="data_fim_real">Data Fim Real</Label>
                        <Input
                          id="data_fim_real"
                          type="date"
                          value={formData.data_fim_real}
                          onChange={(e) => setFormData({...formData, data_fim_real: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={formData.status} 
                          onValueChange={(value: any) => setFormData({...formData, status: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planejado">Planejado</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                            <SelectItem value="pausado">Pausado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="porcentagem_conclusao">Percentual de Conclusão (%)</Label>
                        <Input
                          id="porcentagem_conclusao"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.porcentagem_conclusao}
                          onChange={(e) => setFormData({...formData, porcentagem_conclusao: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    placeholder="Observações sobre este item..."
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editandoItem ? 'Atualizar' : 'Adicionar'} Item
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setModalAberto(false);
                      setEditandoItem(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {cronograma.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {tipoObra === 'nova' 
                  ? 'Nenhum item no cronograma. Comece criando o cronograma inicial da obra.'
                  : 'Nenhum item no cronograma ainda. Adicione os itens para começar o acompanhamento.'
                }
              </p>
            </div>
          ) : (
            cronograma.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(item.status)} variant="secondary">
                      {getStatusIcon(item.status)}
                      <span className="ml-1 capitalize">
                        {item.status.replace('_', ' ')}
                      </span>
                    </Badge>
                    <span className="font-medium">{item.categoria}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.porcentagem_conclusao}%
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditandoItem(item.id);
                        setFormData({
                          item_checklist: item.item_checklist,
                          categoria: item.categoria,
                          data_inicio_prevista: item.data_inicio_prevista || '',
                          data_fim_prevista: item.data_fim_prevista || '',
                          data_inicio_real: item.data_inicio_real || '',
                          data_fim_real: item.data_fim_real || '',
                          status: item.status as 'planejado',
                          porcentagem_conclusao: item.porcentagem_conclusao || 0,
                          observacoes: item.observacoes || '',
                          ordem: item.ordem || 0
                        });
                        setModalAberto(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title={cronogramaAprovado ? "Atualizar progresso" : "Editar item"}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <h4 className="font-medium">{item.item_checklist}</h4>
                
                <Progress value={item.porcentagem_conclusao} className="w-full" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Início previsto:</span>
                    <p>
                      {item.data_inicio_prevista 
                        ? new Date(item.data_inicio_prevista).toLocaleDateString('pt-BR')
                        : "Não definida"
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fim previsto:</span>
                    <p>
                      {item.data_fim_prevista 
                        ? new Date(item.data_fim_prevista).toLocaleDateString('pt-BR')
                        : "Não definida"
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Início real:</span>
                    <p>
                      {item.data_inicio_real 
                        ? new Date(item.data_inicio_real).toLocaleDateString('pt-BR')
                        : "Não iniciado"
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fim real:</span>
                    <p>
                      {item.data_fim_real 
                        ? new Date(item.data_fim_real).toLocaleDateString('pt-BR')
                        : "Em andamento"
                      }
                    </p>
                  </div>
                </div>
                
                {item.observacoes && (
                  <div>
                    <span className="text-muted-foreground text-sm">Observações:</span>
                    <p className="text-sm mt-1">{item.observacoes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};