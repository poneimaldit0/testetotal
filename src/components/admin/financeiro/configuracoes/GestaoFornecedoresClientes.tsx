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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { useConfiguracaoFinanceira } from '@/hooks/useConfiguracaoFinanceira';
import { FornecedorCliente } from '@/types/financeiro';
import { NovoFornecedorClienteModal } from './NovoFornecedorClienteModal';

export function GestaoFornecedoresClientes() {
  const [fornecedores, setFornecedores] = useState<FornecedorCliente[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [fornecedorEditando, setFornecedorEditando] = useState<FornecedorCliente | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const { buscarFornecedoresClientes, atualizarFornecedorCliente, loading } = useConfiguracaoFinanceira();

  const carregarFornecedores = async () => {
    const dados = await buscarFornecedoresClientes();
    setFornecedores(dados);
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  const fornecedoresFiltrados = fornecedores.filter(fornecedor => {
    const matchBusca = fornecedor.nome.toLowerCase().includes(busca.toLowerCase()) ||
                     (fornecedor.email && fornecedor.email.toLowerCase().includes(busca.toLowerCase()));
    
    const matchTipo = filtroTipo === 'todos' || fornecedor.tipo === filtroTipo || fornecedor.tipo === 'ambos';
    
    return matchBusca && matchTipo;
  });

  const handleToggleAtivo = async (fornecedor: FornecedorCliente) => {
    const sucesso = await atualizarFornecedorCliente(fornecedor.id, { 
      ativo: !fornecedor.ativo 
    });
    if (sucesso) {
      carregarFornecedores();
    }
  };

  const handleEditarFornecedor = (fornecedor: FornecedorCliente) => {
    setFornecedorEditando(fornecedor);
    setModalAberto(true);
  };

  const handleModalClose = () => {
    setModalAberto(false);
    setFornecedorEditando(null);
    carregarFornecedores();
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'fornecedor': return 'destructive';
      case 'cliente': return 'default';
      case 'ambos': return 'secondary';
      default: return 'outline';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'fornecedor': return 'Fornecedor';
      case 'cliente': return 'Cliente';
      case 'ambos': return 'Ambos';
      default: return tipo;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com busca e filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="fornecedor">Fornecedores</SelectItem>
            <SelectItem value="cliente">Clientes</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Cadastro
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fornecedores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {fornecedores.filter(f => f.tipo === 'fornecedor' || f.tipo === 'ambos').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {fornecedores.filter(f => f.tipo === 'cliente' || f.tipo === 'ambos').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {fornecedores.filter(f => f.ativo).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de fornecedores/clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Fornecedores e Clientes Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedoresFiltrados.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {fornecedor.email || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fornecedor.telefone || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTipoBadgeVariant(fornecedor.tipo)}>
                      {getTipoLabel(fornecedor.tipo)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={fornecedor.ativo ? 'default' : 'secondary'}>
                      {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarFornecedor(fornecedor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAtivo(fornecedor)}
                        disabled={loading}
                      >
                        {fornecedor.ativo ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {fornecedoresFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum fornecedor/cliente encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Novo/Editar Fornecedor */}
      <NovoFornecedorClienteModal
        open={modalAberto}
        onClose={handleModalClose}
        fornecedor={fornecedorEditando}
      />
    </div>
  );
}