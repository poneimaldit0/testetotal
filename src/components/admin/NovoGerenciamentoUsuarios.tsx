
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';
import { Users, UserPlus, Edit, BarChart3, Search, RefreshCw, AlertTriangle, Filter, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserManagement } from '@/hooks/useUserManagement';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SecureLogger } from '@/utils/secureLogger';
import { ProdutoSegmentacaoSelect } from './ProdutoSegmentacaoSelect';

export const NovoGerenciamentoUsuarios: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { users: managedUsers, loading: usersLoading, createUser, refreshUsers } = useUserManagement();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'master' | 'admin' | 'gestor_conta' | 'fornecedor' | 'cliente' | 'sdr' | 'customer_success' | 'gestor_marcenaria' | 'consultor_marcenaria' | 'closer' | 'pre_vendas'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo' | 'suspenso' | 'pendente_aprovacao'>('todos');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    email: '',
    nome: '',
    telefone: '',
    empresa: '',
    tipo_usuario: 'fornecedor' as 'master' | 'admin' | 'gestor_conta' | 'fornecedor' | 'cliente' | 'sdr' | 'customer_success' | 'gestor_marcenaria' | 'consultor_marcenaria' | 'closer' | 'pre_vendas',
    limite_acessos_diarios: 1,
    limite_acessos_mensais: 15,
    limite_candidaturas_diarias: 1,
    limite_candidaturas_mensais: 15,
    data_termino_contrato: '',
    password: '',
    produto_segmentacao_id: null as string | null,
  });

  // Sincronizar users do hook com o estado local
  useEffect(() => {
    setUsers(managedUsers);
  }, [managedUsers]);

  // Verificar se o usuário é admin, master ou CS
  const canManageUsers = profile?.tipo_usuario === 'admin' || profile?.tipo_usuario === 'master' || profile?.tipo_usuario === 'customer_success';

  // Validação de senha
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'Senha deve conter pelo menos uma letra maiúscula';
    if (!/[a-z]/.test(password)) return 'Senha deve conter pelo menos uma letra minúscula';
    if (!/\d/.test(password)) return 'Senha deve conter pelo menos um número';
    if (!/[@$!%*?&]/.test(password)) return 'Senha deve conter pelo menos um caractere especial (@$!%*?&)';
    return null;
  };

  // Verificar se é tipo administrativo
  const isAdminUserType = [
    'admin', 
    'master', 
    'gestor_conta', 
    'sdr', 
    'customer_success', 
    'gestor_marcenaria', 
    'consultor_marcenaria',
    'closer',
    'pre_vendas'
  ].includes(newUser.tipo_usuario);

  // Funções para criação e atualização de usuários
  const handleCreateUser = async () => {
    if (!canManageUsers) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores, masters e Customer Success podem criar usuários",
        variant: "destructive",
      });
      return;
    }

    // Validar senha para usuários administrativos
    if (isAdminUserType) {
      if (!newUser.password) {
        toast({
          title: "Senha obrigatória",
          description: "Para usuários administrativos, a senha é obrigatória.",
          variant: "destructive",
        });
        return;
      }
      
      const passwordError = validatePassword(newUser.password);
      if (passwordError) {
        toast({
          title: "Senha inválida",
          description: passwordError,
          variant: "destructive",
        });
        return;
      }
    }

    console.log('➕ [CREATE] Criando usuário:', newUser.email);
    setLoading(true);
    
    try {
      const success = await createUser(newUser);
      
      if (success) {
        setShowCreateDialog(false);
        setNewUser({
          email: '',
          nome: '',
          telefone: '',
          empresa: '',
          tipo_usuario: 'fornecedor',
          limite_acessos_diarios: 1,
          limite_acessos_mensais: 15,
          limite_candidaturas_diarias: 1,
          limite_candidaturas_mensais: 15,
          data_termino_contrato: '',
          password: '',
          produto_segmentacao_id: null,
        });
        
        // Aguardar um pouco e recarregar
        setTimeout(() => {
          refreshUsers();
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ [CREATE] Erro:', error);
      // O toast já foi mostrado pelo hook
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...users];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filterType !== 'todos') {
      filtered = filtered.filter(user => user.tipo_usuario === filterType);
    }

    // Filtro por status
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(user => user.status === filterStatus);
    }

    console.log('🔍 [FILTER] Filtros aplicados:', { searchTerm, filterType, filterStatus });
    console.log('📋 [FILTER] Resultados:', filtered.length);

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterType, filterStatus]);

  // Carregar usuários apenas quando o usuário estiver autenticado com permissão
  useEffect(() => {
    if (!authLoading && user && canManageUsers) {
      console.log('🚀 [INIT] Usuário com permissão autenticado, carregando usuários');
      refreshUsers();
    } else if (!authLoading && user && !canManageUsers) {
      console.log('🚫 [INIT] Usuário autenticado mas sem permissão');
      toast({
        title: "Acesso Negado",
        description: "Apenas administradores, masters e Customer Success podem gerenciar usuários",
        variant: "destructive",
      });
    }
  }, [authLoading, user, canManageUsers]);

  const handleUpdateUser = async () => {
    if (!editingUser || !canManageUsers) return;
    
    console.log('📝 [UPDATE] Atualizando usuário:', editingUser.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: editingUser.nome,
          telefone: editingUser.telefone,
          empresa: editingUser.empresa,
          status: editingUser.status,
          limite_acessos_diarios: editingUser.limite_acessos_diarios,
          limite_acessos_mensais: editingUser.limite_acessos_mensais,
          limite_candidaturas_diarias: editingUser.limite_candidaturas_diarias,
          limite_candidaturas_mensais: editingUser.limite_candidaturas_mensais,
          data_inicio_contrato: editingUser.data_inicio_contrato,
          data_termino_contrato: editingUser.data_termino_contrato,
          produto_segmentacao_id: editingUser.produto_segmentacao_id,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });
      
      setEditingUser(null);
      refreshUsers();
    } catch (error: any) {
      console.error('❌ [UPDATE] Erro:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-500 text-white';
      case 'inativo': return 'bg-gray-500 text-white';
      case 'suspenso': return 'bg-red-500 text-white';
      case 'pendente_aprovacao': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'master': return 'bg-red-500 text-white';
      case 'admin': return 'bg-purple-500 text-white';
      case 'gestor_conta': return 'bg-orange-500 text-white';
      case 'sdr': return 'bg-cyan-500 text-white';
      case 'customer_success': return 'bg-teal-500 text-white';
      case 'gestor_marcenaria': return 'bg-indigo-500 text-white';
      case 'consultor_marcenaria': return 'bg-violet-500 text-white';
      case 'closer': return 'bg-amber-500 text-white';
      case 'pre_vendas': return 'bg-lime-500 text-white';
      case 'fornecedor': return 'bg-blue-500 text-white';
      case 'cliente': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Loading state durante verificação de autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Verificação de permissão
  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Negado</h3>
          <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h3>
          <p className="text-gray-600">Apenas administradores, masters e Customer Success podem gerenciar usuários do sistema.</p>
          <p className="text-sm text-gray-500 mt-2">Seu tipo de usuário: {profile?.tipo_usuario || 'Desconhecido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          Gerenciamento de Usuários
          <Badge variant="outline" className="text-lg px-3 py-1">
            {filteredUsers.length} usuários
          </Badge>
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={refreshUsers}
            disabled={usersLoading}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
            {usersLoading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={newUser.nome}
                    onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={newUser.telefone}
                    onChange={(e) => setNewUser({ ...newUser, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input
                    id="empresa"
                    value={newUser.empresa}
                    onChange={(e) => setNewUser({ ...newUser, empresa: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo de Usuário</Label>
                  <Select value={newUser.tipo_usuario} onValueChange={(value: 'master' | 'admin' | 'gestor_conta' | 'fornecedor' | 'cliente' | 'sdr' | 'customer_success' | 'gestor_marcenaria' | 'consultor_marcenaria' | 'closer' | 'pre_vendas') => setNewUser({ ...newUser, tipo_usuario: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="sdr">SDR</SelectItem>
                      <SelectItem value="customer_success">Customer Success</SelectItem>
                      <SelectItem value="gestor_conta">Gestor de Conta</SelectItem>
                      <SelectItem value="gestor_marcenaria">Gestor Marcenaria</SelectItem>
                      <SelectItem value="consultor_marcenaria">Consultor Marcenaria</SelectItem>
                      <SelectItem value="closer">Closer</SelectItem>
                      <SelectItem value="pre_vendas">SDR Fornecedor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Campo de senha para usuários administrativos */}
                {isAdminUserType && (
                  <div>
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Digite uma senha forte"
                      required
                    />
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <p className="font-semibold">A senha deve conter:</p>
                      <ul className="list-disc list-inside ml-2">
                        <li>Pelo menos 8 caracteres</li>
                        <li>Uma letra maiúscula</li>
                        <li>Uma letra minúscula</li>
                        <li>Um número</li>
                        <li>Um caractere especial (@$!%*?&)</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Campo de produto para fornecedores */}
                {newUser.tipo_usuario === 'fornecedor' && (
                  <ProdutoSegmentacaoSelect
                    value={newUser.produto_segmentacao_id}
                    onValueChange={(value) => setNewUser({ ...newUser, produto_segmentacao_id: value })}
                    description="Deixe vazio para que o fornecedor veja todos os orçamentos (comportamento legado)"
                  />
                )}
                
                <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700">
                  Criar Usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome, email ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filterType">Tipo de Usuário</Label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor_conta">Gestor de Conta</SelectItem>
                  <SelectItem value="sdr">SDR</SelectItem>
                  <SelectItem value="customer_success">Customer Success</SelectItem>
                  <SelectItem value="gestor_marcenaria">Gestor Marcenaria</SelectItem>
                  <SelectItem value="consultor_marcenaria">Consultor Marcenaria</SelectItem>
                   <SelectItem value="closer">Closer</SelectItem>
                   <SelectItem value="pre_vendas">SDR Fornecedor</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filterStatus">Status</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="pendente_aprovacao">Pendente Aprovação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('todos');
                  setFilterStatus('todos');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Usuários ({filteredUsers.length} encontrados)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {users.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum usuário encontrado com os filtros aplicados'}
              </p>
              <Button 
                onClick={refreshUsers} 
                variant="outline" 
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{user.nome || 'Sem nome'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.empresa || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(user.tipo_usuario)}>
                          {user.tipo_usuario}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.ultimo_login 
                          ? format(new Date(user.ultimo_login), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : 'Nunca'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const userWithDates = {
                                ...user,
                                data_inicio_contrato: user.data_inicio_contrato || (user.data_criacao ? new Date(user.data_criacao).toISOString().split('T')[0] : ''),
                              };
                              setEditingUser(userWithDates);
                            }}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editNome">Nome</Label>
                <Input
                  id="editNome"
                  value={editingUser.nome || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editTelefone">Telefone</Label>
                <Input
                  id="editTelefone"
                  value={editingUser.telefone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editEmpresa">Empresa</Label>
                <Input
                  id="editEmpresa"
                  value={editingUser.empresa || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, empresa: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editingUser.status} onValueChange={(value: 'ativo' | 'inativo' | 'suspenso') => setEditingUser({ ...editingUser, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingUser.tipo_usuario === 'fornecedor' && (
                <ProdutoSegmentacaoSelect
                  value={editingUser.produto_segmentacao_id}
                  onValueChange={(value) => setEditingUser({ ...editingUser, produto_segmentacao_id: value })}
                  description="Selecione um produto para restringir quais orçamentos este fornecedor pode ver"
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDataInicio">Data Início Contrato</Label>
                  <Input
                    id="editDataInicio"
                    type="date"
                    value={editingUser.data_inicio_contrato || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, data_inicio_contrato: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editDataTermino">Data Término Contrato</Label>
                  <Input
                    id="editDataTermino"
                    type="date"
                    value={editingUser.data_termino_contrato || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, data_termino_contrato: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editLimiteDiario">Limite Acesso Diário</Label>
                  <Input
                    id="editLimiteDiario"
                    type="number"
                    value={editingUser.limite_acessos_diarios || 10}
                    onChange={(e) => setEditingUser({ ...editingUser, limite_acessos_diarios: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="editLimiteMensal">Limite Acesso Mensal</Label>
                  <Input
                    id="editLimiteMensal"
                    type="number"
                    value={editingUser.limite_acessos_mensais || 100}
                    onChange={(e) => setEditingUser({ ...editingUser, limite_acessos_mensais: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editLimiteCandidaturaDiario">Limite Candidatura Diário</Label>
                  <Input
                    id="editLimiteCandidaturaDiario"
                    type="number"
                    value={editingUser.limite_candidaturas_diarias || 10}
                    onChange={(e) => setEditingUser({ ...editingUser, limite_candidaturas_diarias: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="editLimiteCandidaturaMensal">Limite Candidatura Mensal</Label>
                  <Input
                    id="editLimiteCandidaturaMensal"
                    type="number"
                    value={editingUser.limite_candidaturas_mensais || 100}
                    onChange={(e) => setEditingUser({ ...editingUser, limite_candidaturas_mensais: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Button onClick={handleUpdateUser} className="w-full bg-blue-600 hover:bg-blue-700">
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
