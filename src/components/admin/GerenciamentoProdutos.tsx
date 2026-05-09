import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProdutosSegmentacao, ProdutoSegmentacao } from '@/hooks/useProdutosSegmentacao';
import { Tag, Plus, Edit, Trash2, RefreshCw, Palette } from 'lucide-react';

export const GerenciamentoProdutos: React.FC = () => {
  const { produtos, loading, fetchProdutos, criarProduto, atualizarProduto, deletarProduto } = useProdutosSegmentacao();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoSegmentacao | null>(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', cor: '#3B82F6' });

  const handleCreate = async () => {
    if (!formData.nome.trim()) return;
    const success = await criarProduto(formData);
    if (success) {
      setShowCreateDialog(false);
      setFormData({ nome: '', descricao: '', cor: '#3B82F6' });
    }
  };

  const handleUpdate = async () => {
    if (!editingProduto || !formData.nome.trim()) return;
    const success = await atualizarProduto(editingProduto.id, formData);
    if (success) {
      setEditingProduto(null);
      setFormData({ nome: '', descricao: '', cor: '#3B82F6' });
    }
  };

  const handleToggleAtivo = async (produto: ProdutoSegmentacao) => {
    await atualizarProduto(produto.id, { ativo: !produto.ativo });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      await deletarProduto(id);
    }
  };

  const openEditDialog = (produto: ProdutoSegmentacao) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || '',
      cor: produto.cor,
    });
  };

  const CORES_PREDEFINIDAS = [
    '#3B82F6', // Azul
    '#10B981', // Verde
    '#F59E0B', // Amarelo
    '#EF4444', // Vermelho
    '#8B5CF6', // Roxo
    '#EC4899', // Rosa
    '#06B6D4', // Cyan
    '#F97316', // Laranja
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Tag className="h-8 w-8 text-primary" />
          Produtos de Segmentação
          <Badge variant="outline" className="text-lg px-3 py-1">
            {produtos.length} produtos
          </Badge>
        </h2>
        <div className="flex gap-2">
          <Button onClick={fetchProdutos} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Padrão A, Premium, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional do produto..."
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CORES_PREDEFINIDAS.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 transition-all ${formData.cor === cor ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: cor }}
                        onClick={() => setFormData({ ...formData, cor })}
                      />
                    ))}
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="color"
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                        className="w-10 h-8 p-0 border-0"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Criar Produto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Como funciona:</strong> Os produtos de segmentação permitem que você direcione orçamentos específicos 
            para grupos de fornecedores. Fornecedores sem produto definido continuam vendo todos os orçamentos (comportamento legado). 
            Orçamentos sem produto definido são visíveis para todos os fornecedores.
          </p>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando produtos...</p>
            </div>
          ) : produtos.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhum produto cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro produto para começar a segmentar fornecedores</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded-full border border-border" 
                        style={{ backgroundColor: produto.cor }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {produto.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={produto.ativo}
                          onCheckedChange={() => handleToggleAtivo(produto)}
                        />
                        <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(produto)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(produto.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingProduto} onOpenChange={() => setEditingProduto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editNome">Nome *</Label>
              <Input
                id="editNome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editDescricao">Descrição</Label>
              <Textarea
                id="editDescricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.cor === cor ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setFormData({ ...formData, cor })}
                  />
                ))}
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="color"
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    className="w-10 h-8 p-0 border-0"
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
