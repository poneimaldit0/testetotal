import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag } from "lucide-react";
import { useChecklistItens } from "@/hooks/useChecklistItens";
import { useToast } from "@/hooks/use-toast";

interface ItemExtra {
  id: string;
  nome: string;
  descricao?: string;
  valor_estimado: number;
  ambientes: string[];
  observacoes?: string;
  item_extra: boolean;
  nome_item_extra?: string;
  descricao_item_extra?: string;
  item_id?: string;
}

interface ItensExtrasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: ItemExtra) => void;
  itensJaIncluidos: string[];
}

export const ItensExtrasModal: React.FC<ItensExtrasModalProps> = ({
  open,
  onOpenChange,
  onAddItem,
  itensJaIncluidos
}) => {
  const [activeTab, setActiveTab] = useState("sistema");
  const [selectedSystemItem, setSelectedSystemItem] = useState<string>("");
  const [customItem, setCustomItem] = useState({
    nome: "",
    descricao: "",
    valor_estimado: 0,
    ambientes: [] as string[],
    observacoes: ""
  });

  const { itemsByCategory, loading } = useChecklistItens();
  const { toast } = useToast();

  // Filtrar itens do sistema que não estão já incluídos
  const itensDisponiveis = Object.entries(itemsByCategory).reduce((acc, [categoria, itens]) => {
    const itensFiltrados = itens.filter(item => !itensJaIncluidos.includes(item.id));
    if (itensFiltrados.length > 0) {
      acc[categoria] = itensFiltrados;
    }
    return acc;
  }, {} as Record<string, typeof itemsByCategory[string]>);

  const handleAddSystemItem = () => {
    if (!selectedSystemItem) {
      toast({
        title: "Erro",
        description: "Selecione um item do sistema",
        variant: "destructive",
      });
      return;
    }

    // Encontrar o item selecionado
    let itemEncontrado = null;
    for (const categoria of Object.values(itensDisponiveis)) {
      const item = categoria.find(i => i.id === selectedSystemItem);
      if (item) {
        itemEncontrado = item;
        break;
      }
    }

    if (!itemEncontrado) return;

    const itemExtra: ItemExtra = {
      id: `extra_${Date.now()}`,
      nome: itemEncontrado.nome,
      descricao: itemEncontrado.descricao,
      valor_estimado: 0,
      ambientes: [],
      observacoes: "",
      item_extra: true,
      item_id: itemEncontrado.id
    };

    onAddItem(itemExtra);
    setSelectedSystemItem("");
    toast({
      title: "Sucesso",
      description: "Item extra do sistema adicionado",
    });
  };

  const handleAddCustomItem = () => {
    if (!customItem.nome || customItem.valor_estimado <= 0) {
      toast({
        title: "Erro",
        description: "Nome e valor são obrigatórios para itens personalizados",
        variant: "destructive",
      });
      return;
    }

    const itemExtra: ItemExtra = {
      id: `custom_${Date.now()}`,
      nome: customItem.nome,
      descricao: customItem.descricao,
      valor_estimado: customItem.valor_estimado,
      ambientes: customItem.ambientes,
      observacoes: customItem.observacoes,
      item_extra: true,
      nome_item_extra: customItem.nome,
      descricao_item_extra: customItem.descricao
    };

    onAddItem(itemExtra);
    setCustomItem({
      nome: "",
      descricao: "",
      valor_estimado: 0,
      ambientes: [],
      observacoes: ""
    });
    toast({
      title: "Sucesso",
      description: "Item extra personalizado adicionado",
    });
  };

  const addAmbiente = (ambiente: string) => {
    if (ambiente && !customItem.ambientes.includes(ambiente)) {
      setCustomItem(prev => ({
        ...prev,
        ambientes: [...prev.ambientes, ambiente]
      }));
    }
  };

  const removeAmbiente = (ambiente: string) => {
    setCustomItem(prev => ({
      ...prev,
      ambientes: prev.ambientes.filter(a => a !== ambiente)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Adicionar Itens Extras
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adicione itens extras à sua proposta. Estes itens serão destacados para o cliente como diferenciais da sua proposta.
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sistema">Itens do Sistema</TabsTrigger>
            <TabsTrigger value="personalizado">Item Personalizado</TabsTrigger>
          </TabsList>

          <TabsContent value="sistema" className="space-y-4">
            <div className="space-y-4">
              <Label>Selecione um item disponível do sistema:</Label>
              
              {loading ? (
                <div className="text-center py-4">Carregando itens...</div>
              ) : Object.keys(itensDisponiveis).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Todos os itens do sistema já foram incluídos no orçamento
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {Object.entries(itensDisponiveis).map(([categoria, itens]) => (
                    <div key={categoria}>
                      <h4 className="font-medium text-sm mb-2 text-primary">{categoria}</h4>
                      <div className="space-y-2 ml-4">
                        {itens.map((item) => (
                          <div key={item.id} className="flex items-start space-x-3 p-2 border rounded-lg">
                            <Checkbox
                              checked={selectedSystemItem === item.id}
                              onCheckedChange={(checked) => {
                                setSelectedSystemItem(checked ? item.id : "");
                              }}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.nome}</div>
                              {item.descricao && (
                                <div className="text-xs text-muted-foreground">{item.descricao}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                onClick={handleAddSystemItem} 
                disabled={!selectedSystemItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item Selecionado
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="personalizado" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Item *</Label>
                <Input
                  id="nome"
                  value={customItem.nome}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Iluminação LED decorativa"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={customItem.descricao}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva detalhes do item extra..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="valor">Valor Estimado *</Label>
                <Input
                  id="valor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customItem.valor_estimado}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, valor_estimado: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Ambientes</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Digite um ambiente e pressione Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addAmbiente(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {customItem.ambientes.map((ambiente) => (
                    <Badge
                      key={ambiente}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeAmbiente(ambiente)}
                    >
                      {ambiente} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={customItem.observacoes}
                  onChange={(e) => setCustomItem(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações adicionais sobre este item..."
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleAddCustomItem}
                disabled={!customItem.nome || customItem.valor_estimado <= 0}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item Personalizado
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};