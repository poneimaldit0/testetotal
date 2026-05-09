import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Edit2, MessageSquare, Plus, Trash2, User } from "lucide-react";
import { DepoimentoFornecedor } from "@/types/fornecedor-reputacao";
import { useFornecedorReputacao } from "@/hooks/useFornecedorReputacao";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DepoimentosManagerProps {
  fornecedorId: string;
  depoimentos: DepoimentoFornecedor[];
}

export function DepoimentosManager({ fornecedorId, depoimentos }: DepoimentosManagerProps) {
  const { criarDepoimento, atualizarDepoimento, excluirDepoimento } = useFornecedorReputacao();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DepoimentoFornecedor | null>(null);
  const [deletingItem, setDeletingItem] = useState<DepoimentoFornecedor | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_nome: '',
    depoimento: '',
    data_depoimento: ''
  });

  const resetForm = () => {
    setFormData({
      cliente_nome: '',
      depoimento: '',
      data_depoimento: ''
    });
    setEditingItem(null);
  };

  const openDialog = (item?: DepoimentoFornecedor) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        cliente_nome: item.cliente_nome,
        depoimento: item.depoimento,
        data_depoimento: item.data_depoimento || ''
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

  const handleSave = async () => {
    if (!formData.cliente_nome.trim() || !formData.depoimento.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      if (editingItem) {
        await atualizarDepoimento(editingItem.id, formData);
      } else {
        await criarDepoimento({
          fornecedor_id: fornecedorId,
          cliente_nome: formData.cliente_nome,
          depoimento: formData.depoimento,
          data_depoimento: formData.data_depoimento || undefined,
          ativo: true
        });
      }
      
      closeDialog();
      // Atualizar a lista será feito pelo parent component
      window.location.reload();
    } catch (error) {
      console.error('Erro ao salvar depoimento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setLoading(true);
    
    try {
      const success = await excluirDepoimento(deletingItem.id);
      if (success) {
        setIsDeleteDialogOpen(false);
        setDeletingItem(null);
        // Atualizar a lista será feito pelo parent component
        window.location.reload();
      }
    } catch (error) {
      console.error('Erro ao excluir depoimento:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (item: DepoimentoFornecedor) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Depoimentos de Clientes</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os depoimentos de seus clientes
          </p>
        </div>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Depoimento
        </Button>
      </div>

      {depoimentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">Nenhum depoimento cadastrado</CardTitle>
            <CardDescription className="text-center mb-4">
              Adicione depoimentos de seus clientes para demonstrar a qualidade do seu trabalho
            </CardDescription>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Primeiro Depoimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {depoimentos.map((depoimento) => (
            <Card key={depoimento.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{depoimento.cliente_nome}</CardTitle>
                    {depoimento.data_depoimento && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(depoimento.data_depoimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(depoimento)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(depoimento)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed italic">
                  "{depoimento.depoimento}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Novo/Editar Depoimento */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Depoimento' : 'Novo Depoimento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
              <Input
                id="cliente_nome"
                value={formData.cliente_nome}
                onChange={(e) => setFormData(prev => ({ ...prev, cliente_nome: e.target.value }))}
                placeholder="Nome do cliente que deu o depoimento"
              />
            </div>

            <div>
              <Label htmlFor="depoimento">Depoimento *</Label>
              <Textarea
                id="depoimento"
                value={formData.depoimento}
                onChange={(e) => setFormData(prev => ({ ...prev, depoimento: e.target.value }))}
                placeholder="Digite aqui o depoimento do cliente..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="data_depoimento">Data do Depoimento</Label>
              <Input
                id="data_depoimento"
                type="date"
                value={formData.data_depoimento}
                onChange={(e) => setFormData(prev => ({ ...prev, data_depoimento: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading || !formData.cliente_nome.trim() || !formData.depoimento.trim()}
              >
                {loading ? 'Salvando...' : editingItem ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este depoimento de "{deletingItem?.cliente_nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}