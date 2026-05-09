import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Orcamento, Fornecedor, NovoOrcamentoInput } from '@/types';
import { criarDataLocal } from '@/utils/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { dispararEstimativaIA } from '@/hooks/useGerarEstimativaIA';

const PAGE_SIZE = 50;

export const useOrcamentoData = () => {
  const { user, profile } = useAuth();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const carregarOrcamentos = useCallback(async (page = 0, append = false) => {
    try {
      const isFirstPage = page === 0 && !append;
      if (isFirstPage) {
        console.log('🔄 [useOrcamentoData] Carregando orçamentos (página 1)...');
      } else {
        setIsLoadingMore(true);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Single query with LEFT JOINs — eliminates N+1 problem
      let query = supabase
        .from('orcamentos')
        .select(`
          *,
          gestor_conta:profiles!orcamentos_gestor_conta_id_fkey(
            id, nome, email, empresa, status
          ),
          candidaturas_fornecedores!left(
            id, nome, email, telefone, empresa, data_candidatura, 
            status_acompanhamento, data_desistencia
          ),
          arquivos_orcamento!left(
            id, nome_arquivo, tipo_arquivo, tamanho, url_arquivo
          ),
          horarios_visita_orcamento!left(
            id, data_hora, fornecedor_id,
            fornecedor:profiles!horarios_visita_orcamento_fornecedor_id_fkey(nome)
          )
        `, { count: 'exact' });

      // Filter by gestor if user is gestor_conta
      if (profile?.tipo_usuario === 'gestor_conta' && user?.id) {
        query = query.eq('gestor_conta_id', user.id);
      }

      const { data: orcamentosData, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('❌ [useOrcamentoData] Erro ao carregar orçamentos:', error);
        throw error;
      }

      if (count !== null) {
        setTotalCount(count);
      }

      const loaded = (orcamentosData || []).length;
      const newHasMore = loaded === PAGE_SIZE;
      setHasMore(newHasMore);
      setCurrentPage(page);

      console.log(`✅ [useOrcamentoData] Página ${page + 1}: ${loaded} orçamentos (total: ${count})`);

      const mapped = (orcamentosData || []).map((orcamento: any) => {
        // Filter active candidatures (no desistencia)
        const candidaturasAtivas = (orcamento.candidaturas_fornecedores || [])
          .filter((c: any) => !c.data_desistencia);

        const fornecedoresInscritos: Fornecedor[] = candidaturasAtivas.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          email: c.email,
          telefone: c.telefone,
          empresa: c.empresa,
          dataInscricao: criarDataLocal(c.data_candidatura),
          status_acompanhamento: c.status_acompanhamento,
        }));

        return {
          id: orcamento.id,
          dataPublicacao: criarDataLocal(orcamento.data_publicacao),
          necessidade: orcamento.necessidade,
          arquivos: [],
          fotos: [],
          categorias: orcamento.categorias,
          local: orcamento.local,
          tamanhoImovel: Number(orcamento.tamanho_imovel) || 0,
          dataInicio: orcamento.data_inicio ? criarDataLocal(orcamento.data_inicio) : new Date(),
          prazoInicioTexto: orcamento.prazo_inicio_texto || orcamento.data_inicio,
          quantidadeEmpresas: fornecedoresInscritos.length,
          status: orcamento.status as 'aberto' | 'fechado',
          fornecedoresInscritos,
          dadosContato: orcamento.dados_contato,
          gestorContaId: orcamento.gestor_conta_id,
          gestor_conta_id: orcamento.gestor_conta_id,
          gestor_conta: orcamento.gestor_conta,
          prazo_explicitamente_definido: orcamento.prazo_explicitamente_definido,
          prazo_envio_proposta_dias: orcamento.prazo_envio_proposta_dias,
          data_liberacao_fornecedores: orcamento.data_liberacao_fornecedores,
          rota100_token: orcamento.rota100_token ?? null,
          arquivosData: orcamento.arquivos_orcamento || [],
          horariosVisita: (orcamento.horarios_visita_orcamento || []).map((h: any) => ({
            id: h.id,
            data_hora: h.data_hora,
            fornecedor_id: h.fornecedor_id,
            fornecedor_nome: h.fornecedor?.nome || null,
          })),
        } as Orcamento & { arquivosData: any[] };
      });

      if (append) {
        setOrcamentos(prev => [...prev, ...mapped]);
      } else {
        setOrcamentos(mapped);
      }

      setIsLoadingMore(false);
    } catch (error) {
      console.error('❌ [useOrcamentoData] Erro no carregamento:', error);
      setIsLoadingMore(false);
    }
  }, [user?.id, profile?.tipo_usuario]);

  const carregarMais = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await carregarOrcamentos(currentPage + 1, true);
  }, [carregarOrcamentos, currentPage, hasMore, isLoadingMore]);

  const adicionarOrcamento = useCallback(async (novoOrcamento: NovoOrcamentoInput) => {
    try {
      console.log('🔄 Adicionando orçamento com gestor:', {
        gestorContaId: novoOrcamento.gestorContaId,
        gestor_conta_id: novoOrcamento.gestor_conta_id
      });

      const rota100Token = crypto.randomUUID();

      const { data, error } = await supabase
        .from('orcamentos')
        .insert({
          necessidade: novoOrcamento.necessidade,
          categorias: novoOrcamento.categorias,
          local: novoOrcamento.local,
          tamanho_imovel: novoOrcamento.tamanhoImovel,
          prazo_inicio_texto: novoOrcamento.prazoInicioTexto,
          data_inicio: null,
          dados_contato: novoOrcamento.dadosContato,
          status: 'aberto',
          gestor_conta_id: novoOrcamento.gestorContaId || novoOrcamento.gestor_conta_id,
          prazo_explicitamente_definido: novoOrcamento.prazo_explicitamente_definido || false,
          prazo_envio_proposta_dias: novoOrcamento.prazo_envio_proposta_dias || 7,
          budget_informado: novoOrcamento.budget_informado,
          produto_segmentacao_id: novoOrcamento.produto_segmentacao_id || null,
          data_liberacao_fornecedores: novoOrcamento.data_liberacao_fornecedores || null,
          tipo_atendimento_tecnico: novoOrcamento.tipo_atendimento_tecnico || null,
          data_atendimento_tecnico: novoOrcamento.data_atendimento_tecnico || null,
          hora_atendimento_tecnico: novoOrcamento.hora_atendimento_tecnico || null,
          rota100_token: rota100Token,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Orçamento criado com sucesso:', data);

      // IA estimate: dispara em background — não bloqueia o fluxo de cadastro
      dispararEstimativaIA(data.id);

      // Inicializar orçamento no CRM
      const { data: user } = await supabase.auth.getUser();
      const conciergeId = novoOrcamento.gestorContaId || novoOrcamento.gestor_conta_id || user.user?.id;

      const { data: crmData, error: crmError } = await supabase.rpc('inicializar_orcamento_crm', {
        p_orcamento_id: data.id,
        p_concierge_id: conciergeId
      });

      if (crmError) {
        console.error('❌ ERRO CRÍTICO ao inicializar orçamento no CRM:', crmError);
        const { toast } = await import('sonner');
        toast.error('Orçamento criado, mas houve um erro ao inicializar no CRM.', { duration: 8000 });
        await supabase.from('logs_acesso').insert({
          user_id: user.user?.id,
          acao: `ERRO_CRM_FRONTEND: ${data.id} - ${crmError.message}`
        });
      } else {
        console.log('✅ Orçamento inicializado no CRM:', crmData);
        const { toast } = await import('sonner');
        toast.success('Orçamento criado e inicializado no CRM com sucesso!');
      }

      // Upload dos arquivos
      const arquivosParaUpload = [...novoOrcamento.arquivos, ...novoOrcamento.fotos, ...(novoOrcamento.videos || [])];
      
      if (arquivosParaUpload.length > 0) {
        for (const arquivo of arquivosParaUpload) {
          const timestamp = Date.now();
          const fileName = `${data.id}/${timestamp}-${arquivo.name}`;

          const { error: uploadError } = await supabase.storage
            .from('orcamentos-anexos')
            .upload(fileName, arquivo);

          if (uploadError) {
            console.error('❌ Erro no upload:', uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('orcamentos-anexos')
            .getPublicUrl(fileName);

          await supabase
            .from('arquivos_orcamento')
            .insert({
              orcamento_id: data.id,
              nome_arquivo: arquivo.name,
              tipo_arquivo: arquivo.type,
              tamanho: arquivo.size,
              url_arquivo: urlData.publicUrl
            });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      await carregarOrcamentos();
      
      return data;
    } catch (error) {
      console.error('Erro ao adicionar orçamento:', error);
      throw error;
    }
  }, [carregarOrcamentos]);

  return {
    orcamentos,
    setOrcamentos,
    carregarOrcamentos,
    adicionarOrcamento,
    totalCount,
    hasMore,
    carregarMais,
    isLoadingMore,
    currentPage,
  };
};
