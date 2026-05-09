import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Calendar, CalendarCheck } from 'lucide-react';
import { DetalhesVencimentoModal } from './DetalhesVencimentoModal';
import { EditarContaReceberModal } from './EditarContaReceberModal';
import { EditarContaPagarModal } from './EditarContaPagarModal';
import { ReceberContaModal } from './ReceberContaModal';
import { PagarContaModal } from './PagarContaModal';
import { MarcarPerdaModal } from './MarcarPerdaModal';
import { ExcluirContaComMotivoDialog } from './ExcluirContaComMotivoDialog';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardFinanceiro, ContaVencimento, ContaReceber, ContaPagar } from '@/types/financeiro';

interface AlertasVencimentoProps {
  dashboard: DashboardFinanceiro;
  onDashboardUpdate?: () => void;
}

export const AlertasVencimento = ({ dashboard, onDashboardUpdate }: AlertasVencimentoProps) => {
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<'hoje' | 'amanha' | 'proximos7Dias' | 'vencidas'>('hoje');
  const [contasDetalhes, setContasDetalhes] = useState<ContaVencimento[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  
  // Estados para modais de edição e ação
  const [modalEditarReceber, setModalEditarReceber] = useState<ContaReceber | null>(null);
  const [modalEditarPagar, setModalEditarPagar] = useState<ContaPagar | null>(null);
  const [modalReceber, setModalReceber] = useState<ContaReceber | null>(null);
  const [modalPagar, setModalPagar] = useState<ContaPagar | null>(null);
  const [modalPerda, setModalPerda] = useState<ContaReceber | null>(null);
  const [modalExcluir, setModalExcluir] = useState<ContaVencimento | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [motivosPerda, setMotivosPerda] = useState<any[]>([]);
  
  const { buscarContasPorVencimento, buscarDashboard, buscarMotivosPerda, marcarComoPerda } = useFinanceiro();
  const { toast } = useToast();

  const handleClickCard = async (tipo: 'hoje' | 'amanha' | 'proximos7Dias' | 'vencidas') => {
    setCarregandoDetalhes(true);
    setTipoSelecionado(tipo);
    
    try {
      const contas = await buscarContasPorVencimento(tipo);
      setContasDetalhes(contas);
      setModalAberto(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes das contas",
        variant: "destructive",
      });
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const handleAcaoRapida = async (conta: ContaVencimento, acao: 'pagar' | 'receber' | 'editar' | 'perda' | 'excluir') => {
    if (acao === 'excluir') {
      setModalExcluir(conta);
      return;
    }

    if (acao === 'editar') {
      if (conta.tipo === 'conta_receber') {
        // Converter ContaVencimento para ContaReceber
        const contaReceber: ContaReceber = {
          id: conta.id,
          cliente_nome: conta.cliente_nome || conta.cliente_fornecedor,
          cliente_email: conta.cliente_email,
          cliente_telefone: conta.cliente_telefone,
          descricao: conta.descricao,
          valor_original: conta.valor_original,
          valor_recebido: conta.valor_recebido || 0,
          data_vencimento: conta.data_vencimento,
          data_recebimento: conta.data_recebimento,
          status: conta.status as 'pendente' | 'recebido' | 'vencido' | 'cancelado',
          categoria_id: conta.categoria_id,
          observacoes: conta.observacoes,
          created_at: conta.created_at,
          updated_at: conta.updated_at,
          orcamento_id: conta.orcamento_id,
          categoria: conta.categoria
        };
        setModalEditarReceber(contaReceber);
      } else {
        // Converter ContaVencimento para ContaPagar
        const contaPagar: ContaPagar = {
          id: conta.id,
          fornecedor_nome: conta.fornecedor_nome || conta.cliente_fornecedor,
          fornecedor_email: conta.fornecedor_email,
          fornecedor_telefone: conta.fornecedor_telefone,
          descricao: conta.descricao,
          valor_original: conta.valor_original,
          valor_pago: conta.valor_pago || 0,
          data_vencimento: conta.data_vencimento,
          data_pagamento: conta.data_pagamento,
          status: conta.status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
          categoria_id: conta.categoria_id,
          observacoes: conta.observacoes,
          created_at: conta.created_at,
          updated_at: conta.updated_at,
          categoria: conta.categoria
        };
        setModalEditarPagar(contaPagar);
      }
    } else if (acao === 'receber' && conta.tipo === 'conta_receber') {
      const contaReceber: ContaReceber = {
        id: conta.id,
        cliente_nome: conta.cliente_nome || conta.cliente_fornecedor,
        cliente_email: conta.cliente_email,
        cliente_telefone: conta.cliente_telefone,
        descricao: conta.descricao,
        valor_original: conta.valor_original,
        valor_recebido: conta.valor_recebido || 0,
        data_vencimento: conta.data_vencimento,
        data_recebimento: conta.data_recebimento,
        status: conta.status as 'pendente' | 'recebido' | 'vencido' | 'cancelado',
        categoria_id: conta.categoria_id,
        observacoes: conta.observacoes,
        created_at: conta.created_at,
        updated_at: conta.updated_at,
        orcamento_id: conta.orcamento_id,
        categoria: conta.categoria
      };
      setModalReceber(contaReceber);
    } else if (acao === 'pagar' && conta.tipo === 'conta_pagar') {
      const contaPagar: ContaPagar = {
        id: conta.id,
        fornecedor_nome: conta.fornecedor_nome || conta.cliente_fornecedor,
        fornecedor_email: conta.fornecedor_email,
        fornecedor_telefone: conta.fornecedor_telefone,
        descricao: conta.descricao,
        valor_original: conta.valor_original,
        valor_pago: conta.valor_pago || 0,
        data_vencimento: conta.data_vencimento,
        data_pagamento: conta.data_pagamento,
        status: conta.status as 'pendente' | 'pago' | 'vencido' | 'cancelado',
        categoria_id: conta.categoria_id,
        observacoes: conta.observacoes,
        created_at: conta.created_at,
        updated_at: conta.updated_at,
        categoria: conta.categoria
      };
      setModalPagar(contaPagar);
    } else if (acao === 'perda' && conta.tipo === 'conta_receber') {
      const contaReceber: ContaReceber = {
        id: conta.id,
        cliente_nome: conta.cliente_nome || conta.cliente_fornecedor,
        cliente_email: conta.cliente_email,
        cliente_telefone: conta.cliente_telefone,
        descricao: conta.descricao,
        valor_original: conta.valor_original,
        valor_recebido: conta.valor_recebido || 0,
        data_vencimento: conta.data_vencimento,
        data_recebimento: conta.data_recebimento,
        status: conta.status as 'pendente' | 'recebido' | 'vencido' | 'cancelado',
        categoria_id: conta.categoria_id,
        observacoes: conta.observacoes,
        created_at: conta.created_at,
        updated_at: conta.updated_at,
        orcamento_id: conta.orcamento_id,
        categoria: conta.categoria
      };
      await carregarMotivosPerda();
      setModalPerda(contaReceber);
    }
  };

  // Handler para excluir conta com registro de histórico
  const handleExcluirConta = async (conta: ContaVencimento, motivo: string, observacao?: string) => {
    setExcluindo(true);
    try {
      // Buscar dados do usuário atual
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Registrar no histórico ANTES de excluir
      const { error: historicoError } = await supabase
        .from('historico_exclusao_contas')
        .insert({
          conta_id: conta.id,
          tipo_conta: conta.tipo,
          descricao: conta.descricao,
          cliente_fornecedor: conta.cliente_fornecedor,
          valor_original: conta.valor_original,
          data_vencimento: conta.data_vencimento,
          motivo_exclusao: motivo,
          observacao_exclusao: observacao || null,
          excluido_por: user?.id || null,
          excluido_por_nome: user?.email || 'Desconhecido'
        });

      if (historicoError) throw historicoError;

      // 2. Excluir a conta
      const tabela = conta.tipo === 'conta_receber' ? 'contas_receber' : 'contas_pagar';
      const { error: deleteError } = await supabase
        .from(tabela)
        .delete()
        .eq('id', conta.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Sucesso",
        description: "Conta excluída e motivo registrado para auditoria",
      });

      setModalExcluir(null);
      setModalAberto(false);
      handleSuccess();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta",
        variant: "destructive",
      });
    } finally {
      setExcluindo(false);
    }
  };

  const carregarMotivosPerda = async () => {
    try {
      const motivos = await buscarMotivosPerda();
      setMotivosPerda(motivos);
    } catch (error) {
      console.error('Erro ao carregar motivos de perda:', error);
    }
  };

  const handleMarcarPerda = async (motivoId: string, justificativa: string, dataPerda: string) => {
    if (!modalPerda) return;

    try {
      await marcarComoPerda(modalPerda.id, motivoId, justificativa, dataPerda);
      toast({
        title: "Sucesso",
        description: "Conta marcada como perda com sucesso"
      });
      setModalPerda(null);
      setModalAberto(false);
      handleSuccess();
    } catch (error) {
      console.error('Erro ao marcar como perda:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar conta como perda",
        variant: "destructive"
      });
    }
  };

  // Função para atualizar dados após mudanças
  const handleSuccess = async () => {
    // Recarregar contas do modal atual
    if (modalAberto) {
      const contas = await buscarContasPorVencimento(tipoSelecionado);
      setContasDetalhes(contas);
    }
    // Atualizar dashboard sem recarregar a página
    onDashboardUpdate?.();
  };

  const alertas = [
    {
      titulo: 'Vencem Hoje',
      valor: dashboard.alertasVencimento.hoje,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badge: 'destructive' as const,
      tipo: 'hoje' as const
    },
    {
      titulo: 'Vencem Amanhã',
      valor: dashboard.alertasVencimento.amanha,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badge: 'secondary' as const,
      tipo: 'amanha' as const
    },
    {
      titulo: 'Próximos 7 Dias',
      valor: dashboard.alertasVencimento.proximos7Dias,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      badge: 'outline' as const,
      tipo: 'proximos7Dias' as const
    },
    {
      titulo: 'Contas Vencidas',
      valor: dashboard.contasVencidas,
      icon: CalendarCheck,
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      badge: 'destructive' as const,
      tipo: 'vencidas' as const
    }
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {alertas.map((alerta, index) => {
          const Icon = alerta.icon;
          
          return (
            <Card 
              key={index} 
              className={`${alerta.bgColor} ${alerta.borderColor} border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${carregandoDetalhes ? 'opacity-50' : ''}`}
              onClick={() => !carregandoDetalhes && handleClickCard(alerta.tipo)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{alerta.titulo}</CardTitle>
                <Icon className={`h-4 w-4 ${alerta.color}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${alerta.color}`}>
                    {alerta.valor}
                  </div>
                  {alerta.valor > 0 && (
                    <Badge variant={alerta.badge}>
                      {alerta.valor === 1 ? '1 conta' : `${alerta.valor} contas`}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {alerta.valor === 0 ? 'Nenhuma conta encontrada' : 
                   alerta.valor === 1 ? 'Clique para ver detalhes' : 'Clique para ver detalhes'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DetalhesVencimentoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        tipo={tipoSelecionado}
        contas={contasDetalhes}
        onAcaoRapida={handleAcaoRapida}
      />

      {/* Modais de Edição */}
      {modalEditarReceber && (
        <EditarContaReceberModal
          open={true}
          onOpenChange={(open) => !open && setModalEditarReceber(null)}
          conta={modalEditarReceber}
          onSuccess={handleSuccess}
        />
      )}

      {modalEditarPagar && (
        <EditarContaPagarModal
          open={true}
          onOpenChange={(open) => !open && setModalEditarPagar(null)}
          conta={modalEditarPagar}
          onSuccess={handleSuccess}
        />
      )}

      {/* Modais de Ação */}
      {modalReceber && (
        <ReceberContaModal
          open={true}
          onOpenChange={(open) => !open && setModalReceber(null)}
          conta={modalReceber}
          onSuccess={handleSuccess}
        />
      )}

      {modalPagar && (
        <PagarContaModal
          open={true}
          onOpenChange={(open) => !open && setModalPagar(null)}
          conta={modalPagar}
          onSuccess={handleSuccess}
        />
      )}

      {modalPerda && (
        <MarcarPerdaModal
          conta={modalPerda}
          isOpen={true}
          onClose={() => setModalPerda(null)}
          onConfirm={handleMarcarPerda}
          motivosPerda={motivosPerda}
        />
      )}

      {/* Modal de Exclusão com Motivo */}
      <ExcluirContaComMotivoDialog
        isOpen={!!modalExcluir}
        onClose={() => setModalExcluir(null)}
        conta={modalExcluir}
        onConfirm={handleExcluirConta}
        isLoading={excluindo}
      />
    </>
  );
};