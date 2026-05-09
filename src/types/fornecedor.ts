
export interface FornecedorInscrito {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  dataInscricao: Date;
  status_acompanhamento?: 
    | '1_contato_realizado'
    | '2_contato_realizado'
    | '3_contato_realizado'
    | '4_contato_realizado'
    | '5_contato_realizado'
    | 'cliente_respondeu_nao_agendou'
    | 'visita_agendada'
    | 'visita_realizada'
    | 'reuniao_agendada'
    | 'reuniao_realizada'
    | 'em_orcamento'
    | 'orcamento_enviado'
    | 'negocio_fechado'
    | 'negocio_perdido'
    | 'nao_respondeu_mensagens'
    | null;
}
