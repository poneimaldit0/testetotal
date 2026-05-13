
import { StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

export interface OrcamentoMeusOrcamentos {
  id: string;
  necessidade: string;
  local: string;
  tamanhoImovel: number;
  categorias: string[];
  status: 'aberto' | 'fechado';
  dataPublicacao: Date;
  dataInicio: Date | null;
  dadosContato?: {
    nome: string;
    telefone: string;
    email: string;
  };
  inscricaoId: string;
  statusAcompanhamento: StatusAcompanhamento | null;
  dataInscricao: Date;
  quantidadeEmpresas: number;
  horariosVisitaTotal?: number;
  // Adicionar campos de arquivos
  arquivos?: Array<{
    id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    tamanho: number;
    url_arquivo: string;
  }>;
  fotos?: Array<{
    id: string;
    nome_arquivo: string;
    tipo_arquivo: string;
    tamanho: number;
    url_arquivo: string;
  }>;
}

export const processarDadosContato = (dadosContato: any) => {
  if (dadosContato && typeof dadosContato === 'object') {
    const dados = dadosContato as any;
    if (dados.nome && dados.telefone && dados.email) {
      return {
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email
      };
    }
  }
  return undefined;
};

export const criarContagemPorOrcamento = (contagemEmpresas: any[]) => {
  const contagemPorOrcamento: Record<string, number> = {};
  contagemEmpresas.forEach(item => {
    contagemPorOrcamento[item.orcamento_id] = (contagemPorOrcamento[item.orcamento_id] || 0) + 1;
  });
  return contagemPorOrcamento;
};

export const processarOrcamentoCompleto = (
  inscricao: any,
  orcamento: any,
  contagemPorOrcamento: Record<string, number>
): OrcamentoMeusOrcamentos => {
  const dadosContato = processarDadosContato(orcamento.dados_contato);

  // Processar arquivos
  const arquivos = Array.isArray(orcamento.arquivos_orcamento) ? orcamento.arquivos_orcamento : [];
  console.log(`📂 [processarOrcamentoCompleto] Orçamento ${orcamento.id}: ${arquivos.length} arquivos brutos`, arquivos);
  
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
  
  console.log(`📄 [processarOrcamentoCompleto] Orçamento ${orcamento.id}: ${documentos.length} documentos, ${fotos.length} fotos`);

  return {
    id: orcamento.id,
    necessidade: orcamento.necessidade || '',
    local: orcamento.local || '',
    tamanhoImovel: Number(orcamento.tamanho_imovel) || 0,
    categorias: orcamento.categorias || [],
    status: orcamento.status as 'aberto' | 'fechado',
    dataPublicacao: new Date(orcamento.data_publicacao),
    dataInicio: orcamento.data_inicio ? new Date(orcamento.data_inicio) : null,
    dadosContato,
    inscricaoId: inscricao.id,
    statusAcompanhamento: inscricao.status_acompanhamento as StatusAcompanhamento | null,
    dataInscricao: new Date(inscricao.data_inscricao),
    quantidadeEmpresas: contagemPorOrcamento[orcamento.id] || 0,
    horariosVisitaTotal: Array.isArray(orcamento.horarios_visita_orcamento)
      ? orcamento.horarios_visita_orcamento.length
      : undefined,
    arquivos: documentos,
    fotos: fotos
  };
};
