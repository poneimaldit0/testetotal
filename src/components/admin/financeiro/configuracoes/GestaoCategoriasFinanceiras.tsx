import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { CategoriaFinanceira } from '@/types/financeiro';
import { NovaCategoriaModal } from './NovaCategoriaModal';

export function GestaoCategoriasFinanceiras() {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaEditando, setCategoriaEditando] = useState<CategoriaFinanceira | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const { buscarCategorias, atualizarCategoria, desativarCategoria, loading } = useConfiguracaoFinanceira();

  const carregarCategorias = async () => {
    const dados = await buscarCategorias();
    setCategorias(dados);
  };

  useEffect(() => {
    carregarCategorias();
  }, []);

  const categoriasFiltradas = categorias.filter(categoria =>
    categoria.nome.toLowerCase().includes(busca.toLowerCase()) ||
    categoria.tipo.toLowerCase().includes(busca.toLowerCase())
  );

  const handleToggleAtiva = async (categoria: CategoriaFinanceira) => {
    const sucesso = await atualizarCategoria(categoria.id, { 
      ativa: !categoria.ativa 
    });
    if (sucesso) {
      carregarCategorias();
    }
  };

  const handleEditarCategoria = (categoria: CategoriaFinanceira) => {
    setCategoriaEditando(categoria);
    setModalAberto(true);
  };

  const handleModalClose = () => {
    setModalAberto(false);
    setCategoriaEditando(null);
    carregarCategorias();
  };

  return (
    <div className="space-y-6">
      {/* Header com busca e novo */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorias..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Categorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorias de Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {categorias.filter(c => c.tipo === 'receita').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorias de Despesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {categorias.filter(c => c.tipo === 'despesa').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de categorias */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriasFiltradas.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">{categoria.nome}</TableCell>
                  <TableCell>
                    <Badge variant={categoria.tipo === 'receita' ? 'default' : 'destructive'}>
                      {categoria.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {categoria.descricao || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoria.ativa ? 'default' : 'secondary'}>
                      {categoria.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarCategoria(categoria)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAtiva(categoria)}
                        disabled={loading}
                      >
                        {categoria.ativa ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categoriasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma categoria encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Nova/Editar Categoria */}
      <NovaCategoriaModal
        open={modalAberto}
        onClose={handleModalClose}
        categoria={categoriaEditando}
      />
    </div>
  );
}