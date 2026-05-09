import { supabase } from '@/integrations/supabase/client';
import { processarDataInicio } from '@/utils/orcamentoUtils';
import { criarDataLocal } from '@/utils/dateUtils';

export const buscarTodosOrcamentos = async (userId: string, apenasAbertos: boolean = true) => {
  let query = supabase
    .from('orcamentos')
    .select(`
      id,
      necessidade,
      categorias,
      local,
      tamanho_imovel,
      data_publicacao,
      data_inicio,
      prazo_inicio_texto,
      status,
      dados_contato,
      updated_at,
      orcamentos_crm_tracking!left(
        concierge_responsavel_id,
        profiles!orcamentos_crm_tracking_concierge_responsavel_id_fkey(
          nome,
          email
        )
      ),
      tipo_atendimento_tecnico,
      candidaturas_fornecedores!left(
        id,
        data_candidatura,
        status_acompanhamento,
        fornecedor_id,
        data_desistencia
      ),
      arquivos_orcamento!left(
        id,
        nome_arquivo,
        tipo_arquivo,
        tamanho,
        url_arquivo
      ),
      horarios_visita_orcamento!left(
        id,
        data_hora,
        fornecedor_id
      )
    `)
    .order('data_publicacao', { ascending: false });

  // Filtrar apenas abertos no servidor para performance
  if (apenasAbertos) {
    query = query.eq('status', 'aberto');
  }

  const { data: orcamentosRaw, error: orcamentosError } = await query;

  if (orcamentosError) {
    console.error('❌ [useOrcamentoDB] Erro na consulta:', orcamentosError);
    throw orcamentosError;
  }

  return orcamentosRaw || [];
};

// Nova função otimizada: busca abertos + fechados dos últimos X dias
export const buscarOrcamentosOtimizado = async (userId: string, diasFechados: number = 3) => {
  // Calcular data limite para fechados
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasFechados);
  const dataLimiteISO = dataLimite.toISOString();

  const { data: orcamentosRaw, error: orcamentosError } = await supabase
    .from('orcamentos')
    .select(`
      id,
      necessidade,
      categorias,
      local,
      tamanho_imovel,
      data_publicacao,
      data_inicio,
      prazo_inicio_texto,
      status,
      dados_contato,
      updated_at,
      orcamentos_crm_tracking!left(
        concierge_responsavel_id,
        profiles!orcamentos_crm_tracking_concierge_responsavel_id_fkey(
          nome,
          email
        )
      ),
      tipo_atendimento_tecnico,
      candidaturas_fornecedores!left(
        id,
        data_candidatura,
        status_acompanhamento,
        fornecedor_id,
        data_desistencia
      ),
      arquivos_orcamento!left(
        id,
        nome_arquivo,
        tipo_arquivo,
        tamanho,
        url_arquivo
      ),
      horarios_visita_orcamento!left(
        id,
        data_hora,
        fornecedor_id
      )
    `)
    .or(`status.eq.aberto,and(status.eq.fechado,data_publicacao.gte.${dataLimiteISO})`)
    .order('data_publicacao', { ascending: false });

  if (orcamentosError) {
    console.error('❌ [useOrcamentoDB] Erro na consulta otimizada:', orcamentosError);
    throw orcamentosError;
  }

  return orcamentosRaw || [];
};

export const buscarContagemInscricoes = async (orcamentoIds: string[]) => {
  if (orcamentoIds.length === 0) return [];

  const { data: contagem, error: contagemError } = await supabase
    .from('candidaturas_fornecedores')
    .select('orcamento_id')
    .in('orcamento_id', orcamentoIds)
    .is('data_desistencia', null);

  if (contagemError) {
    throw contagemError;
  }

  return contagem || [];
};

