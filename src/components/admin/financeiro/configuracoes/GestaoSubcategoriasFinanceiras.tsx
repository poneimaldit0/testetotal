import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { useConfiguracaoFinanceira } from '@/hooks/useConfiguracaoFinanceira';
import { CategoriaFinanceira, SubcategoriaFinanceira } from '@/types/financeiro';
import { NovaSubcategoriaModal } from './NovaSubcategoriaModal';

export function GestaoSubcategoriasFinanceiras() {
  const [subcategorias, setSubcategorias] = useState<SubcategoriaFinanceira[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [subcategoriaEditando, setSubcategoriaEditando] = useState<SubcategoriaFinanceira | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  
  const { 
    buscarSubcategorias, 
    buscarCategorias,
    atualizarSubcategoria, 
    desativarSubcategoria, 
    loading 
  } = useConfiguracaoFinanceira();

  const carregarDados = async () => {
    const [dadosSubcategorias, dadosCategorias] = await Promise.all([
      buscarSubcategorias(),
      buscarCategorias()
    ]);
    setSubcategorias(dadosSubcategorias);
    setCategorias(dadosCategorias.filter(c => c.ativa));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const subcategoriasFiltradas = subcategorias.filter(subcategoria => {
    const matchBusca = subcategoria.nome.toLowerCase().includes(busca.toLowerCase()) ||
      subcategoria.categoria?.nome.toLowerCase().includes(busca.toLowerCase());
    
    const matchCategoria = !categoriaFiltro || categoriaFiltro === 'all' || subcategoria.categoria_id === categoriaFiltro;
    
    return matchBusca && matchCategoria;
  });

  const handleToggleAtiva = async (subcategoria: SubcategoriaFinanceira) => {
    const sucesso = await atualizarSubcategoria(subcategoria.id, { 
      ativa: !subcategoria.ativa 
    });
    if (sucesso) {
      carregarDados();
    }
  };

  const handleEditarSubcategoria = (subcategoria: SubcategoriaFinanceira) => {
    setSubcategoriaEditando(subcategoria);
    setModalAberto(true);
  };

  const handleModalClose = () => {
    setModalAberto(false);
    setSubcategoriaEditando(null);
    carregarDados();
  };

  const getEstatisticasPorCategoria = () => {
    return categorias.map(categoria => ({
      categoria,
      total: subcategorias.filter(s => s.categoria_id === categoria.id).length,
      ativas: subcategorias.filter(s => s.categoria_id === categoria.id && s.ativa).length
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header com busca e filtros */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar subcategorias..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categorias.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Subcategoria
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Subcategorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subcategorias.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subcategorias Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {subcategorias.filter(s => s.ativa).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              De Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {subcategorias.filter(s => s.categoria?.tipo === 'receita').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              De Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {subcategorias.filter(s => s.categoria?.tipo === 'despesa').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de subcategorias */}
      <Card>
        <CardHeader>
          <CardTitle>Subcategorias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria → Subcategoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategoriasFiltradas.map((subcategoria) => (
                <TableRow key={subcategoria.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {subcategoria.categoria?.nome}
                      </span>
                      <span className="font-medium">
                        {subcategoria.nome}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subcategoria.categoria?.tipo === 'receita' ? 'default' : 'destructive'}>
                      {subcategoria.categoria?.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {subcategoria.descricao || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={subcategoria.ativa ? 'default' : 'secondary'}>
                      {subcategoria.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarSubcategoria(subcategoria)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAtiva(subcategoria)}
                        disabled={loading}
                      >
                        {subcategoria.ativa ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {subcategoriasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma subcategoria encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Nova/Editar Subcategoria */}
      <NovaSubcategoriaModal
        open={modalAberto}
        onClose={handleModalClose}
        subcategoria={subcategoriaEditando}
        categorias={categorias}
      />
    </div>
  );
}