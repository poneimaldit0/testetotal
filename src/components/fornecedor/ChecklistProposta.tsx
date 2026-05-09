import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckSquare, Calculator, Save, FileDown, MessageCircle, Clock, Lock, Eye, Plus, X, Tag } from 'lucide-react';
import { usePropostas } from '@/hooks/usePropostas';
import { exportarPropostaExcel } from '@/utils/exportacaoPropostas';
import { useCodigosAcesso } from '@/hooks/useCodigosAcesso';
// Token comparison hook removed - not needed for WhatsApp link generation
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModalResumoEnvio } from './ModalResumoEnvio';
import { MultiFormaPagamentoSelector } from './MultiFormaPagamentoSelector';
import { FormaPagamentoData } from '@/types/comparacao';
import { ItensExtrasModal } from './ItensExtrasModal';
import { AlertaIntegridadeProposta } from './AlertaIntegridadeProposta';
import { usePropostaBackup } from '@/hooks/usePropostaBackup';
import { useAutoSalvarRevisao } from '@/hooks/useAutoSalvarRevisao';
import { StatusIndicatorRevisao } from './StatusIndicatorRevisao';

interface ChecklistItem {
  id: string;
  categoria: string;
  nome: string;
  descricao?: string;
  ordem: number;
  obrigatorio?: boolean;
}

interface RespostaChecklist {
  id?: string;
  item_id: string;
  incluido: boolean;
  valor_estimado: number;
  ambientes: string[];
  observacoes?: string;
}

interface ChecklistPropostaData {
  id: string;
  notificado: boolean;
  data_notificacao?: string;
  valor_total_estimado: number;
  status?: string;
  data_envio?: string;
  versao?: number;
  comentarios_revisao?: string;
  data_ultima_revisao?: string;
  forma_pagamento?: FormaPagamentoData[] | null;
}

interface ChecklistPropostaProps {
  orcamentoId: string;
  candidaturaId?: string;
  readonly?: boolean;
  isRevisionMode?: boolean;
}

// Interface para as funções expostas via ref
export interface ChecklistPropostaRef {
  salvarProposta: () => Promise<void>;
}

const AMBIENTES_OPCOES = [
  'Sala de estar', 'Sala de jantar', 'Cozinha', 'Quarto principal', 
  'Quarto 2', 'Quarto 3', 'Banheiro social', 'Banheiro suíte',
  'Área de serviço', 'Varanda', 'Hall de entrada', 'Todos os ambientes'
];

