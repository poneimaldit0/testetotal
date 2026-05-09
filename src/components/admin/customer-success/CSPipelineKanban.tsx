import { useState, useMemo } from 'react';
import { useCSEtapas, useCSFornecedores, useMoverEtapaCS } from '@/hooks/useCustomerSuccessCRM';
import { useAuth } from '@/hooks/useAuth';
import { CSFornecedor, CSEtapaConfig } from '@/types/customerSuccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, Users, AlertTriangle, Flag, CheckCircle2, XCircle, Search, X } from 'lucide-react';
import { CSCardFornecedor } from './CSCardFornecedor';
import { CSDetalhesFornecedor } from './CSDetalhesFornecedor';
import { CSAdicionarFornecedorModal } from './CSAdicionarFornecedorModal';

export function CSPipelineKanban() {
  const { data: etapas, isLoading: loadingEtapas } = useCSEtapas();
  const { data: fornecedores, isLoading: loadingFornecedores } = useCSFornecedores();
  const { profile } = useAuth();
  const moverEtapa = useMoverEtapaCS();

  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<CSFornecedor | null>(null);
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [draggedItem, setDraggedItem] = useState<CSFornecedor | null>(null);
  const [termoPesquisa, setTermoPesquisa] = useState('');

  const fornecedoresFiltrados = useMemo(() => {
    if (!fornecedores || !termoPesquisa.trim()) return fornecedores;
    
    const termo = termoPesquisa.toLowerCase().trim();
    
    return fornecedores.filter(f => {
      const nome = f.fornecedor?.nome?.toLowerCase() || '';
      const empresa = f.fornecedor?.empresa?.toLowerCase() || '';
      const email = f.fornecedor?.email?.toLowerCase() || '';
      const telefone = f.fornecedor?.telefone?.toLowerCase() || '';
      const csNome = f.cs_responsavel?.nome?.toLowerCase() || '';
      
      return nome.includes(termo) ||
             empresa.includes(termo) ||
             email.includes(termo) ||
             telefone.includes(termo) ||
             csNome.includes(termo);
    });
  }, [fornecedores, termoPesquisa]);

  const getFornecedoresPorEtapa = (etapaId: string) => {
    return fornecedoresFiltrados?.filter(f => f.etapa_atual_id === etapaId && f.status === 'ativo') || [];
  };

  const getIconeFlag = (tipoFlag: string) => {
    switch (tipoFlag) {
      case 'yellow_flag':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'red_flag':
        return <Flag className="h-4 w-4 text-red-600" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const handleDragStart = (e: React.DragEvent, fornecedor: CSFornecedor) => {
    setDraggedItem(fornecedor);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, etapa: CSEtapaConfig) => {
    e.preventDefault();
    
    if (!draggedItem || !profile) return;
    if (draggedItem.etapa_atual_id === etapa.id) return;

    await moverEtapa.mutateAsync({
      cs_fornecedor_id: draggedItem.id,
      etapa_anterior_id: draggedItem.etapa_atual_id,
      etapa_nova_id: etapa.id,
      movido_por_id: profile.id,
      movido_por_nome: profile.nome
    });

    setDraggedItem(null);
  };

  if (loadingEtapas || loadingFornecedores) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[600px] w-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  const totalFornecedores = fornecedores?.filter(f => f.status === 'ativo').length || 0;
  const totalFiltrados = fornecedoresFiltrados?.filter(f => f.status === 'ativo').length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Pipeline CS - Fornecedores</h1>
            <Badge variant="secondary" className="text-sm">
              <Users className="h-3 w-3 mr-1" />
              {totalFornecedores} fornecedores ativos
            </Badge>
          </div>
          <Button onClick={() => setModalAdicionar(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Fornecedor
          </Button>
        </div>
        
        {/* Campo de pesquisa */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar por nome, empresa, telefone, CS responsável..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className="pl-10 pr-10"
            />
            {termoPesquisa && (
              <button
                onClick={() => setTermoPesquisa('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {termoPesquisa && (
            <span className="text-sm text-muted-foreground">
              Exibindo {totalFiltrados} de {totalFornecedores} fornecedores
            </span>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="flex-1">
        <div className="p-4 flex gap-4 min-w-max">
          {etapas?.map(etapa => {
            const fornecedoresEtapa = getFornecedoresPorEtapa(etapa.id);
            
            return (
              <div
                key={etapa.id}
                className="w-[320px] flex-shrink-0"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, etapa)}
              >
                <Card className="h-full bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${etapa.cor}`} />
                        {getIconeFlag(etapa.tipo_flag)}
                        <CardTitle className="text-sm font-medium">
                          {etapa.nome}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {fornecedoresEtapa.length}
                      </Badge>
                    </div>
                    {etapa.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {etapa.descricao}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-2 min-h-[100px]">
                      {fornecedoresEtapa.map(fornecedor => (
                        <CSCardFornecedor
                          key={fornecedor.id}
                          fornecedor={fornecedor}
                          onDragStart={(e) => handleDragStart(e, fornecedor)}
                          onClick={() => setFornecedorSelecionado(fornecedor)}
                        />
                      ))}
                      {fornecedoresEtapa.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum fornecedor
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Painel de detalhes */}
      {fornecedorSelecionado && (
        <CSDetalhesFornecedor
          csFornecedor={fornecedorSelecionado}
          onClose={() => setFornecedorSelecionado(null)}
        />
      )}

      {/* Modal adicionar */}
      <CSAdicionarFornecedorModal
        open={modalAdicionar}
        onOpenChange={setModalAdicionar}
      />
    </div>
  );
}