export const processarDadosOrcamento = (orc: any, userId: string, contagemPorOrcamento: Record<string, number>) => {
  // Contar candidaturas ativas diretamente dos dados do LEFT JOIN
  const candidaturasAtivas = Array.isArray(orc.candidaturas_fornecedores)
    ? orc.candidaturas_fornecedores.filter((cand: any) => cand && !cand.data_desistencia).length
    : 0;

  // Verificar se o usuário está inscrito (usando candidaturas)
  const minhaInscricao = Array.isArray(orc.candidaturas_fornecedores) 
    ? orc.candidaturas_fornecedores.find((cand: any) => cand && cand.fornecedor_id === userId && !cand.data_desistencia)
    : (orc.candidaturas_fornecedores && (orc.candidaturas_fornecedores as any).fornecedor_id === userId && !(orc.candidaturas_fornecedores as any).data_desistencia ? orc.candidaturas_fornecedores : null);

  // Cast seguro do dadosContato
  let dadosContato: { nome: string; telefone: string; email: string; } | null = null;
  if (orc.dados_contato && typeof orc.dados_contato === 'object') {
    const dados = orc.dados_contato as any;
    if (dados.nome && dados.telefone && dados.email) {
      dadosContato = {
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email
      };
    }
  }

  // Extrair dados do concierge
  let conciergeResponsavel: { nome: string; email: string; } | null = null;
  
  try {
    if (Array.isArray(orc.orcamentos_crm_tracking) && orc.orcamentos_crm_tracking.length > 0) {
      const tracking = orc.orcamentos_crm_tracking[0];
      
      // Tentar acessar profiles diretamente (nova sintaxe)
      if (tracking?.profiles && typeof tracking.profiles === 'object') {
        const concierge = tracking.profiles as any;
        if (concierge.nome && concierge.email) {
          conciergeResponsavel = {
            nome: concierge.nome,
            email: concierge.email
          };
        }
      }
      // Fallback para sintaxe antiga
      else if (tracking?.concierge && typeof tracking.concierge === 'object') {
        const concierge = tracking.concierge as any;
        if (concierge.nome && concierge.email) {
          conciergeResponsavel = {
            nome: concierge.nome,
            email: concierge.email
          };
        }
      }
    }
  } catch (error) {
    console.error(`❌ [processarDadosOrcamento] Erro ao processar concierge:`, error);
  }

  // Processar prazo - priorizar texto do prazo se disponível
  let prazoTexto: string;
  let dataInicio: Date | string;
  
  if (orc.prazo_inicio_texto) {
    // Se temos texto do prazo, usar ele
    prazoTexto = orc.prazo_inicio_texto;
    dataInicio = orc.prazo_inicio_texto;
  } else {
    // Caso contrário, processar data_inicio como antes
    const resultado = processarDataInicio(orc.data_inicio);
    dataInicio = resultado.data;
    prazoTexto = resultado.prazoTexto;
  }

  // Processar arquivos
  const arquivos = Array.isArray(orc.arquivos_orcamento) ? orc.arquivos_orcamento : [];
  
  const documentos = arquivos.filter((arquivo: any) => 
    arquivo.tipo_arquivo !== 'image/jpeg' && 
    arquivo.tipo_arquivo !== 'image/png' && 
    arquivo.tipo_arquivo !== 'image/gif'
  );
  const fotos = arquivos.filter((arquivo: any) => 
    arquivo.tipo_arquivo === 'image/jpeg' || 
    arquivo.tipo_arquivo === 'image/png' || 
    arquivo.tipo_arquivo === 'image/gif'
  );

  // Processar horários de visita
  const horariosVisita = Array.isArray(orc.horarios_visita_orcamento) 
    ? orc.horarios_visita_orcamento 
    : [];

  const estaInscrito = !!minhaInscricao;
  const tipoAtendimento = (orc.tipo_atendimento_tecnico as 'presencial' | 'online' | null) ?? null;

  return {
    id: orc.id,
    necessidade: orc.necessidade,
    categorias: orc.categorias,
    local: orc.local,
    tamanhoImovel: Number(orc.tamanho_imovel) || 0,
    dataPublicacao: criarDataLocal(orc.data_publicacao),
    dataInicio,
    prazoInicioTexto: prazoTexto,
    status: orc.status as 'aberto' | 'fechado',
    quantidadeEmpresas: candidaturasAtivas,
    dadosContato,
    conciergeResponsavel,
    inscricaoId: minhaInscricao?.id,
    inscritoEm: minhaInscricao ? criarDataLocal(minhaInscricao.data_candidatura) : undefined,
    statusAcompanhamento: minhaInscricao?.status_acompanhamento || null,
    estaInscrito,
    tipoAtendimento,
    arquivos: estaInscrito ? documentos : [],
    fotos: estaInscrito ? fotos : [],
    horariosVisita
  };
};