export const ChecklistProposta = forwardRef<ChecklistPropostaRef, ChecklistPropostaProps>(({
  orcamentoId,
  candidaturaId,
  readonly = false,
  isRevisionMode = false
}, ref) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { criarBackupProposta, restaurarBackupProposta } = usePropostaBackup();
  
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [respostas, setRespostas] = useState<RespostaChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [notificando, setNotificando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [showResumoModal, setShowResumoModal] = useState(false);
  const [exportandoProposta, setExportandoProposta] = useState(false);
  const [notificandoCliente, setNotificandoCliente] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppLink, setWhatsAppLink] = useState('');
  const [checklistPropostaId, setChecklistPropostaId] = useState<string | null>(null);
  const [propostaData, setPropostaData] = useState<ChecklistPropostaData | null>(null);
  const [orcamentoData, setOrcamentoData] = useState<any>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoData[]>([{ tipo: 'a_vista' }]);
  const [itensExtras, setItensExtras] = useState<any[]>([]);
  const [modalItensExtrasOpen, setModalItensExtrasOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { carregarPropostaDetalhada } = usePropostas();
  const { gerarCodigoAcesso, extrairCodigoOrcamento } = useCodigosAcesso();
  // WhatsApp link generation moved to component level

  // Auto-save para revisões
  const handleAutoSave = async () => {
    if (propostaData?.status === 'em_revisao') {
      setAutoSaving(true);
      try {
        await salvarProposta();
        setLastSaved(new Date());
        console.log('✅ [AutoSave] Proposta salva automaticamente durante revisão');
      } catch (error) {
        console.error('❌ [AutoSave] Erro no salvamento automático:', error);
      } finally {
        setAutoSaving(false);
      }
    }
  };

  // Configurar auto-save para itens extras
  useAutoSalvarRevisao({
    enabled: propostaData?.status === 'em_revisao',
    onSalvar: handleAutoSave,
    data: itensExtras,
    delay: 2000
  });

  // Determinar se deve ser readonly baseado no status da proposta
  // Permitir edição quando status for 'em_revisao'
  const isReadonly = readonly || (
    propostaData?.status !== undefined && 
    propostaData.status !== 'em_revisao' && 
    (propostaData.status === 'enviado' || propostaData.status === 'finalizada')
  );

  const abrirModalResumo = () => {
    // Salvar proposta antes de abrir o modal
    salvarProposta().then(() => {
      setShowResumoModal(true);
    });
  };

  const enviarProposta = async () => {
    if (!checklistPropostaId || isReadonly) return;

    console.log('=== INICIANDO ENVIO DE PROPOSTA ===');
    console.log('checklistPropostaId:', checklistPropostaId);
    console.log('candidaturaId:', candidaturaId);
    
    // Verificar se usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Usuário não autenticado');
      toast({
        title: "Erro de Autenticação",
        description: "Você precisa estar logado para enviar a proposta",
        variant: "destructive",
      });
      return;
    }
    console.log('Usuário autenticado:', user.id);

    const valorTotal = calcularValorTotal();
    console.log('Valor total da proposta:', valorTotal);
    
    if (valorTotal <= 0) {
      toast({
        title: "Aviso",
        description: "Adicione ao menos um item com valor para enviar a proposta",
        variant: "destructive",
      });
      return;
    }

    // Verificar se há itens incluídos
    const itensIncluidos = respostas.filter(r => r.incluido);
    console.log('Itens incluídos:', itensIncluidos.length);
    
    if (itensIncluidos.length === 0) {
      toast({
        title: "Aviso", 
        description: "Selecione ao menos um item na proposta antes de enviar",
        variant: "destructive",
      });
      return;
    }

    // Verificar se a forma de pagamento foi preenchida
    if (!formaPagamento) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha a forma de pagamento antes de enviar a proposta",
        variant: "destructive",
      });
      return;
    }

    try {
      setEnviando(true);
      setShowResumoModal(false); // Fechar modal
      
      // Salvar proposta primeiro
      await salvarProposta();

      // Verificar se é fase colaborativa ativa - se sim, salvar como rascunho_colaborativo
      const { data: colaborativo } = await supabase
        .from('checklist_colaborativo')
        .select('status')
        .eq('orcamento_id', orcamentoId)
        .single();

      const statusFinal = colaborativo?.status === 'fase_colaborativa_ativa' ? 'rascunho_colaborativo' : 'enviado';
      const dataEnvio = statusFinal === 'enviado' ? new Date().toISOString() : null;

      // Atualizar status da proposta
      const { error } = await supabase
        .from('checklist_propostas')
        .update({ 
          status: statusFinal,
          data_envio: dataEnvio
        })
        .eq('candidatura_id', candidaturaId);

      if (error) throw error;

      // Marcar candidatura como proposta enviada apenas se não for colaborativo
      if (statusFinal === 'enviado') {
        const { error: candidaturaError } = await supabase
          .from('candidaturas_fornecedores')
          .update({ proposta_enviada: true })
          .eq('id', candidaturaId);

        if (candidaturaError) throw candidaturaError;
      }

      const mensagem = statusFinal === 'rascunho_colaborativo' 
        ? "Proposta pré-preenchida! Será enviada automaticamente quando a fase colaborativa encerrar."
        : "Proposta enviada com sucesso! A proposta não poderá mais ser editada até que o cliente solicite revisões.";

      // Atualizar estado local
      setPropostaData(prev => prev ? {
        ...prev,
        status: statusFinal,
        data_envio: dataEnvio
      } : null);

      toast({
        title: "Sucesso!",
        description: mensagem,
      });

      // Recarregar dados da proposta
      await carregarRespostasExistentes();
      console.log('=== ENVIO CONCLUÍDO COM SUCESSO ===');

      // Se a proposta foi enviada (não é colaborativa), notificar cliente automaticamente
      if (statusFinal === 'enviado') {
        console.log('=== NOTIFICANDO CLIENTE AUTOMATICAMENTE ===');
        // Aguardar um pouco para garantir que o estado foi atualizado
        setTimeout(() => {
          notificarCliente(false);
        }, 1000);
      }

    } catch (error: any) {
      console.error('=== ERRO NO ENVIO DA PROPOSTA ===');
      console.error('Erro completo:', error);
      console.error('Stack trace:', error.stack);
      
      let errorMessage = "Não foi possível enviar a proposta";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.details) {
        errorMessage = error.details;
      } else if (error.hint) {
        errorMessage = error.hint;
      }

      toast({
        title: "Erro ao Enviar Proposta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  useEffect(() => {
    carregarChecklistOrcamento();
    carregarDadosOrcamento();
  }, [orcamentoId]);

  useEffect(() => {
    if (candidaturaId && checklistItems.length > 0) {
      console.log('🔄 [ChecklistProposta] Disparando carregamento de respostas...');
      console.log('🔄 candidaturaId:', candidaturaId);
      console.log('🔄 checklistItems length:', checklistItems.length);
      carregarRespostasExistentes();
    }
  }, [candidaturaId, checklistItems]);

  // Adicionar effect para debug do estado
  useEffect(() => {
    if (respostas.length > 0) {
      console.log('📊 [ChecklistProposta] Estado atualizado - Respostas:', {
        total: respostas.length,
        incluidas: respostas.filter(r => r.incluido).length,
        respostas: respostas.map(r => ({
          item_id: r.item_id,
          incluido: r.incluido,
          valor: r.valor_estimado
        }))
      });
    }
  }, [respostas]);

  useEffect(() => {
    if (propostaData) {
      console.log('📊 [ChecklistProposta] Proposta data atualizada:', {
        id: propostaData.id,
        status: propostaData.status,
        valor_total: propostaData.valor_total_estimado
      });
    }
  }, [propostaData]);

  const carregarChecklistOrcamento = async () => {
    try {
      setLoading(true);
      
      // Primeiro, verificar se existe checklist colaborativo consolidado
      const { data: checklistColaborativo, error: checklistError } = await supabase
        .from('checklist_colaborativo')
        .select('*')
        .eq('orcamento_id', orcamentoId)
        .eq('status', 'checklist_definido')
        .maybeSingle();

      if (checklistError && checklistError.code !== 'PGRST116') throw checklistError;

      let items: ChecklistItem[] = [];

      if (checklistColaborativo) {
        // Checklist consolidado: carregar apenas itens marcados pelos fornecedores
        const { data: itensConsolidados, error: consolidadosError } = await supabase
          .from('contribuicoes_checklist')
          .select(`
            item_id,
            item:checklist_itens(*)
          `)
          .eq('checklist_colaborativo_id', checklistColaborativo.id)
          .eq('marcado', true);

        if (consolidadosError) throw consolidadosError;

        // Remover duplicatas e mapear para formato correto
        const itensUnicos = new Map();
        (itensConsolidados || []).forEach(contrib => {
          if (contrib.item && !itensUnicos.has(contrib.item.id)) {
            itensUnicos.set(contrib.item.id, {
              ...contrib.item,
              obrigatorio: false // Itens consolidados não são obrigatórios por definição
            });
          }
        });

        items = Array.from(itensUnicos.values()) as ChecklistItem[];
        
        // Ordenar por categoria e ordem
        items.sort((a, b) => {
          if (a.categoria !== b.categoria) {
            return a.categoria.localeCompare(b.categoria);
          }
          return a.ordem - b.ordem;
        });
      } else {
        // Checklist não consolidado: usar comportamento tradicional
        console.log('📋 Carregando itens tradicionais do orçamento');
        
        const { data, error } = await supabase
          .from('orcamentos_checklist_itens')
          .select(`
            *,
            item:checklist_itens(*)
          `)
          .eq('orcamento_id', orcamentoId)
          .order('ordem', { foreignTable: 'checklist_itens' });

        if (error) throw error;

        items = (data || []).map(item => ({
          ...item.item,
          obrigatorio: item.obrigatorio
        })) as ChecklistItem[];
      }

      setChecklistItems(items);

      // Inicializar respostas vazias
      const respostasIniciais = items.map(item => ({
        item_id: item.id,
        incluido: false,
        valor_estimado: 0,
        ambientes: [],
        observacoes: ''
      }));

      setRespostas(respostasIniciais);
    } catch (error: any) {
      console.error('Erro ao carregar checklist:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o checklist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosOrcamento = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('necessidade, local, dados_contato')
        .eq('id', orcamentoId)
        .single();

      if (error) throw error;
      setOrcamentoData(data);
    } catch (error: any) {
      console.error('Erro ao carregar dados do orçamento:', error);
    }
  };

  const carregarRespostasExistentes = async () => {
    try {
      console.log('🔍 [ChecklistProposta] Carregando respostas existentes...');
      console.log('🔍 candidaturaId:', candidaturaId);
      
      // Primeiro, buscar se já existe uma proposta
      const { data: proposta, error: propostaError } = await supabase
        .from('checklist_propostas')
        .select('*')
        .eq('candidatura_id', candidaturaId)
        .maybeSingle();

      if (propostaError) {
        console.error('❌ [ChecklistProposta] Erro ao buscar proposta:', propostaError);
        throw propostaError;
      }

      console.log('📋 [ChecklistProposta] Proposta encontrada:', proposta);

      if (proposta) {
        setChecklistPropostaId(proposta.id);
        
        // Converter forma_pagamento para array se necessário
        const formaPagamentoArray = proposta.forma_pagamento 
          ? (Array.isArray(proposta.forma_pagamento) 
            ? (proposta.forma_pagamento as unknown as FormaPagamentoData[])
            : typeof proposta.forma_pagamento === 'string' 
              ? [{ tipo: 'personalizado', texto_personalizado: proposta.forma_pagamento } as FormaPagamentoData]
              : [proposta.forma_pagamento as unknown as FormaPagamentoData])
          : [{ tipo: 'a_vista' } as FormaPagamentoData];

        setPropostaData({
          ...proposta,
          forma_pagamento: formaPagamentoArray
        });
        
        setFormaPagamento(formaPagamentoArray);

        console.log('🔍 [ChecklistProposta] Carregando respostas para proposta ID:', proposta.id);
        console.log('🔍 [ChecklistProposta] Status da proposta:', proposta.status);
        
        // Carregar respostas existentes
        const { data: respostasData, error: respostasError } = await supabase
          .from('respostas_checklist')
          .select(`
            id,
            item_id,
            incluido,
            valor_estimado,
            ambientes,
            observacoes,
            item_extra,
            nome_item_extra,
            descricao_item_extra,
            checklist_itens (
              id,
              nome,
              descricao,
              categoria
            )
          `)
          .eq('checklist_proposta_id', proposta.id);

        if (respostasError) {
          console.error('❌ [ChecklistProposta] Erro ao buscar respostas:', respostasError);
          throw respostasError;
        }

        console.log('📊 [ChecklistProposta] Respostas encontradas:', respostasData?.length || 0);
        console.log('📊 [ChecklistProposta] Dados das respostas:', respostasData);

        if (respostasData && respostasData.length > 0) {
          // Separar itens normais de itens extras
          const respostasNormais: any[] = [];
          const extras: any[] = [];
          
          respostasData.forEach((resposta: any) => {
            console.log('🔍 [ChecklistProposta] Processando resposta:', {
              id: resposta.id,
              item_id: resposta.item_id,
              incluido: resposta.incluido,
              item_extra: resposta.item_extra,
              valor_estimado: resposta.valor_estimado
            });
            
            if (resposta.item_extra) {
              // Item extra
              extras.push({
                id: resposta.id,
                nome: resposta.nome_item_extra || resposta.checklist_itens?.nome || 'Item Extra',
                descricao: resposta.descricao_item_extra || resposta.checklist_itens?.descricao,
                valor_estimado: resposta.valor_estimado || 0,
                ambientes: resposta.ambientes || [],
                observacoes: resposta.observacoes || "",
                item_extra: true,
                item_id: resposta.item_id,
                nome_item_extra: resposta.nome_item_extra,
                descricao_item_extra: resposta.descricao_item_extra
              });
            } else {
              // Item normal
              respostasNormais.push({
                id: resposta.id,
                item_id: resposta.item_id,
                incluido: resposta.incluido,
                valor_estimado: resposta.valor_estimado || 0,
                ambientes: resposta.ambientes || [],
                observacoes: resposta.observacoes || ''
              });
            }
          });

          console.log('✅ [ChecklistProposta] Respostas normais processadas:', respostasNormais.length);
          console.log('✅ [ChecklistProposta] Itens extras processados:', extras.length);
          console.log('📋 [ChecklistProposta] Respostas incluídas:', respostasNormais.filter(r => r.incluido).length);
          
          setRespostas(respostasNormais);
          setItensExtras(extras);
          
          // Forçar re-render do componente para garantir que os valores sejam exibidos
          setTimeout(() => {
            console.log('🔄 [ChecklistProposta] Forçando atualização do estado...');
            setRespostas([...respostasNormais]);
          }, 100);
        } else {
          console.log('⚠️ [ChecklistProposta] Nenhuma resposta encontrada para a proposta');
        }
      } else {
        console.log('⚠️ [ChecklistProposta] Nenhuma proposta encontrada para candidatura:', candidaturaId);
      }
    } catch (error: any) {
      console.error('❌ [ChecklistProposta] Erro ao carregar respostas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as respostas da proposta: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleRespostaChange = (itemId: string, field: keyof RespostaChecklist, value: any) => {
    setRespostas(prev => prev.map(resposta => 
      resposta.item_id === itemId 
        ? { ...resposta, [field]: value }
        : resposta
    ));
  };

  const handleAmbienteToggle = (itemId: string, ambiente: string) => {
    setRespostas(prev => prev.map(resposta => {
      if (resposta.item_id === itemId) {
        const ambientes = resposta.ambientes.includes(ambiente)
          ? resposta.ambientes.filter(a => a !== ambiente)
          : [...resposta.ambientes, ambiente];
        return { ...resposta, ambientes };
      }
      return resposta;
    }));
  };

  const calcularValorTotal = () => {
    let total = respostas
      .filter(r => r.incluido)
      .reduce((acc, r) => acc + r.valor_estimado, 0);
    
    // Adicionar valor dos itens extras
    total += itensExtras.reduce((acc, item) => acc + (item.valor_estimado || 0), 0);
    
    return total;
  };

  const salvarProposta = useCallback(async (): Promise<void> => {
    if (!candidaturaId || isReadonly) {
      console.warn('🚫 [ChecklistProposta] Não é possível salvar:', {
        candidaturaId,
        isReadonly,
        isRevisionMode
      });
      return;
    }

    try {
      setSaving(true);
      
      // Log para debugging de revisões
      console.log('🔄 [ChecklistProposta] Salvando proposta:', {
        candidaturaId,
        checklistPropostaId,
        status: propostaData?.status,
        totalRespostas: respostas.length,
        respostasIncluidas: respostas.filter(r => r.incluido).length,
        valorTotal: calcularValorTotal(),
        isRevisionMode,
        revisaoContext: 'salvamento_durante_revisao'
      });

      let propostaId = checklistPropostaId;

      // Criar proposta se não existir
      if (!propostaId) {
        // Verificar se já existe uma proposta para esta candidatura
        console.log('🔍 [ChecklistProposta] Verificando proposta existente para candidatura:', candidaturaId);
        const { data: propostaExistente, error: searchError } = await supabase
          .from('checklist_propostas')
          .select('id')
          .eq('candidatura_id', candidaturaId)
          .maybeSingle();

        if (searchError) {
          console.error('❌ [ChecklistProposta] Erro ao buscar proposta existente:', searchError);
          throw new Error(`Falha ao verificar proposta existente: ${searchError.message}`);
        }

        if (propostaExistente) {
          // Usar proposta existente
          propostaId = propostaExistente.id;
          setChecklistPropostaId(propostaId);
          console.log('✅ [ChecklistProposta] Usando proposta existente:', propostaId);
        } else {
          // Criar nova proposta
          console.log('📝 [ChecklistProposta] Criando nova proposta...');
          const { data: novaProposta, error: propostaError } = await supabase
            .from('checklist_propostas')
            .insert({
              candidatura_id: candidaturaId,
              valor_total_estimado: calcularValorTotal(),
              forma_pagamento: formaPagamento as any,
              status: 'rascunho'
            })
            .select()
            .single();

          if (propostaError) {
            console.error('❌ [ChecklistProposta] Erro ao criar proposta:', propostaError);
            throw new Error(`Falha ao criar proposta: ${propostaError.message}`);
          }
          
          propostaId = novaProposta.id;
          setChecklistPropostaId(propostaId);
          console.log('✅ [ChecklistProposta] Nova proposta criada:', propostaId);
        }
      } else {
        // Atualizar valor total e forma de pagamento
        console.log('🔄 [ChecklistProposta] Atualizando proposta existente...');
        const { data: propostaAtualizada, error: updateError } = await supabase
          .from('checklist_propostas')
          .update({ 
            valor_total_estimado: calcularValorTotal(),
            forma_pagamento: formaPagamento as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', propostaId)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [ChecklistProposta] Erro ao atualizar proposta:', updateError);
          throw new Error(`Falha ao atualizar proposta: ${updateError.message}`);
        }
        
        setPropostaData({
          ...propostaAtualizada,
          forma_pagamento: formaPagamento
        });
        console.log('✅ [ChecklistProposta] Proposta atualizada:', propostaId);
      }

      // Salvar respostas
      const respostasParaSalvar = respostas.map(resposta => ({
        ...resposta,
        checklist_proposta_id: propostaId
      }));

      // Adicionar itens extras
      const respostasExtras = itensExtras.map(itemExtra => ({
        checklist_proposta_id: propostaId,
        item_id: itemExtra.item_id,
        incluido: true,
        valor_estimado: itemExtra.valor_estimado || 0,
        ambientes: itemExtra.ambientes || [],
        observacoes: itemExtra.observacoes || "",
        item_extra: true,
        nome_item_extra: itemExtra.nome_item_extra || itemExtra.nome,
        descricao_item_extra: itemExtra.descricao_item_extra || itemExtra.descricao
      }));

      // CORREÇÃO URGENTE: Criar backup automático antes de operações destrutivas
      console.log('🔄 [ChecklistProposta] Criando backup automático antes do salvamento...');
      try {
        const backupResult = await criarBackupProposta(propostaId, 'Backup automático antes do salvamento');
        
        if (!backupResult.success) {
          console.warn('⚠️ [ChecklistProposta] Falha ao criar backup, mas continuando...', backupResult.error);
        } else {
          console.log('✅ [ChecklistProposta] Backup criado:', backupResult.backup_id);
        }
      } catch (backupError) {
        console.warn('⚠️ [ChecklistProposta] Erro no backup (continuando):', backupError);
      }

      // Preparar todas as respostas (normais + extras)
      const todasRespostas = [...respostasParaSalvar, ...respostasExtras];
      
      console.log('🔄 [ChecklistProposta] Salvando respostas com operação atômica:', {
        propostaId,
        totalRespostas: todasRespostas.length,
        respostasNormais: respostasParaSalvar.length,
        respostasExtras: respostasExtras.length,
        respostasIncluidas: todasRespostas.filter(r => r.incluido).length,
        itensExtrasDetalhes: itensExtras.map(item => ({
          nome: item.nome,
          valor: item.valor_estimado,
          incluido: true
        })),
        valorTotalCalculado: calcularValorTotal()
      });
      
      if (todasRespostas.length > 0) {
        // BACKUP OBRIGATÓRIO antes de operação destrutiva
        console.log('💾 [ChecklistProposta] Criando backup automático antes de salvar...');
        
        try {
          // Buscar respostas atuais para backup
          const { data: respostasAtuais } = await supabase
            .from('respostas_checklist')
            .select('*')
            .eq('checklist_proposta_id', propostaId);

          if (respostasAtuais && respostasAtuais.length > 0) {
              await supabase
                .from('backups_revisoes_propostas')
                .insert({
                  checklist_proposta_id: propostaId,
                  respostas_backup: respostasAtuais as any,
                  valor_total_backup: calcularValorTotal(),
                  forma_pagamento_backup: formaPagamento as any,
                  motivo_backup: 'Backup automático antes de revisão'
                });
            console.log('✅ [ChecklistProposta] Backup criado com sucesso');
          }
        } catch (backupError) {
          console.warn('⚠️ [ChecklistProposta] Falha no backup:', backupError);
          // Continuar mesmo se backup falhar
        }

        // OPERAÇÃO MAIS SEGURA: Verificar se existe algo para deletar
        const { data: respostasExistentes } = await supabase
          .from('respostas_checklist')
          .select('id')
          .eq('checklist_proposta_id', propostaId);

        console.log('🔄 [ChecklistProposta] Iniciando operação de salvamento segura...');
        
        // DELETE apenas se existirem dados
        if (respostasExistentes && respostasExistentes.length > 0) {
          const { error: deleteError } = await supabase
            .from('respostas_checklist')
            .delete()
            .eq('checklist_proposta_id', propostaId);

          if (deleteError) {
            console.error('❌ [ChecklistProposta] Erro ao deletar respostas:', deleteError);
            
            // Tentar recuperação automática se backup existe
            const { data: backupRecente } = await supabase
              .from('backups_revisoes_propostas')
              .select('*')
              .eq('checklist_proposta_id', propostaId)
              .eq('restored', false)
              .order('data_backup', { ascending: false })
              .limit(1);

            if (backupRecente && backupRecente.length > 0) {
              console.log('🚨 [ChecklistProposta] Tentando recuperação automática...');
              const backup = backupRecente[0];
              const respostasBackup = backup.respostas_backup as any[];
              
              if (respostasBackup && respostasBackup.length > 0) {
                const respostasParaRestaurar = respostasBackup.map(resposta => ({
                  ...resposta,
                  id: undefined,
                  created_at: undefined
                }));

                await supabase
                  .from('respostas_checklist')
                  .insert(respostasParaRestaurar);

                await supabase
                  .from('backups_revisoes_propostas')
                  .update({ restored: true })
                  .eq('id', backup.id);

                console.log('✅ [ChecklistProposta] Dados restaurados do backup');
              }
            }
            
            throw new Error(`Falha na limpeza: ${deleteError.message}`);
          }
        }

        // INSERT das novas respostas
        const { error: insertError } = await supabase
          .from('respostas_checklist')
          .insert(todasRespostas);

        if (insertError) {
          console.error('❌ [ChecklistProposta] ERRO CRÍTICO ao inserir respostas:', insertError);
          throw new Error(`Falha crítica no salvamento: ${insertError.message}`);
        }

        console.log('✅ [ChecklistProposta] Operação concluída com sucesso');
        
        // Log específico para itens extras
        if (respostasExtras.length > 0) {
          console.log('✨ [ChecklistProposta] Itens extras salvos:', {
            quantidade: respostasExtras.length,
            detalhes: itensExtras.map(item => ({
              nome: item.nome,
              valor: item.valor_estimado
            }))
          });
        }
      } else {
        // CRÍTICO: Evitar perda de dados - só limpar se realmente necessário
        console.log('⚠️ [ChecklistProposta] AVISO: Tentativa de limpar dados sem novos dados para inserir');
        
        // Verificar se existem dados atuais antes de deletar
        const { data: respostasExistentes, error: checkError } = await supabase
          .from('respostas_checklist')
          .select('id')
          .eq('checklist_proposta_id', propostaId);

        if (checkError) {
          console.error('❌ [ChecklistProposta] Erro ao verificar respostas existentes:', checkError);
          throw new Error(`Falha na verificação: ${checkError.message}`);
        }

        if (respostasExistentes && respostasExistentes.length > 0) {
          console.log('🛡️ [ChecklistProposta] PROTEGENDO dados existentes - não será feita limpeza');
          toast({
            title: "Atenção",
            description: "Nenhum item foi marcado para inclusão. Os dados existentes foram preservados.",
            variant: "default",
          });
          return;
        }

        console.log('🧹 [ChecklistProposta] Confirmada limpeza segura (sem dados existentes)...');
        const { error: deleteError } = await supabase
          .from('respostas_checklist')
          .delete()
          .eq('checklist_proposta_id', propostaId);

        if (deleteError) {
          console.error('❌ [ChecklistProposta] Erro ao limpar respostas:', deleteError);
          throw new Error(`Falha ao limpar respostas: ${deleteError.message}`);
        }
      }

      const mensagemSucesso = itensExtras.length > 0 
        ? `Proposta salva com sucesso! Incluindo ${itensExtras.length} item(ns) extra(s). Dados disponíveis no comparador.`
        : "Proposta salva com sucesso! Dados disponíveis no comparador.";

      // Mostrar toast apenas se não é auto-save
      if (!autoSaving) {
        toast({
          title: "Sucesso",
          description: mensagemSucesso,
        });
      }

      // Atualizar timestamp do último salvamento
      setLastSaved(new Date());
      console.log('✅ [ChecklistProposta] Salvamento concluído com sucesso!');

    } catch (error: any) {
      console.error('❌ [ChecklistProposta] Erro detalhado ao salvar proposta:', {
        error: error.message,
        stack: error.stack,
        candidaturaId,
        checklistPropostaId,
        valorTotal: calcularValorTotal(),
        totalRespostas: respostas.length,
        totalItensExtras: itensExtras.length
      });
      
      toast({
        title: "Erro ao salvar proposta",
        description: `${error.message || "Erro desconhecido"}. Verifique o console para mais detalhes.`,
        variant: "destructive",
      });
      
      // Re-throw para que o RevisionEditor possa capturar
      throw error;
    } finally {
      setSaving(false);
    }
  }, [candidaturaId, checklistPropostaId, calcularValorTotal, respostas, itensExtras, formaPagamento, toast, autoSaving]);

  const handleExportarProposta = async () => {
    if (!checklistPropostaId) {
      toast({
        title: "Aviso",
        description: "Salve a proposta antes de exportar",
        variant: "destructive",
      });
      return;
    }

    try {
      setExportando(true);
      const propostaDetalhada = await carregarPropostaDetalhada(checklistPropostaId);
      
      if (!propostaDetalhada) {
        throw new Error('Não foi possível carregar os detalhes da proposta');
      }

      const sucesso = exportarPropostaExcel(propostaDetalhada);
      
      if (sucesso) {
        toast({
          title: "Sucesso",
          description: "Proposta exportada com sucesso!"
        });
      } else {
        throw new Error('Falha na exportação');
      }
    } catch (error) {
      console.error('Erro ao exportar proposta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar a proposta",
        variant: "destructive",
      });
    } finally {
      setExportando(false);
    }
  };

  const notificarCliente = async (isReenvio = false) => {
    console.log('=== DEBUG NOTIFICAR CLIENTE ===');
    console.log('candidaturaId:', candidaturaId);
    console.log('checklistPropostaId:', checklistPropostaId);
    console.log('isReadonly:', isReadonly);
    console.log('orcamentoData:', orcamentoData);
    console.log('propostaData:', propostaData);
    
    // Verificar se os dados necessários existem e se a proposta foi enviada
    if (!candidaturaId || !checklistPropostaId) {
      console.log('❌ Falha na verificação inicial:', {
        candidaturaId: !!candidaturaId,
        checklistPropostaId: !!checklistPropostaId
      });
      toast({
        title: "Erro",
        description: "Dados da proposta não encontrados",
        variant: "destructive",
      });
      return;
    }

    // Verificar se a proposta foi enviada
    if (propostaData?.status !== 'enviado') {
      console.log('❌ Proposta não foi enviada ainda:', propostaData?.status);
      toast({
        title: "Aviso",
        description: "A proposta precisa ser enviada antes de notificar o cliente",
        variant: "destructive",
      });
      return;
    }

    const valorTotal = calcularValorTotal();
    console.log('valorTotal:', valorTotal);
    
    if (valorTotal <= 0) {
      console.log('❌ Valor total inválido');
      toast({
        title: "Aviso",
        description: "Preencha ao menos um item com valor para notificar o cliente",
        variant: "destructive",
      });
      return;
    }

    if (!orcamentoData?.dados_contato?.telefone) {
      console.log('❌ Dados de contato não disponíveis:', orcamentoData?.dados_contato);
      toast({
        title: "Aviso", 
        description: "Dados de contato do cliente não disponíveis",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Todas as verificações passaram, continuando...');

    // Confirmação para reenvio
    if (isReenvio) {
      const confirmar = window.confirm(
        'Tem certeza que deseja reenviar a notificação? O cliente receberá uma nova mensagem no WhatsApp.'
      );
      if (!confirmar) return;
    }

    try {
      setNotificando(true);

      // Gerar código de acesso automaticamente
      const codigoAcesso = await gerarCodigoAcesso(orcamentoId, candidaturaId);
      if (!codigoAcesso) {
        throw new Error('Falha ao gerar código de acesso');
      }

      // Atualizar data da última notificação
      const { error: updateError } = await supabase
        .from('checklist_propostas')
        .update({ 
          notificado: true,
          data_notificacao: new Date().toISOString()
        })
        .eq('id', checklistPropostaId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setPropostaData(prev => prev ? {
        ...prev,
        notificado: true,
        data_notificacao: new Date().toISOString()
      } : null);

      // Formatar mensagem WhatsApp
      const codigoOrcamento = extrairCodigoOrcamento(orcamentoId);
      const nomeCliente = orcamentoData.dados_contato?.nome || 'Cliente';
      const nomeEmpresa = profile?.empresa || 'Nossa empresa';
      const telefoneEmpresa = profile?.telefone || '';
      
      // Gerar link direto pré-preenchido
      const linkDireto = `${window.location.origin}/acesso-proposta?codigo_orcamento=${codigoOrcamento}&codigo_fornecedor=${codigoAcesso.codigo_fornecedor}`;
      
      const mensagem = `Olá ${nomeCliente}! 👋

Sua proposta para *${orcamentoData.necessidade}* está pronta! 🎉

💰 Valor Total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
🏠 Empresa: ${nomeEmpresa}

🚀 *ACESSO RÁPIDO (clique aqui):*
${linkDireto}

📋 *OU acesse manualmente:*
• Site: ${window.location.origin}/acesso-proposta
• Código Orçamento: *${codigoOrcamento}*
• Código Fornecedor: *${codigoAcesso.codigo_fornecedor}*

⏰ Válido por 30 dias
Qualquer dúvida, estou à disposição! 😊`;

      // Gerar link WhatsApp simples
      const telefoneFormatado = orcamentoData.dados_contato.telefone.replace(/\D/g, '');
      const telefoneComCodigo = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`;
      const whatsappUrl = `https://wa.me/${telefoneComCodigo}?text=${encodeURIComponent(mensagem)}`;
      
      console.log('🔗 WhatsApp URL simples gerada:', whatsappUrl);
      
      // Função de fallback usando React modal
      const handleWhatsAppFallback = async (url: string) => {
        console.log('🔄 Executando fallback para WhatsApp...');
        
        // Tentar copiar para clipboard primeiro
        try {
          await navigator.clipboard.writeText(url);
          const clipboardText = await navigator.clipboard.readText();
          
          if (clipboardText === url) {
            console.log('✅ Link copiado com sucesso para clipboard');
            toast({
              title: "Link copiado com sucesso!",
              description: "Cole em uma nova aba para abrir o WhatsApp.",
              duration: 8000,
            });
            return;
          }
        } catch (clipboardError) {
          console.log('❌ Erro no clipboard:', clipboardError);
        }
        
        // Mostrar modal React como fallback
        setWhatsAppLink(url);
        setShowWhatsAppModal(true);
      };

      // Solução robusta com múltiplas opções
      console.log('📱 Tentando enviar via WhatsApp...');
      
      // Estratégia mais robusta para contornar bloqueio de popup
      try {
        // Criar elemento <a> temporário para simular clique do usuário
        const tempLink = document.createElement('a');
        tempLink.href = whatsappUrl;
        tempLink.target = '_blank';
        tempLink.rel = 'noopener noreferrer';
        
        // Adicionar ao DOM temporariamente
        document.body.appendChild(tempLink);
        
        // Simular clique
        tempLink.click();
        
        // Remover elemento
        document.body.removeChild(tempLink);
        
        console.log('✅ WhatsApp aberto via link temporário');
        toast({
          title: "WhatsApp aberto!",
          description: "A conversa foi iniciada em uma nova aba.",
          duration: 5000,
        });
        
      } catch (error) {
        console.log('❌ Erro ao abrir WhatsApp via link:', error);
        
        // Fallback: tentar window.location diretamente
        try {
          window.location.href = whatsappUrl;
          console.log('✅ Redirecionamento direto para WhatsApp');
        } catch (redirectError) {
          console.log('❌ Erro no redirecionamento:', redirectError);
          await handleWhatsAppFallback(whatsappUrl);
        }
      }

      toast({
        title: "Notificação Enviada",
        description: isReenvio ? "Cliente será notificado novamente via WhatsApp com link direto!" : "Cliente será notificado via WhatsApp com acesso direto à proposta!",
      });

    } catch (error: any) {
      console.error('Erro ao notificar cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível notificar o cliente",
        variant: "destructive",
      });
    } finally {
      setNotificando(false);
    }
  };

  const groupedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Salvamento automático inteligente durante revisões
  useEffect(() => {
    // Só ativar durante revisões e se já existe uma proposta
    if (propostaData?.status === 'em_revisao' && checklistPropostaId) {
      console.log('🔄 [ChecklistProposta] Salvamento automático ativado para revisão');
      
      // Detectar mudanças significativas (itens incluídos/excluídos ou valores alterados)
      const itensIncluidos = respostas.filter(r => r.incluido);
      const hasSignificantChanges = itensIncluidos.length > 0 || itensExtras.length > 0;
      
      if (hasSignificantChanges) {
        // Debounce para evitar salvamentos excessivos
        const timeoutId = setTimeout(() => {
          console.log('💾 [ChecklistProposta] Executando salvamento automático...');
          salvarProposta()
            .then(() => {
              console.log('✅ [ChecklistProposta] Salvamento automático concluído');
              // Feedback visual discreto só durante revisões
              toast({
                title: "Alterações salvas",
                description: "Suas alterações na revisão foram salvas automaticamente",
                duration: 2000,
              });
            })
            .catch(error => {
              console.error('❌ [ChecklistProposta] Erro no salvamento automático:', error);
              toast({
                title: "Aviso",
                description: "Não foi possível salvar automaticamente. Use o botão 'Salvar e Finalizar'.",
                variant: "destructive",
                duration: 4000,
              });
            });
        }, 3000); // 3 segundos de debounce
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [respostas, itensExtras, propostaData?.status, checklistPropostaId, toast]);

  // Expor função salvarProposta via ref
  useImperativeHandle(ref, () => ({
    salvarProposta
  }), []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando checklist...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (checklistItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist da Proposta</CardTitle>
          <CardDescription>
            Este orçamento não possui checklist específico.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {/* Alerta de Integridade - NOVO */}
      {checklistPropostaId && (
        <AlertaIntegridadeProposta
          checklistPropostaId={checklistPropostaId}
          valorTotal={calcularValorTotal()}
          quantidadeRespostas={respostas.filter(r => r.incluido).length}
          onDataRestored={() => {
            // Recarregar dados após restauração
            carregarRespostasExistentes();
          }}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isReadonly ? (
                  <>
                    <Eye className="h-5 w-5" />
                    Proposta Enviada
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-5 w-5" />
                    Checklist da Proposta
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isReadonly 
                  ? "Esta proposta foi enviada e não pode mais ser editada até que o cliente solicite revisões."
                  : "Preencha os itens solicitados para sua proposta. Itens marcados como obrigatórios devem ser preenchidos."
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Status da Revisão */}
              {propostaData?.status && (
                <StatusIndicatorRevisao
                  status={propostaData.status}
                  autoSaving={autoSaving}
                  lastSaved={lastSaved}
                />
              )}
              {isReadonly && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Bloqueada para Edição
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedItems).map(([categoria, items]) => (
          <div key={categoria} className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{categoria}</h3>
            
            {items.map(item => {
              const resposta = respostas.find(r => r.item_id === item.id);
              if (!resposta) return null;

              return (
                <div key={item.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={resposta.incluido}
                      onCheckedChange={(checked) => 
                        handleRespostaChange(item.id, 'incluido', checked)
                      }
                      disabled={isReadonly}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.nome}</span>
                        {item.obrigatorio && (
                          <Badge variant="destructive" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      {item.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  {resposta.incluido && (
                    <div className="ml-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Valor Estimado (R$)</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={resposta.valor_estimado}
                              onChange={(e) => 
                                handleRespostaChange(item.id, 'valor_estimado', Number(e.target.value))
                              }
                              disabled={isReadonly}
                              placeholder="0,00"
                            />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ambientes</label>
                          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                            {AMBIENTES_OPCOES.map(ambiente => (
                              <div key={ambiente} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={resposta.ambientes.includes(ambiente)}
                                  onCheckedChange={() => handleAmbienteToggle(item.id, ambiente)}
                                  disabled={isReadonly}
                                  className="h-3 w-3"
                                />
                                <span className="text-xs">{ambiente}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Observações</label>
                        <Textarea
                          value={resposta.observacoes}
                          onChange={(e) => 
                            handleRespostaChange(item.id, 'observacoes', e.target.value)
                          }
                          disabled={isReadonly}
                          placeholder="Observações adicionais sobre este item..."
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Seção de Itens Extras */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Itens Extras
            </h3>
            {!isReadonly && (
              <Button
                variant="outline"
                onClick={() => setModalItensExtrasOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Item Extra
              </Button>
            )}
          </div>

          {itensExtras.length > 0 ? (
            <div className="space-y-3">
              {itensExtras.map((itemExtra, index) => (
                <div key={itemExtra.id} className="border border-orange-200 bg-orange-50/50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          ITEM EXTRA
                        </Badge>
                        <h4 className="font-medium">{itemExtra.nome}</h4>
                      </div>
                      
                      {itemExtra.descricao && (
                        <p className="text-sm text-muted-foreground">{itemExtra.descricao}</p>
                      )}
                      
                      {!isReadonly ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Valor Estimado (R$)</label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={itemExtra.valor_estimado || 0}
                                onChange={(e) => {
                                  setItensExtras(prev => prev.map((item, i) => 
                                    i === index 
                                      ? { ...item, valor_estimado: Number(e.target.value) }
                                      : item
                                  ));
                                }}
                                placeholder="0,00"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Ambientes</label>
                              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                {AMBIENTES_OPCOES.map(ambiente => (
                                  <div key={ambiente} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={itemExtra.ambientes?.includes(ambiente) || false}
                                      onCheckedChange={(checked) => {
                                        setItensExtras(prev => prev.map((item, i) => {
                                          if (i === index) {
                                            const ambientes = item.ambientes || [];
                                            return {
                                              ...item,
                                              ambientes: checked
                                                ? [...ambientes, ambiente]
                                                : ambientes.filter(a => a !== ambiente)
                                            };
                                          }
                                          return item;
                                        }));
                                      }}
                                      className="h-3 w-3"
                                    />
                                    <span className="text-xs">{ambiente}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Observações</label>
                            <Textarea
                              value={itemExtra.observacoes || ''}
                              onChange={(e) => {
                                setItensExtras(prev => prev.map((item, i) => 
                                  i === index 
                                    ? { ...item, observacoes: e.target.value }
                                    : item
                                ));
                              }}
                              placeholder="Observações sobre este item extra..."
                              rows={2}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-green-600">
                            R$ {itemExtra.valor_estimado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          </span>
                          
                          {itemExtra.ambientes?.length > 0 && (
                            <div className="flex gap-1">
                              <span className="text-muted-foreground">Ambientes:</span>
                              {itemExtra.ambientes.map((ambiente: string) => (
                                <Badge key={ambiente} variant="outline" className="text-xs">
                                  {ambiente}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {isReadonly && itemExtra.observacoes && (
                        <p className="text-xs text-muted-foreground">{itemExtra.observacoes}</p>
                      )}
                    </div>
                    
                    {!isReadonly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setItensExtras(prev => prev.filter((_, i) => i !== index));
                          toast({
                            title: "Item removido",
                            description: "Item extra removido da proposta",
                          });
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum item extra adicionado</p>
              {!isReadonly && <p className="text-sm">Adicione itens extras para destacar sua proposta</p>}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <span className="font-semibold">Valor Total Estimado:</span>
            </div>
            <span className="text-xl font-bold text-primary">
              R$ {calcularValorTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          {itensExtras.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Inclui {itensExtras.length} item(ns) extra(s)
            </div>
          )}

          {/* Forma de Pagamento */}
          {!isReadonly ? (
            /* Forma de Pagamento - modo edição */
            <MultiFormaPagamentoSelector
              value={formaPagamento}
              onChange={setFormaPagamento}
              valorTotal={calcularValorTotal()}
            />
          ) : (
            /* Exibir formas de pagamento em modo readonly */
            formaPagamento && formaPagamento.length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Formas de Pagamento
                </label>
                <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                  {formaPagamento.map((forma, idx) => (
                    <div key={idx} className="border-b pb-2 last:border-b-0 last:pb-0">
                      <span className="font-medium">Opção {idx + 1}:</span>{' '}
                      {forma.tipo === 'a_vista' && (
                        <span>À Vista{forma.desconto_porcentagem ? ` com ${forma.desconto_porcentagem}% de desconto` : ''}</span>
                      )}
                      {forma.tipo === 'entrada_medicoes' && (
                        <span>Entrada de {forma.entrada_porcentagem || 0}% + Medições {forma.frequencia_medicoes || 'conforme execução'}</span>
                      )}
                      {forma.tipo === 'medicoes' && (
                        <span>Medições {forma.frequencia_medicoes || 'conforme execução'}</span>
                      )}
                      {forma.tipo === 'boletos' && (
                        <span>{forma.boletos_quantidade || 1} boleto{(forma.boletos_quantidade || 1) > 1 ? 's' : ''}</span>
                      )}
                      {forma.tipo === 'cartao' && (
                        <span>Cartão em {forma.cartao_parcelas || 1}x</span>
                      )}
                      {forma.tipo === 'personalizado' && (
                        <span>{forma.texto_personalizado}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* SEÇÃO DE AÇÕES REORGANIZADA - TODOS OS BOTÕES NO FINAL DA PÁGINA */}
        {candidaturaId && !isRevisionMode && (
          <div className="border-t pt-6 space-y-4">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-muted-foreground mb-4">
                Ações da Proposta
              </h4>
            </div>
            
            {/* Feedback visual para itens extras */}
            {itensExtras.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <Tag className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">
                    {itensExtras.length} item(ns) extra(s) adicionado(s)
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1">
                    Seus itens extras serão incluídos na proposta e aparecerão no comparador
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Validação de dados antes do envio */}
            {!isReadonly && calcularValorTotal() === 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription>
                  ⚠️ Adicione ao menos um item com valor para prosseguir com a proposta
                </AlertDescription>
              </Alert>
            )}

            {/* Botões de ação - organizados em ordem lógica */}
            {!isReadonly ? (
              <div className="space-y-3">
                {/* 1. Salvar Proposta - sempre visível quando editável */}
                <Button 
                  onClick={async () => {
                    await salvarProposta();
                    toast({
                      title: "Proposta Salva",
                      description: "Dados salvos e disponíveis no comparador de propostas",
                    });
                  }} 
                  disabled={saving}
                  className="w-full"
                  size="lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Proposta'}
                </Button>

                {/* 2. Exportar Excel - sempre visível */}
                {checklistPropostaId && (
                  <Button 
                    onClick={handleExportarProposta}
                    disabled={exportando}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    size="lg"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {exportando ? 'Exportando...' : 'Exportar para Excel'}
                  </Button>
                )}

                {/* 3. Finalizar e Enviar Proposta - apenas para rascunhos */}
                {checklistPropostaId && calcularValorTotal() > 0 && 
                 (propostaData?.status === 'rascunho' || propostaData?.status === 'em_revisao' || !propostaData?.status) && (
                  <Button 
                    onClick={abrirModalResumo}
                    disabled={enviando}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-6"
                  >
                    <CheckSquare className="h-5 w-5 mr-2" />
                    {enviando ? 'Finalizando...' : 'Finalizar e Enviar Proposta'}
                  </Button>
                )}
              </div>
            ) : (
              // Botões para proposta readonly (enviada)
              <div className="space-y-3">
                <Button 
                  onClick={handleExportarProposta}
                  disabled={exportando}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  size="lg"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {exportando ? 'Exportando...' : 'Exportar para Excel'}
                </Button>

                {/* Seção de notificação para propostas enviadas */}
                {checklistPropostaId && calcularValorTotal() > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    {propostaData?.notificado && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          ✅ Cliente notificado em{' '}
                          {propostaData.data_notificacao 
                            ? new Date(propostaData.data_notificacao).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'data não disponível'
                          }
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button 
                      onClick={() => {
                        console.log('🚨 BOTÃO NOTIFICAR CLICADO');
                        notificarCliente(propostaData?.notificado);
                      }}
                      disabled={notificando}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {notificando 
                        ? 'Notificando...' 
                        : propostaData?.notificado 
                          ? 'Reenviar Notificação via WhatsApp'
                          : 'Notificar Cliente - Proposta Pronta'
                      }
                    </Button>
                    
                    {propostaData?.notificado && (
                      <p className="text-xs text-muted-foreground text-center">
                        O cliente receberá uma nova mensagem com link direto atualizado
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {candidaturaId && (
          <div className="space-y-3">
            {/* Status da Proposta */}
            {propostaData && (
              <Alert className={
                propostaData.status === 'finalizada' ? 'border-green-200 bg-green-50' :
                  propostaData.status === 'em_revisao' ? 'border-yellow-200 bg-yellow-50' :
                  propostaData.status === 'pendente_revisao' ? 'border-orange-200 bg-orange-50' :
                'border-blue-200 bg-blue-50'
              }>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Status: </span>
                  {propostaData.status === 'finalizada' && '✅ Proposta Finalizada - Visível no comparador do cliente'}
                  {propostaData.status === 'enviado' && '📤 Proposta Enviada - Aguardando análise do cliente'}
                  {propostaData.status === 'em_revisao' && '🔄 Em Revisão - Solicitação de alterações do cliente'}
                  {propostaData.status === 'pendente_revisao' && '⏳ Revisão Solicitada - Inicie a revisão para editar'}
                  {propostaData.status === 'rascunho' && '📝 Rascunho - Ainda não enviada'}
                  {propostaData.status === 'rascunho_colaborativo' && '🤝 Colaborativo - Aguardando consolidação'}
                  {propostaData.data_envio && (propostaData.status === 'finalizada' || propostaData.status === 'enviado') && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Enviada em {new Date(propostaData.data_envio).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* SEÇÃO DE AÇÕES MOVIDA PARA O FINAL - APÓS VALOR TOTAL E FORMA DE PAGAMENTO */}
          </div>
        )}
      </CardContent>
    </Card>

      {/* Modal de Resumo de Envio */}
      <ModalResumoEnvio
        open={showResumoModal}
        onOpenChange={setShowResumoModal}
        onConfirmarEnvio={enviarProposta}
        checklistData={{ checklistItems, respostas }}
        itensExtras={itensExtras}
        valorTotal={calcularValorTotal()}
        formaPagamento={formaPagamento}
        enviando={enviando}
      />

      {/* Modal WhatsApp */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-medium mb-4 text-gray-900">
              Link WhatsApp Gerado
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Cole este link em uma nova aba do navegador:
              </p>
              <div className="bg-gray-100 p-3 rounded border text-xs font-mono break-all">
                {whatsAppLink}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(whatsAppLink);
                    toast({
                      title: "Link copiado!",
                      description: "Agora cole em uma nova aba do navegador.",
                      duration: 5000,
                    });
                    setShowWhatsAppModal(false);
                  } catch (err) {
                    console.error('Erro ao copiar:', err);
                    // Selecionar texto para cópia manual
                    const textDiv = document.querySelector('.bg-gray-100') as HTMLElement;
                    if (textDiv) {
                      const range = document.createRange();
                      range.selectNode(textDiv);
                      window.getSelection()?.removeAllRanges();
                      window.getSelection()?.addRange(range);
                      toast({
                        title: "Texto selecionado",
                        description: "Use Ctrl+C para copiar manualmente.",
                        duration: 5000,
                      });
                    }
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Copiar Link
              </button>
              
              <button
                onClick={() => {
                  window.open(whatsAppLink, '_blank');
                  setShowWhatsAppModal(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                Abrir WhatsApp
              </button>
              
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Itens Extras */}
      <ItensExtrasModal
        open={modalItensExtrasOpen}
        onOpenChange={setModalItensExtrasOpen}
        onAddItem={(item) => {
          setItensExtras(prev => [...prev, item]);
          setModalItensExtrasOpen(false);
        }}
        itensJaIncluidos={[
          ...checklistItems
            .filter(item => {
              const resposta = respostas.find(r => r.item_id === item.id);
              return resposta?.incluido;
            })
            .map(item => item.id),
          ...itensExtras.filter(item => item.item_id).map(item => item.item_id)
        ]}
      />
    </>
  );
});

export default React.memo(ChecklistProposta);