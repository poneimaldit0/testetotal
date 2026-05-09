export interface CRMTag {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  visivel_para_todos: boolean;
  criado_por_id?: string;
  criado_por_nome?: string;
  created_at: string;
}

export interface TagMarcenaria {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  visivel_para_todos: boolean;
  criado_por_id?: string;
  criado_por_nome?: string;
  created_at: string;
}

export interface TagSimplificada {
  id: string;
  nome: string;
  cor: string;
}
