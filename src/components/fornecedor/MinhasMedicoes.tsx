import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, DollarSign, FileText, ArrowLeft, ChevronDown, ChevronUp, User, List, Package } from "lucide-react";
import { ContractProgressCard } from "./ContractProgressCard";
import { ItemProgressDetails } from "./ItemProgressDetails";
import { useMedicoes } from "@/hooks/useMedicoes";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MinhasMedicoesProps {
  onVoltar: () => void;
}

interface MedicaoItem {
  id: string;
  medicao_id: string;
  item_checklist_id: string;
  percentual_executado: number;
  percentual_acumulado: number;
  valor_item_original: number;
  valor_item_medicao: number;
  observacoes?: string;
  // Dados do checklist_itens combinados
  nome?: string;
  categoria?: string;
  descricao?: string;
  ordem?: number;
}

interface MedicaoFornecedor {
  id: string;
  numero_medicao: number;
  data_medicao: string;
  valor_medicao: number;
  status: string;
  descricao?: string;
  observacoes_fornecedor?: string;
  observacoes_cliente?: string;
  baseado_em_itens: boolean;
  contrato_id: string;
  cliente_nome?: string;
  valor_contrato?: number;
  created_at: string;
  data_aprovacao?: string;
  data_pagamento?: string;
  itens?: MedicaoItem[];
}

interface ClienteComMedicoes {
  cliente_nome: string;
  medicoes: MedicaoFornecedor[];
  estatisticas: {
    total: number;
    enviadas: number;
    aprovadas: number;
    pagas: number;
    valorTotal: number;
    valorPago: number;
  };
}

