
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/FileUpload';
import { ImportacaoExcel } from './ImportacaoExcel';
import { ChecklistSelector } from './ChecklistSelector';
import { GestorSelector } from './GestorSelector';
import { useOrcamento } from '@/context/OrcamentoContext';
import { useGestorConta } from '@/hooks/useGestorConta';
import { CATEGORIAS_SERVICO } from '@/constants/orcamento';
import { PRAZOS_INICIO } from '@/constants/orcamento';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileSpreadsheet, Info } from 'lucide-react';
import { ProdutoSegmentacaoSelect } from './ProdutoSegmentacaoSelect';

export const CadastroOrcamento: React.FC = () => {
  const { adicionarOrcamento } = useOrcamento();
  const { gestores, obterProximoGestor, loading: loadingGestores } = useGestorConta();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    necessidade: '',
    categorias: [] as string[],
    local: '',
    tamanhoImovel: '',
    prazoInicio: '',
    nomeContato: '',
    telefoneContato: '',
    emailContato: '',
    gestorContaId: null as string | null,
    budgetInformado: '',
    produtoSegmentacaoId: null as string | null,
    tipoAtendimento: '' as 'presencial' | 'online' | '',
  });
  
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [fotos, setFotos] = useState<File[]>([]);
  const [linkRota100, setLinkRota100] = useState<string | null>(null);
  const [videos, setVideos] = useState<File[]>([]);
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoriaChange = (categoria: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categorias: checked 
        ? [...prev.categorias, categoria]
        : prev.categorias.filter(c => c !== categoria)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de todos os campos obrigatórios
    if (!formData.necessidade || 
        formData.categorias.length === 0 || 
        !formData.local ||
        !formData.tamanhoImovel ||
        !formData.prazoInicio ||
        !formData.nomeContato ||
        !formData.telefoneContato ||
        !formData.emailContato) {
      toast({
        title: "Erro",
        description: "Todos os campos marcados com * são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validação do tipo de atendimento
    if (!formData.tipoAtendimento) {
      toast({ title: "Erro", description: "Selecione o tipo de atendimento preferido.", variant: "destructive" });
      return;
    }

    // Validação do formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.emailContato)) {
      toast({
        title: "Erro",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const novoOrcamento = await adicionarOrcamento({
        dataPublicacao: new Date(),
        necessidade: formData.necessidade,
        arquivos,
        fotos,
        videos,
        categorias: formData.categorias,
        local: formData.local,
        tamanhoImovel: Number(formData.tamanhoImovel),
        dataInicio: new Date(),
        prazoInicioTexto: formData.prazoInicio,
        status: 'aberto',
        gestorContaId: formData.gestorContaId,
        budget_informado: formData.budgetInformado ? Number(formData.budgetInformado) : undefined,
        produto_segmentacao_id: formData.produtoSegmentacaoId,
        tipo_atendimento_tecnico: formData.tipoAtendimento || null,
        dadosContato: {
          nome: formData.nomeContato,
          telefone: formData.telefoneContato,
          email: formData.emailContato,
        },
      });

      // Nota: estimativa IA é disparada automaticamente em useOrcamentoData.adicionarOrcamento

      // Reset form
      setFormData({
        necessidade: '',
        categorias: [],
        local: '',
        tamanhoImovel: '',
        prazoInicio: '',
        nomeContato: '',
        telefoneContato: '',
        emailContato: '',
        gestorContaId: null,
        budgetInformado: '',
        produtoSegmentacaoId: null,
        tipoAtendimento: '',
      });
      setArquivos([]);
      setFotos([]);
      setVideos([]);

      if (novoOrcamento?.rota100_token) {
        const url = `${window.location.origin}/rota100/${novoOrcamento.rota100_token}`;
        setLinkRota100(url);
      }

      toast({
        title: "Sucesso",
        description: "Orçamento cadastrado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar orçamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
    {/* Modal de link Rota100 após criação */}
    <Dialog open={!!linkRota100} onOpenChange={() => setLinkRota100(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>✅ Orçamento criado — Link do cliente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          Envie este link ao cliente para que ele acompanhe o processo na Rota100.
        </p>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-xs break-all">
          {linkRota100}
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            className="flex-1"
            onClick={() => { navigator.clipboard.writeText(linkRota100!); toast({ title: 'Link copiado!' }); }}
          >
            Copiar link
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <a href={linkRota100!} target="_blank" rel="noreferrer">Abrir Rota100</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Cadastrar Orçamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Cadastro Individual
            </TabsTrigger>
            <TabsTrigger value="importacao" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Importação em Lote
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Categorias de Serviço *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CATEGORIAS_SERVICO.map((categoria) => (
                      <div key={categoria} className="flex items-center space-x-2">
                        <Checkbox
                          id={categoria}
                          checked={formData.categorias.includes(categoria)}
                          onCheckedChange={(checked) => handleCategoriaChange(categoria, checked as boolean)}
                        />
                        <Label htmlFor={categoria} className="text-sm font-normal">
                          {categoria}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local">Local *</Label>
                  <Input
                    id="local"
                    value={formData.local}
                    onChange={(e) => handleInputChange('local', e.target.value)}
                    placeholder="Cidade, Estado ou endereço completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tamanhoImovel">Tamanho do Imóvel (m²) *</Label>
                  <Input
                    id="tamanhoImovel"
                    type="number"
                    value={formData.tamanhoImovel}
                    onChange={(e) => handleInputChange('tamanhoImovel', e.target.value)}
                    placeholder="Ex: 120"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetInformado">
                    Budget Informado (R$)
                    <span className="text-xs text-muted-foreground ml-2">
                      (Confidencial - Visível apenas para gestores)
                    </span>
                  </Label>
                  <Input
                    id="budgetInformado"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budgetInformado}
                    onChange={(e) => handleInputChange('budgetInformado', e.target.value)}
                    placeholder="Ex: 150000.00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="prazoInicio">Prazo Pretendido para Início *</Label>
                  <Select value={formData.prazoInicio} onValueChange={(value) => handleInputChange('prazoInicio', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o prazo desejado" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRAZOS_INICIO.map((opcao) => (
                        <SelectItem key={opcao} value={opcao}>
                          {opcao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Tipo de atendimento preferido */}
              <div className="space-y-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
                <Label className="text-sm font-semibold">Tipo de atendimento preferido *</Label>
                <p className="text-xs text-muted-foreground">O SDR irá agendar individualmente com cada empresa.</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoAtendimento"
                      value="presencial"
                      checked={formData.tipoAtendimento === 'presencial'}
                      onChange={() => setFormData(prev => ({ ...prev, tipoAtendimento: 'presencial' }))}
                    />
                    <span className="text-sm font-medium">📅 Visita presencial</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoAtendimento"
                      value="online"
                      checked={formData.tipoAtendimento === 'online'}
                      onChange={() => setFormData(prev => ({ ...prev, tipoAtendimento: 'online' }))}
                    />
                    <span className="text-sm font-medium">🎥 Reunião online</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="necessidade">Descrição da Necessidade *</Label>
                <Textarea
                  id="necessidade"
                  value={formData.necessidade}
                  onChange={(e) => handleInputChange('necessidade', e.target.value)}
                  placeholder="Descreva detalhadamente o serviço necessário..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FileUpload
                  files={arquivos}
                  onFilesChange={setArquivos}
                  label="Documentos e Arquivos"
                  accept={{ 'application/pdf': [], 'application/msword': [], 'text/*': [] }}
                />

                <FileUpload
                  files={fotos}
                  onFilesChange={setFotos}
                  label="Fotos e Imagens"
                  accept={{ 'image/*': [] }}
                />

                <FileUpload
                  files={videos}
                  onFilesChange={setVideos}
                  label="Vídeos"
                  accept={{ 'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'] }}
                  maxFiles={5}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Dados de Contato do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeContato">Nome do Cliente *</Label>
                    <Input
                      id="nomeContato"
                      value={formData.nomeContato}
                      onChange={(e) => handleInputChange('nomeContato', e.target.value)}
                      placeholder="Nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefoneContato">Telefone *</Label>
                    <Input
                      id="telefoneContato"
                      value={formData.telefoneContato}
                      onChange={(e) => handleInputChange('telefoneContato', e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailContato">E-mail *</Label>
                    <Input
                      id="emailContato"
                      type="email"
                      value={formData.emailContato}
                      onChange={(e) => handleInputChange('emailContato', e.target.value)}
                      placeholder="cliente@email.com"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-3">
                <GestorSelector
                  value={formData.gestorContaId || undefined}
                  onValueChange={async (value) => {
                    if (value === 'AUTO') {
                      console.log('🎯 Buscando próximo gestor da fila...');
                      const proximoGestorId = await obterProximoGestor();
                      
                      if (proximoGestorId) {
                        setFormData(prev => ({ ...prev, gestorContaId: proximoGestorId }));
                        const gestorSelecionado = gestores.find(g => g.id === proximoGestorId);
                        toast({
                          title: "Gestor selecionado automaticamente",
                          description: `Próximo da fila: ${gestorSelecionado?.nome}`,
                        });
                      } else {
                        toast({
                          title: "Aviso",
                          description: "Não foi possível determinar gestor automaticamente",
                          variant: "destructive",
                        });
                      }
                    } else {
                      setFormData(prev => ({ ...prev, gestorContaId: value }));
                    }
                  }}
                  permitirSelecaoAutomatica={true}
                />
                {formData.gestorContaId && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      Gestor responsável: {' '}
                      <span className="font-semibold">
                        {gestores.find(g => g.id === formData.gestorContaId)?.nome}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <ProdutoSegmentacaoSelect
                  value={formData.produtoSegmentacaoId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, produtoSegmentacaoId: value }))}
                  label="Produto/Segmentação do Cliente"
                  description="Selecione um produto para filtrar quais fornecedores podem ver este orçamento. Deixe vazio para visibilidade geral."
                  emptyLabel="Visível para todos os fornecedores"
                />
              </div>

              <Button type="submit" className="w-full">
                Publicar Orçamento
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="importacao" className="mt-6">
            <ImportacaoExcel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </>
  );
};
