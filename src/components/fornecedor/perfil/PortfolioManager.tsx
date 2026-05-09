import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useFornecedorReputacao } from '@/hooks/useFornecedorReputacao';
import { FileUpload } from '@/components/FileUpload';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, FileText } from 'lucide-react';
import { PortfolioFornecedor } from '@/types/fornecedor-reputacao';
import { supabase } from '@/integrations/supabase/client';

interface PortfolioManagerProps {
  fornecedorId: string;
  portfolios: PortfolioFornecedor[];
}

const categorias = [
  'Residencial',
  'Comercial', 
  'Industrial',
  'Reforma',
  'Construção Nova',
  'Paisagismo',
  'Interiores',
  'Infraestrutura',
  'Outros'
];

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({
  fornecedorId,
  portfolios
}) => {
  const [editingItem, setEditingItem] = useState<PortfolioFornecedor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria: '',
    data_projeto: ''
  });
  const { toast } = useToast();
  const { criarPortfolio, atualizarPortfolio, excluirPortfolio, buscarReputacaoFornecedor } = useFornecedorReputacao();

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      categoria: '',
      data_projeto: ''
    });
    setUploadedFiles([]);
    setEditingItem(null);
  };

  const openDialog = (item?: PortfolioFornecedor) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        titulo: item.titulo,
        descricao: item.descricao || '',
        categoria: item.categoria,
        data_projeto: item.data_projeto || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${fornecedorId}/portfolio/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('fornecedor-perfis')
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('fornecedor-perfis')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!formData.titulo.trim() || !formData.categoria) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha pelo menos o título e categoria.",
        variant: "destructive"
      });
      return;
    }

    try {
      let imageUrl = editingItem?.imagem_url || '';

      // Upload da primeira imagem se houver
      if (uploadedFiles.length > 0) {
        imageUrl = await uploadFile(uploadedFiles[0]);
      }

      const portfolioData = {
        fornecedor_id: fornecedorId,
        titulo: formData.titulo,
        descricao: formData.descricao,
        categoria: formData.categoria,
        data_projeto: formData.data_projeto || null,
        imagem_url: imageUrl,
        ativo: true,
        ordem: editingItem?.ordem || portfolios.length
      };

      if (editingItem) {
        await atualizarPortfolio(editingItem.id, portfolioData);
        toast({
          title: "Item atualizado!",
          description: "O item do portfólio foi atualizado com sucesso."
        });
      } else {
        await criarPortfolio(portfolioData);
        toast({
          title: "Item adicionado!", 
          description: "O item foi adicionado ao seu portfólio."
        });
      }

      // Recarregar dados
      await buscarReputacaoFornecedor(fornecedorId);
      closeDialog();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o item. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (item: PortfolioFornecedor) => {
    if (!confirm('Tem certeza que deseja excluir este item do portfólio?')) return;

    try {
      await excluirPortfolio(item.id);
      
      // Remover arquivo do storage se existir
      if (item.imagem_url) {
        const fileName = item.imagem_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('fornecedor-perfis')
            .remove([`${fornecedorId}/portfolio/${fileName}`]);
        }
      }

      await buscarReputacaoFornecedor(fornecedorId);
      toast({
        title: "Item removido",
        description: "O item foi removido do seu portfólio."
      });
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o item. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          Itens do Portfólio ({portfolios.length})
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Item' : 'Adicionar Item'} do Portfólio
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ex: Casa Residencial 200m²"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select 
                    value={formData.categoria} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_projeto">Data do Projeto</Label>
                <Input
                  id="data_projeto"
                  type="date"
                  value={formData.data_projeto}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_projeto: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o projeto, materiais utilizados, desafios superados..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Imagem Principal</Label>
                <FileUpload
                  files={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                  accept={{ 'image/*': [], 'application/pdf': [] }}
                  maxFiles={1}
                  label="arquivos do projeto"
                />
                {editingItem?.imagem_url && uploadedFiles.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Imagem atual: {editingItem.imagem_url.split('/').pop()}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingItem ? 'Atualizar' : 'Adicionar'} Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum item no portfólio</h3>
            <p className="text-muted-foreground mb-4">
              Adicione projetos ao seu portfólio para mostrar seu trabalho aos clientes.
            </p>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {item.imagem_url ? (
                  <img 
                    src={item.imagem_url} 
                    alt={item.titulo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base line-clamp-2">{item.titulo}</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDialog(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <Badge variant="secondary">{item.categoria}</Badge>
                  
                  {item.data_projeto && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(item.data_projeto).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  
                  {item.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {item.descricao}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};