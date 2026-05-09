import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Profile, EstatisticasFornecedor } from '@/types/supabase';
import { Users, UserPlus, Edit, BarChart3, RefreshCw, AlertTriangle, ChevronRight, Calendar, Trash2, Search, Filter, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserStatsCards } from './UserStatsCards';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FormularioContasReceber, ContaReceberFormData } from './financeiro/FormularioContasReceber';
import { useToast } from '@/hooks/use-toast';
import { SecureLogger } from '@/utils/secureLogger';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const GerenciamentoUsuarios: React.FC = () => {
  const { users, loading, createUser, updateUser, deleteUser, getUserStats, refreshUsers } = useUserManagement();
  const { toast } = useToast();
  
  // Estados locais com inicialização segura
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [selectedUserStats, setSelectedUserStats] = useState<EstatisticasFornecedor | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'admin' | 'fornecedor' | 'master' | 'gestor_conta' | 'cliente'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo' | 'suspenso' | 'pendente_aprovacao'>('todos');
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  
  // Estados para edição rápida de datas de contrato
  const [editingContractDates, setEditingContractDates] = useState(false);
  const [contractDates, setContractDates] = useState<{
    userId: string;
    userName: string;
    dataInicio: Date | undefined;
    dataTermino: Date | undefined;
  } | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    nome: '',
    telefone: '',
    empresa: '',
    tipo_usuario: 'fornecedor' as 'master' | 'admin' | 'fornecedor' | 'gestor_conta' | 'cliente',
    limite_acessos_diarios: 10,
    limite_acessos_mensais: 100,
    data_inicio_contrato: '',
    data_termino_contrato: '',
    password: '', // Para usuários administrativos
  });

  // Estados para contas a receber
  const [criarContasReceber, setCriarContasReceber] = useState(false);
  const [contasReceber, setContasReceber] = useState<ContaReceberFormData[]>([]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...users];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
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

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterType, filterStatus]);

  // Logs de debug detalhados
  console.log('🖼️ [RENDER] Renderizando GerenciamentoUsuarios');
  console.log('📊 [RENDER] Estado atual:', { 
    usersLength: users.length, 
    filteredLength: filteredUsers.length,
    loading,
    users: users.map(u => ({ id: u.id, email: u.email, nome: u.nome }))
  });

  const isAdminUserType = newUser.tipo_usuario === 'admin' || newUser.tipo_usuario === 'master' || newUser.tipo_usuario === 'gestor_conta';
  
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'Senha deve conter pelo menos uma letra maiúscula';
    if (!/[a-z]/.test(password)) return 'Senha deve conter pelo menos uma letra minúscula';
    if (!/\d/.test(password)) return 'Senha deve conter pelo menos um número';
    if (!/[@$!%*?&]/.test(password)) return 'Senha deve conter pelo menos um caractere especial (@$!%*?&)';
    return null;
  };

  const handleCreateUser = async () => {
    SecureLogger.debug('Iniciando criação de usuário', undefined, { component: 'GerenciamentoUsuarios', action: 'createUser' });
    
    // Validar senha para usuários administrativos
    if (isAdminUserType && newUser.password) {
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
    
    const success = await createUser(newUser);
    if (success) {
      setShowCreateDialog(false);
      setNewUser({
        email: '',
        nome: '',
        telefone: '',
        empresa: '',
        tipo_usuario: 'fornecedor',
        limite_acessos_diarios: 10,
        limite_acessos_mensais: 100,
        data_inicio_contrato: '',
        data_termino_contrato: '',
        password: '',
      });
      setCriarContasReceber(false);
      setContasReceber([]);
    }
  };

  const handleRefreshUsers = async () => {
    SecureLogger.debug('Refresh solicitado pelo usuário', undefined, { component: 'GerenciamentoUsuarios', action: 'refresh' });
    setIsRefreshing(true);
    await refreshUsers();
    setIsRefreshing(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    const success = await updateUser(editingUser.id, editingUser);
    if (success) {
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const success = await deleteUser(userId);
    if (success) {
      setDeletingUserId(null);
    }
  };

  const handleShowStats = async (user: Profile) => {
    const stats = await getUserStats(user.id);
    if (stats) {
      setSelectedUserStats(stats);
      setShowStatsDialog(true);
    }
  };

  const handleUpdateContractDates = async () => {
    if (!contractDates) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          data_inicio_contrato: contractDates.dataInicio?.toISOString(),
          data_termino_contrato: contractDates.dataTermino?.toISOString().split('T')[0],
        })
        .eq('id', contractDates.userId);

      if (error) throw error;

      toast({
        title: "Datas atualizadas",
        description: "Datas do contrato atualizadas com sucesso.",
      });

      setEditingContractDates(false);
      setContractDates(null);
      await refreshUsers();
    } catch (error) {
      console.error("Error updating contract dates:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar as datas do contrato.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-500';
      case 'inativo': return 'bg-gray-500';
      case 'suspenso': return 'bg-red-500';
      case 'pendente_aprovacao': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTipoUsuarioColor = (tipo: string) => {
    if (tipo === 'master') return 'bg-red-500';
    if (tipo === 'admin') return 'bg-purple-500';
    if (tipo === 'gestor_conta') return 'bg-blue-500';
    if (tipo === 'cliente') return 'bg-green-500';
    return 'bg-blue-500'; // fornecedor
  };

  const isContractExpired = (dataTermino: string | null) => {
    if (!dataTermino) return false;
    return new Date(dataTermino) < new Date();
  };

  const isContractExpiringSoon = (dataTermino: string | null) => {
    if (!dataTermino) return false;
    const today = new Date();
    const termino = new Date(dataTermino);
    const diffDays = Math.ceil((termino.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
          <Users className="h-6 w-6" />
          Gerenciamento de Usuários
          <Badge variant="outline" className="ml-2">
            {users.length} usuários
          </Badge>
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={handleRefreshUsers}
            disabled={isRefreshing}
            variant="outline"
            className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="goodref-button-primary">
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  <Select value={newUser.tipo_usuario} onValueChange={(value: 'master' | 'admin' | 'fornecedor' | 'gestor_conta' | 'cliente') => setNewUser({ ...newUser, tipo_usuario: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="gestor_conta">Gestor de Conta</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dataInicio" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Início do Contrato
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={newUser.data_inicio_contrato}
                    onChange={(e) => setNewUser({ ...newUser, data_inicio_contrato: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dataTermino" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Término do Contrato
                  </Label>
                  <Input
                    id="dataTermino"
                    type="date"
                    value={newUser.data_termino_contrato}
                    onChange={(e) => setNewUser({ ...newUser, data_termino_contrato: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="limiteDiario">Limite Diário</Label>
                    <Input
                      id="limiteDiario"
                      type="number"
                      value={newUser.limite_acessos_diarios}
                      onChange={(e) => setNewUser({ ...newUser, limite_acessos_diarios: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="limiteMensal">Limite Mensal</Label>
                    <Input
                      id="limiteMensal"
                      type="number"
                      value={newUser.limite_acessos_mensais}
                      onChange={(e) => setNewUser({ ...newUser, limite_acessos_mensais: Number(e.target.value) })}
                    />
                  </div>
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
                    />
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <p>A senha deve conter:</p>
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
                
                {/* Seção de Contas a Receber */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={criarContasReceber}
                      onCheckedChange={(checked) => {
                        setCriarContasReceber(checked as boolean);
                        if (!checked) {
                          setContasReceber([]);
                        }
                      }}
                    />
                    <Label>Cadastrar Contas a Receber</Label>
                  </div>
                  
                  {criarContasReceber && newUser.nome && (
                    <FormularioContasReceber
                      clienteNome={newUser.nome}
                      clienteEmail={newUser.email}
                      onContasChange={setContasReceber}
                      disabled={false}
                    />
                  )}
                </div>
                
                <Button onClick={handleCreateUser} className="w-full goodref-button-primary">
                  Criar Usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Nova seção de estatísticas */}
      <UserStatsCards />

      {/* Filtros e Busca */}
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
                  placeholder="Nome, email, empresa ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filterType">Tipo de Usuário</Label>
              <Select value={filterType} onValueChange={(value: typeof filterType) => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor_conta">Gestor de Conta</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filterStatus">Status</Label>
              <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
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
              <Badge variant="outline" className="text-lg px-3 py-1">
                {filteredUsers.length} de {users.length} usuários
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="goodref-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Usuários do Sistema
            <div className="flex items-center text-sm text-muted-foreground">
              <ChevronRight className="h-4 w-4 mr-1" />
              Role horizontalmente para ver todas as colunas
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando usuários...</p>
            </div>
           ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterType !== 'todos' || filterStatus !== 'todos' 
                  ? 'Nenhum usuário encontrado com os filtros aplicados' 
                  : 'Nenhum usuário encontrado'
                }
              </p>
              {searchTerm || filterType !== 'todos' || filterStatus !== 'todos' ? (
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('todos');
                    setFilterStatus('todos');
                  }} 
                  variant="outline" 
                  className="mt-4"
                >
                  Limpar Filtros
                </Button>
              ) : (
                <Button 
                  onClick={handleRefreshUsers} 
                  variant="outline" 
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar
                </Button>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-gray-600">
                Exibindo {filteredUsers.length} de {users.length} usuário(s)
                {searchTerm && ` - Busca: "${searchTerm}"`}
                {filterType !== 'todos' && ` - Tipo: ${filterType}`}
                {filterStatus !== 'todos' && ` - Status: ${filterStatus}`}
              </p>
              
              {/* Container com scroll horizontal melhorado */}
              <div className="relative">
                <div className="overflow-x-auto border rounded-lg shadow-sm">
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-[1200px]">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-900 min-w-[150px]">Nome</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[200px]">E-mail</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[150px]">Empresa</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[100px]">Tipo</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[100px]">Status</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[120px]">Contrato</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[140px]">Último Login</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[100px]">Acessos Hoje</TableHead>
                          <TableHead className="font-semibold text-gray-900 min-w-[140px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                       <TableBody>
                         {filteredUsers.map((user, index) => {
                          console.log(`👤 User #${index + 1}:`, {
                            id: user.id,
                            nome: user.nome,
                            email: user.email,
                            tipo_usuario: user.tipo_usuario,
                            status: user.status,
                            data_inicio_contrato: user.data_inicio_contrato,
                            data_termino_contrato: user.data_termino_contrato
                          });
                          SecureLogger.debug(`Renderizando usuário ${index + 1}`, { userId: user.id }, { component: 'GerenciamentoUsuarios' });
                          return (
                            <TableRow key={user.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{user.nome || '-'}</TableCell>
                              <TableCell className="text-sm">{user.email}</TableCell>
                              <TableCell className="text-sm">{user.empresa || '-'}</TableCell>
                               <TableCell>
                                  <Badge className={getTipoUsuarioColor(user.tipo_usuario)}>
                                     {user.tipo_usuario === 'master' ? 'Master' : 
                                      user.tipo_usuario === 'admin' ? 'Admin' : 
                                      user.tipo_usuario === 'gestor_conta' ? 'Gestor' : 
                                      user.tipo_usuario === 'cliente' ? 'Cliente' : 'Fornecedor'}
                                  </Badge>
                               </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(user.status)}>
                                  {user.status === 'pendente_aprovacao' ? 'Pendente' : user.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {user.data_termino_contrato ? (
                                  <div className="flex items-center gap-1">
                                    {isContractExpired(user.data_termino_contrato) && (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    )}
                                    {isContractExpiringSoon(user.data_termino_contrato) && !isContractExpired(user.data_termino_contrato) && (
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    )}
                                    <span className={`text-sm ${
                                      isContractExpired(user.data_termino_contrato) ? 'text-red-500 font-medium' :
                                      isContractExpiringSoon(user.data_termino_contrato) ? 'text-yellow-600 font-medium' : 'text-gray-600'
                                    }`}>
                                      {format(new Date(user.data_termino_contrato), 'dd/MM/yyyy', { locale: ptBR })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">Sem data</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {user.ultimo_login ? format(new Date(user.ultimo_login), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{user.acessos_diarios || 0}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                 <div className="flex gap-2">
                                   {/* Botão Ver Perfil Público - apenas para fornecedores */}
                                   {user.tipo_usuario === 'fornecedor' && user.status === 'ativo' && (
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => window.open(`/fornecedor/${user.id}`, '_blank')}
                                       className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                                       title="Ver perfil público"
                                     >
                                       <ExternalLink className="h-4 w-4" />
                                     </Button>
                                   )}
                                   {/* Botão Edição Rápida de Datas - apenas para fornecedores */}
                                   {(() => {
                                     const shouldShow = user.tipo_usuario === 'fornecedor';
                                     console.log('🔍 DEBUG Button:', {
                                       userId: user.id,
                                       userName: user.nome,
                                       email: user.email,
                                       tipoUsuario: user.tipo_usuario,
                                       status: user.status,
                                       shouldShowButton: shouldShow
                                     });
                                     return shouldShow;
                                   })() && (
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => {
                                         setContractDates({
                                           userId: user.id,
                                           userName: user.nome || user.email || '',
                                           dataInicio: user.data_inicio_contrato ? new Date(user.data_inicio_contrato) : undefined,
                                           dataTermino: user.data_termino_contrato ? new Date(user.data_termino_contrato) : undefined,
                                         });
                                         setEditingContractDates(true);
                                       }}
                                       className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
                                       title="Editar datas do contrato"
                                     >
                                       <Calendar className="h-4 w-4" />
                                     </Button>
                                   )}
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => setEditingUser(user)}
                                     className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                   >
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => handleShowStats(user)}
                                     className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                                   >
                                     <BarChart3 className="h-4 w-4" />
                                   </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setDeletingUserId(user.id)}
                                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir o usuário <strong>{user.nome}</strong> ({user.email})?
                                          <br />
                                          <br />
                                          Esta ação não pode ser desfeita e removerá:
                                          <ul className="mt-2 ml-4 list-disc text-sm">
                                            <li>Todas as inscrições em orçamentos</li>
                                            <li>Todas as candidaturas</li>
                                            <li>Logs de acesso</li>
                                            <li>Conta de usuário no sistema</li>
                                          </ul>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setDeletingUserId(null)}>
                                          Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(user.id)}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Excluir Usuário
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                {/* Indicador de scroll horizontal */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-50" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <>
              <div className="overflow-y-scroll h-[450px] px-6 py-4 border-4 border-blue-500">
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
                    <Label htmlFor="editDataInicio" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Início do Contrato
                    </Label>
                    <Input
                      id="editDataInicio"
                      type="date"
                      value={editingUser.data_inicio_contrato || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, data_inicio_contrato: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editDataTermino" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Término do Contrato
                    </Label>
                    <Input
                      id="editDataTermino"
                      type="date"
                      value={editingUser.data_termino_contrato || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, data_termino_contrato: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editStatus">Status</Label>
                    <Select value={editingUser.status} onValueChange={(value: 'ativo' | 'inativo' | 'suspenso' | 'pendente_aprovacao') => setEditingUser({ ...editingUser, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                        <SelectItem value="pendente_aprovacao">Pendente de Aprovação</SelectItem>
                      </SelectContent>
                    </Select>
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
                  
                  {editingUser.tipo_usuario === 'fornecedor' && (
                    <div>
                      <Label htmlFor="editLimitePropostasAbertas">Limite de Propostas Abertas</Label>
                      <Input
                        id="editLimitePropostasAbertas"
                        type="number"
                        value={(editingUser as any).limite_propostas_abertas || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, limite_propostas_abertas: e.target.value ? Number(e.target.value) : null } as any)}
                        placeholder="Ex: 3 (deixe vazio para sem limite)"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="px-6 py-4 border-t flex-shrink-0">
                <Button onClick={handleUpdateUser} className="w-full goodref-button-primary">
                  Salvar Alterações
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Estatísticas */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Estatísticas do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUserStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="goodref-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{selectedUserStats.acessos_hoje}</p>
                        <p className="text-xs text-muted-foreground">Acessos Hoje</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="goodref-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-secondary" />
                      <div>
                        <p className="text-2xl font-bold">{selectedUserStats.acessos_mes}</p>
                        <p className="text-xs text-muted-foreground">Acessos Mês</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="goodref-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-accent" />
                      <div>
                        <p className="text-2xl font-bold">{selectedUserStats.orcamentos_participando}</p>
                        <p className="text-xs text-muted-foreground">Orçamentos Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="goodref-card">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{selectedUserStats.total_inscricoes}</p>
                        <p className="text-xs text-muted-foreground">Total Inscrições</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Informações do Perfil</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Nome:</strong> {selectedUserStats.perfil.nome}</div>
                  <div><strong>E-mail:</strong> {selectedUserStats.perfil.email}</div>
                  <div><strong>Empresa:</strong> {selectedUserStats.perfil.empresa || '-'}</div>
                  <div><strong>Status:</strong> <Badge className={getStatusColor(selectedUserStats.status)}>{selectedUserStats.status}</Badge></div>
                  <div><strong>Último Login:</strong> {selectedUserStats.ultimo_login ? format(new Date(selectedUserStats.ultimo_login), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'}</div>
                  <div><strong>Limite Diário:</strong> {selectedUserStats.limites.diario}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição Rápida de Datas de Contrato */}
      <Dialog open={editingContractDates} onOpenChange={setEditingContractDates}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Editar Datas do Contrato
            </DialogTitle>
          </DialogHeader>
          {contractDates && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Fornecedor</p>
                <p className="text-base font-semibold">{contractDates.userName}</p>
              </div>

              <div>
                <Label>Data de Início do Contrato</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contractDates.dataInicio && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {contractDates.dataInicio 
                        ? format(contractDates.dataInicio, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={contractDates.dataInicio}
                      onSelect={(date) => setContractDates(prev => prev ? {...prev, dataInicio: date} : null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Data de Término do Contrato</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !contractDates.dataTermino && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {contractDates.dataTermino 
                        ? format(contractDates.dataTermino, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={contractDates.dataTermino}
                      onSelect={(date) => setContractDates(prev => prev ? {...prev, dataTermino: date} : null)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {contractDates.dataTermino && (
                <div className={cn(
                  "p-3 rounded-lg border",
                  new Date(contractDates.dataTermino) < new Date()
                    ? "bg-red-50 border-red-200"
                    : new Date(contractDates.dataTermino).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-green-50 border-green-200"
                )}>
                  <p className="text-sm font-medium">
                    {new Date(contractDates.dataTermino) < new Date()
                      ? "⚠️ Contrato Vencido"
                      : new Date(contractDates.dataTermino).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
                      ? "⏰ Vence em breve (menos de 30 dias)"
                      : "✅ Contrato Válido"}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingContractDates(false);
                    setContractDates(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleUpdateContractDates}
                >
                  Salvar Datas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