export function MinhasMedicoes({ onVoltar }: MinhasMedicoesProps) {
  const { profile } = useAuth();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [medicaoExpandida, setMedicaoExpandida] = useState<string | null>(null);
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);

  console.log('🔍 MinhasMedicoes: Profile ID:', profile?.id);
  console.log('🔍 MinhasMedicoes: Iniciando componente');

  const { data: medicoesFornecedor = [], isLoading } = useQuery({
    queryKey: ['medicoes-fornecedor-corrigido', profile?.id],
    queryFn: async () => {
      if (!profile?.id) {
        console.log('❌ MinhasMedicoes: Profile ID não disponível');
        return [];
      }

      console.log('🚀 MinhasMedicoes: Iniciando carregamento para fornecedor:', profile.id);
      
      try {
        // Buscar medições com uma query mais simples e robusta
        const { data: medicoesData, error: medicoesError } = await supabase
          .from('medicoes_obra')
          .select(`
            *,
            contratos (
              id,
              valor_contrato,
              clientes (nome)
            )
          `)
          .eq('fornecedor_id', profile.id)
          .order('created_at', { ascending: false });

        if (medicoesError) {
          console.error('❌ MinhasMedicoes: Erro ao buscar medições:', medicoesError);
          throw medicoesError;
        }

        console.log('📋 MinhasMedicoes: Medições encontradas no banco:', medicoesData?.length || 0);
        console.log('📋 MinhasMedicoes: Dados brutos:', medicoesData);

        if (!medicoesData || medicoesData.length === 0) {
          console.log('⚠️ MinhasMedicoes: Nenhuma medição encontrada no banco de dados');
          return [];
        }

        // Processar cada medição
        const medicoesProcessadas: MedicaoFornecedor[] = [];
        
        for (const medicao of medicoesData) {
          console.log('🔄 MinhasMedicoes: Processando medição:', {
            id: medicao.id,
            numero: medicao.numero_medicao,
            contrato: medicao.contrato_id,
            baseado_em_itens: medicao.baseado_em_itens
          });

          const medicaoBase: MedicaoFornecedor = {
            id: medicao.id,
            numero_medicao: medicao.numero_medicao,
            data_medicao: medicao.data_medicao,
            valor_medicao: medicao.valor_medicao || 0,
            status: medicao.status || 'enviada',
            descricao: medicao.descricao || '',
            observacoes_fornecedor: medicao.observacoes_fornecedor,
            observacoes_cliente: medicao.observacoes_cliente,
            baseado_em_itens: medicao.baseado_em_itens || false,
            contrato_id: medicao.contrato_id,
            created_at: medicao.created_at,
            data_aprovacao: medicao.data_aprovacao,
            data_pagamento: medicao.data_pagamento,
            cliente_nome: medicao.contratos?.clientes?.nome || 'Cliente não identificado',
            valor_contrato: medicao.contratos?.valor_contrato
          };

          console.log('💰 MinhasMedicoes: Debug valor contrato:', {
            medicaoId: medicao.id,
            contratoId: medicao.contrato_id,
            valorContrato: medicao.contratos?.valor_contrato,
            contratoCompleto: medicao.contratos
          });

          // Se baseado em itens, carregar os itens detalhados
          if (medicao.baseado_em_itens) {
            console.log('🔍 MinhasMedicoes: Carregando itens para medição:', medicao.id);
            
            // Buscar itens e checklist separadamente já que não há foreign key
            const { data: medicaoItens, error: medicaoItensError } = await supabase
              .from('medicoes_itens')
              .select('*')
              .eq('medicao_id', medicao.id);

            if (medicaoItensError) {
              console.error('❌ MinhasMedicoes: Erro ao carregar medicoes_itens:', medicaoItensError);
              medicaoBase.itens = [];
            } else if (medicaoItens && medicaoItens.length > 0) {
              console.log('✅ MinhasMedicoes: Medicoes_itens carregados:', medicaoItens.length);
              
              // Buscar dados dos checklist_itens
              const checklistIds = medicaoItens.map(item => item.item_checklist_id);
              const { data: checklistItens, error: checklistError } = await supabase
                .from('checklist_itens')
                .select('*')
                .in('id', checklistIds);

              if (checklistError) {
                console.error('❌ MinhasMedicoes: Erro ao carregar checklist_itens:', checklistError);
                medicaoBase.itens = medicaoItens;
              } else {
                console.log('✅ MinhasMedicoes: Checklist_itens carregados:', checklistItens?.length || 0);
                
                // Combinar os dados
                medicaoBase.itens = medicaoItens.map(medicaoItem => {
                  const checklistItem = checklistItens?.find(ci => ci.id === medicaoItem.item_checklist_id);
                  return {
                    ...medicaoItem,
                    nome: checklistItem?.nome || 'Item não encontrado',
                    categoria: checklistItem?.categoria || 'Sem categoria',
                    descricao: checklistItem?.descricao || '',
                    ordem: checklistItem?.ordem || 0
                  };
                });
                
                console.log('📊 MinhasMedicoes: Itens combinados:', medicaoBase.itens);
              }
            } else {
              medicaoBase.itens = [];
            }
          } else {
            medicaoBase.itens = [];
          }
          
          console.log('📋 MinhasMedicoes: Medição final processada:', {
            id: medicaoBase.id,
            baseado_em_itens: medicaoBase.baseado_em_itens,
            tem_itens: medicaoBase.itens?.length || 0,
            itens_sample: medicaoBase.itens?.slice(0, 1)
          });

          medicoesProcessadas.push(medicaoBase);
          console.log('✅ MinhasMedicoes: Medição processada com sucesso');
        }
        
        console.log('🎯 MinhasMedicoes: Total de medições processadas:', medicoesProcessadas.length);
        return medicoesProcessadas;
        
      } catch (error) {
        console.error('❌ MinhasMedicoes: Erro geral no carregamento:', error);
        throw error;
      }
    },
    enabled: !!profile?.id,
    retry: 2,
    staleTime: 0, // Sempre buscar dados frescos para debug
    refetchOnWindowFocus: false
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enviada': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'aprovada': return 'bg-green-100 text-green-800 border-green-200';
      case 'reprovada': return 'bg-red-100 text-red-800 border-red-200';
      case 'paga': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'enviada': return 'Enviada';
      case 'aprovada': return 'Aprovada';
      case 'reprovada': return 'Reprovada';
      case 'paga': return 'Paga';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  // Agrupar medições por cliente e calcular progresso do contrato
  const clientesComMedicoes = medicoesFornecedor.reduce((acc, medicao) => {
    const clienteNome = medicao.cliente_nome || 'Cliente não identificado';
    
    if (!acc[clienteNome]) {
      acc[clienteNome] = {
        cliente_nome: clienteNome,
        medicoes: [],
        estatisticas: {
          total: 0,
          enviadas: 0,
          aprovadas: 0,
          pagas: 0,
          valorTotal: 0,
          valorPago: 0
        }
      };
    }
    
    acc[clienteNome].medicoes.push(medicao);
    acc[clienteNome].estatisticas.total++;
    acc[clienteNome].estatisticas.valorTotal += medicao.valor_medicao || 0;
    
    if (medicao.status === 'enviada') acc[clienteNome].estatisticas.enviadas++;
    if (medicao.status === 'aprovada') acc[clienteNome].estatisticas.aprovadas++;
    if (medicao.status === 'paga') {
      acc[clienteNome].estatisticas.pagas++;
      acc[clienteNome].estatisticas.valorPago += medicao.valor_medicao || 0;
    }
    
    return acc;
  }, {} as Record<string, ClienteComMedicoes>);

  // Função para calcular progresso do contrato
  const calcularProgressoContrato = (medicoes: MedicaoFornecedor[]) => {
    const valorTotalMedido = medicoes.reduce((acc, m) => acc + (m.valor_medicao || 0), 0);
    const valorPago = medicoes.filter(m => m.status === 'paga').reduce((acc, m) => acc + (m.valor_medicao || 0), 0);
    
    // Usar o valor real do contrato (primeira medição tem o valor do contrato)
    const valorTotalContrato = medicoes.length > 0 ? (medicoes[0].valor_contrato || valorTotalMedido) : valorTotalMedido;
    
    console.log('🧮 MinhasMedicoes: Debug cálculo progresso:', {
      quantidadeMedicoes: medicoes.length,
      valorTotalMedido,
      valorContratoMedicao0: medicoes[0]?.valor_contrato,
      valorTotalContrato,
      percentual: valorTotalContrato > 0 ? (valorTotalMedido / valorTotalContrato) * 100 : 0
    });
    
    // Para contratos baseados em itens, calcular estatísticas dos itens
    const medicaesComItens = medicoes.filter(m => m.baseado_em_itens && m.itens);
    let totalItens = 0;
    let itensIniciados = 0;
    let itensCompletos = 0;
    
    if (medicaesComItens.length > 0) {
      // Coletar todos os itens únicos
      const itensUnicos = new Map();
      
      medicaesComItens.forEach(med => {
        med.itens?.forEach(item => {
          const key = item.item_checklist_id;
          if (!itensUnicos.has(key) || itensUnicos.get(key).percentual_acumulado < item.percentual_acumulado) {
            itensUnicos.set(key, item);
          }
        });
      });
      
      totalItens = itensUnicos.size;
      itensUnicos.forEach(item => {
        if (item.percentual_acumulado > 0) itensIniciados++;
        if (item.percentual_acumulado >= 100) itensCompletos++;
      });
    }
    
    return {
      valorTotal: valorTotalContrato,
      valorMedido: valorTotalMedido,
      percentualConcluido: valorTotalContrato > 0 ? (valorTotalMedido / valorTotalContrato) * 100 : 0,
      valorRestante: Math.max(0, valorTotalContrato - valorTotalMedido),
      totalItens,
      itensIniciados,
      itensCompletos
    };
  };

  // Converter para array e ordenar por valor total
  const listaClientes = Object.values(clientesComMedicoes)
    .sort((a, b) => b.estatisticas.valorTotal - a.estatisticas.valorTotal);

  // Filtrar clientes e suas medições
  const clientesFiltrados = listaClientes.map(cliente => {
    const medicoesFiltradas = cliente.medicoes.filter(medicao => {
      const matchStatus = filtroStatus === "todos" || medicao.status === filtroStatus;
      const matchTexto = !buscaTexto || 
        medicao.descricao?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
        medicao.cliente_nome?.toLowerCase().includes(buscaTexto.toLowerCase()) ||
        medicao.numero_medicao.toString().includes(buscaTexto);
      
      return matchStatus && matchTexto;
    });

    return {
      ...cliente,
      medicoes: medicoesFiltradas
    };
  }).filter(cliente => cliente.medicoes.length > 0);

  // Estatísticas gerais
  const estatisticas = {
    total: medicoesFornecedor.length,
    enviadas: medicoesFornecedor.filter(m => m.status === 'enviada').length,
    aprovadas: medicoesFornecedor.filter(m => m.status === 'aprovada').length,
    pagas: medicoesFornecedor.filter(m => m.status === 'paga').length,
    valorTotal: medicoesFornecedor.reduce((acc, m) => acc + (m.valor_medicao || 0), 0),
    valorPago: medicoesFornecedor.filter(m => m.status === 'paga').reduce((acc, m) => acc + (m.valor_medicao || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={onVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold">Minhas Medições</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">Minhas Medições</h2>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Medições</p>
                <p className="text-2xl font-bold">{estatisticas.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-blue-600">{estatisticas.enviadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(estatisticas.valorTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Recebido</p>
                <p className="text-2xl font-bold">{formatCurrency(estatisticas.valorPago)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por descrição, cliente ou número..."
          value={buscaTexto}
          onChange={(e) => setBuscaTexto(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="sm:max-w-xs">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="enviada">Enviadas</SelectItem>
            <SelectItem value="aprovada">Aprovadas</SelectItem>
            <SelectItem value="reprovada">Reprovadas</SelectItem>
            <SelectItem value="paga">Pagas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Clientes com Medições */}
      {clientesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma medição encontrada</h3>
            <p className="text-muted-foreground">
              {medicoesFornecedor.length === 0 
                ? "Você ainda não criou nenhuma medição."
                : "Nenhuma medição corresponde aos filtros aplicados."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {clientesFiltrados.map((cliente) => (
            <Card key={cliente.cliente_nome} className="transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{cliente.cliente_nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {cliente.estatisticas.total} medições • {formatCurrency(cliente.estatisticas.valorTotal)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      {cliente.estatisticas.enviadas > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {cliente.estatisticas.enviadas} pendentes
                        </Badge>
                      )}
                      {cliente.estatisticas.pagas > 0 && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          {cliente.estatisticas.pagas} pagas
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setClienteExpandido(
                        clienteExpandido === cliente.cliente_nome ? null : cliente.cliente_nome
                      )}
                    >
                      {clienteExpandido === cliente.cliente_nome ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {clienteExpandido === cliente.cliente_nome && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4 space-y-6">
                    {/* Progresso do Contrato */}
                    <ContractProgressCard 
                      clienteNome={cliente.cliente_nome}
                      progress={calcularProgressoContrato(cliente.medicoes)}
                    />
                    
                    {/* Estatísticas do Cliente */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-lg font-semibold">{cliente.estatisticas.total}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Pendentes</p>
                        <p className="text-lg font-semibold text-blue-600">{cliente.estatisticas.enviadas}</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Aprovadas</p>
                        <p className="text-lg font-semibold text-green-600">{cliente.estatisticas.aprovadas}</p>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Pagas</p>
                        <p className="text-lg font-semibold text-emerald-600">{cliente.estatisticas.pagas}</p>
                      </div>
                    </div>

                    {/* Lista de Medições do Cliente */}
                    <div className="space-y-3">
                      {cliente.medicoes.map((medicao) => (
                        <Card key={medicao.id} className="transition-all hover:shadow-sm border-l-4 border-l-primary/20">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    Medição #{medicao.numero_medicao}
                                    <Badge className={getStatusColor(medicao.status)}>
                                      {getStatusLabel(medicao.status)}
                                    </Badge>
                                  </CardTitle>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {formatDate(medicao.data_medicao)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-lg font-semibold">{formatCurrency(medicao.valor_medicao)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {medicao.baseado_em_itens ? 'Por itens' : 'Tradicional'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMedicaoExpandida(
                                    medicaoExpandida === medicao.id ? null : medicao.id
                                  )}
                                >
                                  {medicaoExpandida === medicao.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          {medicaoExpandida === medicao.id && (
                            <CardContent className="pt-0">
                              <div className="space-y-4 border-t pt-4">
                                {medicao.descricao && (
                                  <div>
                                    <h4 className="font-medium mb-2">Descrição</h4>
                                    <p className="text-sm text-muted-foreground">{medicao.descricao}</p>
                                  </div>
                                )}

                                {medicao.observacoes_fornecedor && (
                                  <div>
                                    <h4 className="font-medium mb-2">Suas Observações</h4>
                                    <p className="text-sm text-muted-foreground">{medicao.observacoes_fornecedor}</p>
                                  </div>
                                )}

                                 {medicao.observacoes_cliente && (
                                   <div>
                                     <h4 className="font-medium mb-2">Observações do Cliente</h4>
                                     <p className="text-sm text-muted-foreground">{medicao.observacoes_cliente}</p>
                                   </div>
                                 )}

                                 {/* Detalhes dos Itens com Componente Aprimorado */}
                                 {(() => {
                                   console.log('🎯 MinhasMedicoes: Verificando condição para itens:', {
                                     medicao_id: medicao.id,
                                     baseado_em_itens: medicao.baseado_em_itens,
                                     tem_itens_array: !!medicao.itens,
                                     quantidade_itens: medicao.itens?.length || 0,
                                     itens_data: medicao.itens
                                   });
                                   return null;
                                 })()}
                                 
                                 {medicao.baseado_em_itens && medicao.itens && medicao.itens.length > 0 ? (
                                   <div className="mt-6">
                                      <ItemProgressDetails 
                                        itens={medicao.itens.map(item => ({
                                          id: item.id,
                                          nome: item.nome || `Item ${item.item_checklist_id}`,
                                          categoria: item.categoria || 'Não categorizado',
                                          descricao: item.descricao,
                                          percentualExecutado: item.percentual_executado,
                                          percentualAcumulado: item.percentual_acumulado,
                                          valorOriginal: item.valor_item_original,
                                          valorExecutado: item.valor_item_medicao,
                                          observacoes: item.observacoes
                                       }))}
                                       titulo={`Itens da Medição #${medicao.numero_medicao}`}
                                      />
                                    </div>
                                  ) : medicao.baseado_em_itens ? (
                                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                                      <p className="text-sm text-muted-foreground">
                                        {medicao.itens ? 
                                          `Nenhum item encontrado para esta medição (${medicao.itens.length} itens)` :
                                          'Carregando itens da medição...'
                                        }
                                      </p>
                                    </div>
                                  ) : null}

                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                   <div>
                                     <span className="font-medium">Criada em:</span>
                                     <p className="text-muted-foreground">{formatDate(medicao.created_at)}</p>
                                   </div>
                                   
                                   {medicao.data_aprovacao && (
                                     <div>
                                       <span className="font-medium">Aprovada em:</span>
                                       <p className="text-muted-foreground">{formatDate(medicao.data_aprovacao)}</p>
                                     </div>
                                   )}

                                   {medicao.data_pagamento && (
                                     <div>
                                       <span className="font-medium">Paga em:</span>
                                       <p className="text-muted-foreground">{formatDate(medicao.data_pagamento)}</p>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             </CardContent>
                           )}
                         </Card>
                       ))}
                     </div>
                   </div>
                 </CardContent>
               )}
             </Card>
           ))}
         </div>
       )}
     </div>
   );
 }