import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, Cloud, Users, Package, FileText, Camera, Eye, EyeOff, Trash2, ZoomIn } from 'lucide-react';
import { useDiarioObra } from '@/hooks/useDiarioObra';
import { SeletorContrato } from './SeletorContrato';
import { FileUpload } from '@/components/FileUpload';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface DiarioObraProps {
  contratoId?: string;
}

export const DiarioObra: React.FC<DiarioObraProps> = ({ contratoId: initialContratoId }) => {
  const [contratoSelecionado, setContratoSelecionado] = useState<string>(initialContratoId || '');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [imageViewer, setImageViewer] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    data_registro: new Date().toISOString().split('T')[0],
    clima: '',
    atividades_realizadas: '',
    materiais_utilizados: '',
    funcionarios_presentes: '',
    observacoes: '',
    visivel_cliente: true
  });
  
  const [fotosUpload, setFotosUpload] = useState<File[]>([]);

  const {
    contratos,
    loadingContratos,
    useRegistrosDiario,
    useEstatisticasMes,
    criarRegistro,
    uploadImagem,
    deletarImagem
  } = useDiarioObra();

  const { data: registros = [], isLoading: loadingRegistros } = useRegistrosDiario(contratoSelecionado);
  const { data: estatisticas } = useEstatisticasMes(contratoSelecionado);

  const resetForm = () => {
    setFormData({
      data_registro: new Date().toISOString().split('T')[0],
      clima: '',
      atividades_realizadas: '',
      materiais_utilizados: '',
      funcionarios_presentes: '',
      observacoes: '',
      visivel_cliente: true
    });
    setFotosUpload([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contratoSelecionado) {
      toast.error('Selecione um contrato primeiro');
      return;
    }

    if (!formData.atividades_realizadas.trim()) {
      toast.error('Atividades realizadas é obrigatório');
      return;
    }

    try {
      setUploading(true);
      
      // Upload das imagens primeiro
      const fotosUrls: string[] = [];
      
      for (const foto of fotosUpload) {
        try {
          const url = await uploadImagem(foto, contratoSelecionado, formData.data_registro);
          fotosUrls.push(url);
        } catch (error) {
          console.error('Erro no upload da imagem:', error);
          toast.error(`Erro no upload da imagem ${foto.name}`);
        }
      }

      // Criar registro
      await criarRegistro.mutateAsync({
        contrato_id: contratoSelecionado,
        data_registro: formData.data_registro,
        atividades_realizadas: formData.atividades_realizadas,
        clima: formData.clima || null,
        materiais_utilizados: formData.materiais_utilizados || null,
        funcionarios_presentes: formData.funcionarios_presentes || null,
        observacoes: formData.observacoes || null,
        fotos: fotosUrls.length > 0 ? fotosUrls : null,
        visivel_cliente: formData.visivel_cliente
      });

      setDialogAberto(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao criar registro:', error);
      toast.error('Erro ao criar registro do diário');
    } finally {
      setUploading(false);
    }
  };

  const getClimaIcon = (clima: string) => {
    switch (clima?.toLowerCase()) {
      case 'ensolarado': return '☀️';
      case 'nublado': return '☁️';
      case 'chuvoso': return '🌧️';
      case 'tempestade': return '⛈️';
      default: return '🌤️';
    }
  };

  const getClimaColor = (clima: string) => {
    switch (clima?.toLowerCase()) {
      case 'ensolarado': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'nublado': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'chuvoso': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'tempestade': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDeleteImage = async (imageUrl: string, registroId: string) => {
    try {
      await deletarImagem(imageUrl);
      toast.success('Imagem removida com sucesso');
      // Aqui você pode implementar a lógica para atualizar o registro removendo a URL da imagem
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Seletor de Contrato */}
      <SeletorContrato
        contratos={contratos}
        contratoSelecionado={contratoSelecionado}
        onContratoChange={setContratoSelecionado}
        loading={loadingContratos}
      />

      {contratoSelecionado && (
        <>
          {/* Estatísticas do Mês */}
          {estatisticas && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{estatisticas.diasTrabalhados}</p>
                      <p className="text-sm text-muted-foreground">Dias trabalhados este mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{estatisticas.registrosCriados}</p>
                      <p className="text-sm text-muted-foreground">Registros criados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Cloud className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-lg font-bold">{estatisticas.mes}/{estatisticas.ano}</p>
                      <p className="text-sm text-muted-foreground">Período atual</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cabeçalho com Botão Adicionar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Diário de Obra</CardTitle>
                  <CardDescription>
                    Registre as atividades diárias do projeto
                  </CardDescription>
                </div>
                <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Novo Registro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Registro</DialogTitle>
                      <DialogDescription>
                        Adicione as informações do dia de trabalho
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="data">Data *</Label>
                          <Input
                            id="data"
                            type="date"
                            value={formData.data_registro}
                            onChange={(e) => setFormData(prev => ({ ...prev, data_registro: e.target.value }))}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="clima">Clima</Label>
                          <Select
                            value={formData.clima}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, clima: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o clima" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ensolarado">☀️ Ensolarado</SelectItem>
                              <SelectItem value="nublado">☁️ Nublado</SelectItem>
                              <SelectItem value="chuvoso">🌧️ Chuvoso</SelectItem>
                              <SelectItem value="tempestade">⛈️ Tempestade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="atividades">Atividades Realizadas *</Label>
                        <Textarea
                          id="atividades"
                          value={formData.atividades_realizadas}
                          onChange={(e) => setFormData(prev => ({ ...prev, atividades_realizadas: e.target.value }))}
                          placeholder="Descreva as principais atividades realizadas no dia..."
                          rows={3}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="materiais">Materiais Utilizados</Label>
                        <Textarea
                          id="materiais"
                          value={formData.materiais_utilizados}
                          onChange={(e) => setFormData(prev => ({ ...prev, materiais_utilizados: e.target.value }))}
                          placeholder="Liste os materiais utilizados..."
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="funcionarios">Funcionários Presentes</Label>
                        <Input
                          id="funcionarios"
                          value={formData.funcionarios_presentes}
                          onChange={(e) => setFormData(prev => ({ ...prev, funcionarios_presentes: e.target.value }))}
                          placeholder="Ex: João, Maria, Pedro..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea
                          id="observacoes"
                          value={formData.observacoes}
                          onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                          placeholder="Observações gerais, problemas encontrados, etc..."
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Fotos do Progresso</Label>
                        <FileUpload
                          files={fotosUpload}
                          onFilesChange={setFotosUpload}
                          accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
                          maxFiles={10}
                          label="Arraste fotos aqui ou clique para selecionar (máx. 10 fotos)"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="visivel"
                          checked={formData.visivel_cliente}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, visivel_cliente: checked }))}
                        />
                        <Label htmlFor="visivel" className="flex items-center gap-2">
                          {formData.visivel_cliente ? (
                            <>
                              <Eye className="w-4 h-4" />
                              Visível para o cliente
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Apenas interno
                            </>
                          )}
                        </Label>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDialogAberto(false)}
                          disabled={uploading}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={uploading}>
                          {uploading ? 'Salvando...' : 'Salvar Registro'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de Registros */}
          <div className="space-y-4">
            {loadingRegistros ? (
              // Skeleton Loading
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-4" />
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : registros.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhum registro encontrado
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Comece criando seu primeiro registro do diário de obra
                  </p>
                </CardContent>
              </Card>
            ) : (
              registros.map((registro) => (
                <Card key={registro.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          {formatarData(registro.data_registro)}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          {registro.clima && (
                            <Badge className={getClimaColor(registro.clima)}>
                              {getClimaIcon(registro.clima)} {registro.clima}
                            </Badge>
                          )}
                          <Badge variant={registro.visivel_cliente ? "default" : "secondary"}>
                            {registro.visivel_cliente ? (
                              <><Eye className="w-3 h-3 mr-1" /> Visível ao cliente</>
                            ) : (
                              <><EyeOff className="w-3 h-3 mr-1" /> Interno</>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Atividades */}
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Atividades Realizadas
                      </h4>
                      <p className="text-sm leading-relaxed">{registro.atividades_realizadas}</p>
                    </div>

                    {/* Grid com informações extras */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {registro.materiais_utilizados && (
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-1 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Materiais
                          </h4>
                          <p className="text-sm">{registro.materiais_utilizados}</p>
                        </div>
                      )}

                      {registro.funcionarios_presentes && (
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-1 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Funcionários
                          </h4>
                          <p className="text-sm">{registro.funcionarios_presentes}</p>
                        </div>
                      )}

                      {registro.observacoes && (
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-1">
                            Observações
                          </h4>
                          <p className="text-sm">{registro.observacoes}</p>
                        </div>
                      )}
                    </div>

                    {/* Fotos */}
                    {registro.fotos && registro.fotos.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          Fotos ({registro.fotos.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {registro.fotos.map((foto, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={foto}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border cursor-pointer transition-transform group-hover:scale-105"
                                onClick={() => setImageViewer(foto)}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-lg flex items-center justify-center">
                                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteImage(foto, registro.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal de Visualização de Imagem */}
      {imageViewer && (
        <Dialog open={!!imageViewer} onOpenChange={() => setImageViewer(null)}>
          <DialogContent className="max-w-4xl">
            <img
              src={imageViewer}
              alt="Visualização"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};