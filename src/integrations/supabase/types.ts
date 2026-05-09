export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      arquivos_orcamento: {
        Row: {
          created_at: string
          id: string
          nome_arquivo: string
          orcamento_id: string | null
          tamanho: number | null
          tipo_arquivo: string
          url_arquivo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_arquivo: string
          orcamento_id?: string | null
          tamanho?: number | null
          tipo_arquivo: string
          url_arquivo: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_arquivo?: string
          orcamento_id?: string | null
          tamanho?: number | null
          tipo_arquivo?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_fornecedores: {
        Row: {
          cliente_email: string | null
          cliente_nome: string
          comentario: string | null
          created_at: string
          custo_planejado: number | null
          data_avaliacao: string
          fornecedor_id: string
          gestao_mao_obra: number | null
          gestao_materiais: number | null
          id: string
          nota_geral: number
          orcamento_id: string | null
          prazo: number | null
          qualidade: number | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_nome: string
          comentario?: string | null
          created_at?: string
          custo_planejado?: number | null
          data_avaliacao?: string
          fornecedor_id: string
          gestao_mao_obra?: number | null
          gestao_materiais?: number | null
          id?: string
          nota_geral: number
          orcamento_id?: string | null
          prazo?: number | null
          qualidade?: number | null
        }
        Update: {
          cliente_email?: string | null
          cliente_nome?: string
          comentario?: string | null
          created_at?: string
          custo_planejado?: number | null
          data_avaliacao?: string
          fornecedor_id?: string
          gestao_mao_obra?: number | null
          gestao_materiais?: number | null
          id?: string
          nota_geral?: number
          orcamento_id?: string | null
          prazo?: number | null
          qualidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_sistema: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string | null
          criado_por: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string | null
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      backups_revisoes_propostas: {
        Row: {
          checklist_proposta_id: string
          created_at: string
          data_backup: string
          forma_pagamento_backup: Json | null
          id: string
          motivo_backup: string
          respostas_backup: Json
          restored: boolean
          valor_total_backup: number
        }
        Insert: {
          checklist_proposta_id: string
          created_at?: string
          data_backup?: string
          forma_pagamento_backup?: Json | null
          id?: string
          motivo_backup?: string
          respostas_backup?: Json
          restored?: boolean
          valor_total_backup?: number
        }
        Update: {
          checklist_proposta_id?: string
          created_at?: string
          data_backup?: string
          forma_pagamento_backup?: Json | null
          id?: string
          motivo_backup?: string
          respostas_backup?: Json
          restored?: boolean
          valor_total_backup?: number
        }
        Relationships: [
          {
            foreignKeyName: "backups_revisoes_propostas_checklist_proposta_id_fkey"
            columns: ["checklist_proposta_id"]
            isOneToOne: false
            referencedRelation: "checklist_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidaturas_fornecedores: {
        Row: {
          acessos_reuniao: Json
          created_at: string
          data_candidatura: string
          data_desistencia: string | null
          data_limite_envio: string | null
          desistencia_aprovada: boolean | null
          email: string
          empresa: string
          fornecedor_id: string
          id: string
          link_reuniao: string | null
          motivo_desistencia: string | null
          nome: string
          observacoes_acompanhamento: string | null
          orcamento_id: string
          penalidade_aplicada: boolean | null
          pode_desistir: boolean | null
          proposta_enviada: boolean | null
          status_acompanhamento: string | null
          status_acompanhamento_concierge: string | null
          telefone: string
          token_visita: string | null
          updated_at: string
          visita_confirmada_em: string | null
          visita_confirmada_por: string | null
        }
        Insert: {
          acessos_reuniao?: Json
          created_at?: string
          data_candidatura?: string
          data_desistencia?: string | null
          data_limite_envio?: string | null
          desistencia_aprovada?: boolean | null
          email: string
          empresa: string
          fornecedor_id: string
          id?: string
          link_reuniao?: string | null
          motivo_desistencia?: string | null
          nome: string
          observacoes_acompanhamento?: string | null
          orcamento_id: string
          penalidade_aplicada?: boolean | null
          pode_desistir?: boolean | null
          proposta_enviada?: boolean | null
          status_acompanhamento?: string | null
          status_acompanhamento_concierge?: string | null
          telefone: string
          token_visita?: string | null
          updated_at?: string
          visita_confirmada_em?: string | null
          visita_confirmada_por?: string | null
        }
        Update: {
          acessos_reuniao?: Json
          created_at?: string
          data_candidatura?: string
          data_desistencia?: string | null
          data_limite_envio?: string | null
          desistencia_aprovada?: boolean | null
          email?: string
          empresa?: string
          fornecedor_id?: string
          id?: string
          link_reuniao?: string | null
          motivo_desistencia?: string | null
          nome?: string
          observacoes_acompanhamento?: string | null
          orcamento_id?: string
          penalidade_aplicada?: boolean | null
          pode_desistir?: boolean | null
          proposta_enviada?: boolean | null
          status_acompanhamento?: string | null
          status_acompanhamento_concierge?: string | null
          telefone?: string
          token_visita?: string | null
          updated_at?: string
          visita_confirmada_em?: string | null
          visita_confirmada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "candidaturas_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_financeiras: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_colaborativo: {
        Row: {
          contribuicoes_recebidas: number
          created_at: string
          data_consolidacao: string | null
          data_inicio: string
          id: string
          orcamento_id: string
          prazo_contribuicao: string
          status: string
          total_fornecedores: number
          updated_at: string
        }
        Insert: {
          contribuicoes_recebidas?: number
          created_at?: string
          data_consolidacao?: string | null
          data_inicio?: string
          id?: string
          orcamento_id: string
          prazo_contribuicao?: string
          status?: string
          total_fornecedores?: number
          updated_at?: string
        }
        Update: {
          contribuicoes_recebidas?: number
          created_at?: string
          data_consolidacao?: string | null
          data_inicio?: string
          id?: string
          orcamento_id?: string
          prazo_contribuicao?: string
          status?: string
          total_fornecedores?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_colaborativo_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_colaborativo_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_colaborativo_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_itens: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem: number
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      checklist_propostas: {
        Row: {
          candidatura_id: string
          comentarios_revisao: string | null
          created_at: string | null
          data_envio: string | null
          data_notificacao: string | null
          data_ultima_revisao: string | null
          forma_pagamento: Json | null
          id: string
          notificado: boolean | null
          observacoes: string | null
          status: string | null
          updated_at: string | null
          valor_total_estimado: number | null
          versao: number | null
        }
        Insert: {
          candidatura_id: string
          comentarios_revisao?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_notificacao?: string | null
          data_ultima_revisao?: string | null
          forma_pagamento?: Json | null
          id?: string
          notificado?: boolean | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total_estimado?: number | null
          versao?: number | null
        }
        Update: {
          candidatura_id?: string
          comentarios_revisao?: string | null
          created_at?: string | null
          data_envio?: string | null
          data_notificacao?: string | null
          data_ultima_revisao?: string | null
          forma_pagamento?: Json | null
          id?: string
          notificado?: boolean | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total_estimado?: number | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_propostas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          auth_user_id: string | null
          cpf: string | null
          created_at: string | null
          data_aceite: string | null
          email: string
          endereco_atual: Json | null
          endereco_reforma: Json | null
          id: string
          nome: string
          orcamento_id: string | null
          proposta_aceita_id: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          cpf?: string | null
          created_at?: string | null
          data_aceite?: string | null
          email: string
          endereco_atual?: Json | null
          endereco_reforma?: Json | null
          id?: string
          nome: string
          orcamento_id?: string | null
          proposta_aceita_id?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          cpf?: string | null
          created_at?: string | null
          data_aceite?: string | null
          email?: string
          endereco_atual?: Json | null
          endereco_reforma?: Json | null
          id?: string
          nome?: string
          orcamento_id?: string | null
          proposta_aceita_id?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_proposta_aceita_id_fkey"
            columns: ["proposta_aceita_id"]
            isOneToOne: false
            referencedRelation: "checklist_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      codigos_acesso_propostas: {
        Row: {
          candidatura_id: string
          codigo_fornecedor: string
          codigo_orcamento: string
          created_at: string
          expires_at: string
          id: string
          orcamento_id: string
          ultimo_acesso: string | null
          visualizacoes: number
        }
        Insert: {
          candidatura_id: string
          codigo_fornecedor: string
          codigo_orcamento: string
          created_at?: string
          expires_at?: string
          id?: string
          orcamento_id: string
          ultimo_acesso?: string | null
          visualizacoes?: number
        }
        Update: {
          candidatura_id?: string
          codigo_fornecedor?: string
          codigo_orcamento?: string
          created_at?: string
          expires_at?: string
          id?: string
          orcamento_id?: string
          ultimo_acesso?: string | null
          visualizacoes?: number
        }
        Relationships: [
          {
            foreignKeyName: "codigos_acesso_propostas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codigos_acesso_propostas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codigos_acesso_propostas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codigos_acesso_propostas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      compensacoes_contas: {
        Row: {
          conta_compensada_descricao: string
          conta_compensada_id: string
          conta_compensada_tipo: string
          conta_origem_descricao: string
          conta_origem_id: string
          conta_origem_tipo: string
          created_at: string | null
          criado_por: string | null
          criado_por_nome: string | null
          data_compensacao: string | null
          id: string
          observacao: string | null
          valor_compensado: number
        }
        Insert: {
          conta_compensada_descricao: string
          conta_compensada_id: string
          conta_compensada_tipo: string
          conta_origem_descricao: string
          conta_origem_id: string
          conta_origem_tipo: string
          created_at?: string | null
          criado_por?: string | null
          criado_por_nome?: string | null
          data_compensacao?: string | null
          id?: string
          observacao?: string | null
          valor_compensado: number
        }
        Update: {
          conta_compensada_descricao?: string
          conta_compensada_id?: string
          conta_compensada_tipo?: string
          conta_origem_descricao?: string
          conta_origem_id?: string
          conta_origem_tipo?: string
          created_at?: string | null
          criado_por?: string | null
          criado_por_nome?: string | null
          data_compensacao?: string | null
          id?: string
          observacao?: string | null
          valor_compensado?: number
        }
        Relationships: []
      }
      conciliacoes_bancarias: {
        Row: {
          conta_bancaria_id: string
          created_at: string
          data_conciliacao: string
          diferenca: number
          id: string
          observacoes: string | null
          saldo_banco: number
          saldo_sistema: number
        }
        Insert: {
          conta_bancaria_id: string
          created_at?: string
          data_conciliacao: string
          diferenca: number
          id?: string
          observacoes?: string | null
          saldo_banco: number
          saldo_sistema: number
        }
        Update: {
          conta_bancaria_id?: string
          created_at?: string
          data_conciliacao?: string
          diferenca?: number
          id?: string
          observacoes?: string | null
          saldo_banco?: number
          saldo_sistema?: number
        }
        Relationships: [
          {
            foreignKeyName: "conciliacoes_bancarias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_marcenaria: {
        Row: {
          chave: string
          created_at: string | null
          id: string
          updated_at: string | null
          valor: Json
        }
        Insert: {
          chave: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          valor: Json
        }
        Update: {
          chave?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativa: boolean
          banco: string
          conta: string
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          saldo_atual: number
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativa?: boolean
          banco: string
          conta: string
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          saldo_atual?: number
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativa?: boolean
          banco?: string
          conta?: string
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          saldo_atual?: number
          updated_at?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria_id: string | null
          compensacao_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          fornecedor_cliente_id: string | null
          fornecedor_email: string | null
          fornecedor_nome: string
          fornecedor_telefone: string | null
          frequencia_recorrencia: string | null
          id: string
          is_recorrente: boolean | null
          observacoes: string | null
          pago_via_compensacao: boolean | null
          quantidade_parcelas: number | null
          status: string
          subcategoria_id: string | null
          updated_at: string
          valor_original: number
          valor_pago: number
        }
        Insert: {
          categoria_id?: string | null
          compensacao_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor_cliente_id?: string | null
          fornecedor_email?: string | null
          fornecedor_nome: string
          fornecedor_telefone?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          is_recorrente?: boolean | null
          observacoes?: string | null
          pago_via_compensacao?: boolean | null
          quantidade_parcelas?: number | null
          status?: string
          subcategoria_id?: string | null
          updated_at?: string
          valor_original: number
          valor_pago?: number
        }
        Update: {
          categoria_id?: string | null
          compensacao_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor_cliente_id?: string | null
          fornecedor_email?: string | null
          fornecedor_nome?: string
          fornecedor_telefone?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          is_recorrente?: boolean | null
          observacoes?: string | null
          pago_via_compensacao?: boolean | null
          quantidade_parcelas?: number | null
          status?: string
          subcategoria_id?: string | null
          updated_at?: string
          valor_original?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_compensacao_id_fkey"
            columns: ["compensacao_id"]
            isOneToOne: false
            referencedRelation: "compensacoes_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_cliente_id_fkey"
            columns: ["fornecedor_cliente_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          categoria_id: string | null
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string | null
          compensacao_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          data_perda: string | null
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          fornecedor_cliente_id: string | null
          frequencia_recorrencia: string | null
          id: string
          is_recorrente: boolean | null
          justificativa_perda: string | null
          motivo_perda_id: string | null
          observacoes: string | null
          orcamento_id: string | null
          quantidade_parcelas: number | null
          recebido_via_compensacao: boolean | null
          status: string
          subcategoria_id: string | null
          updated_at: string
          valor_original: number
          valor_recebido: number
        }
        Insert: {
          categoria_id?: string | null
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          compensacao_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_perda?: string | null
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          fornecedor_cliente_id?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          is_recorrente?: boolean | null
          justificativa_perda?: string | null
          motivo_perda_id?: string | null
          observacoes?: string | null
          orcamento_id?: string | null
          quantidade_parcelas?: number | null
          recebido_via_compensacao?: boolean | null
          status?: string
          subcategoria_id?: string | null
          updated_at?: string
          valor_original: number
          valor_recebido?: number
        }
        Update: {
          categoria_id?: string | null
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          compensacao_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_perda?: string | null
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          fornecedor_cliente_id?: string | null
          frequencia_recorrencia?: string | null
          id?: string
          is_recorrente?: boolean | null
          justificativa_perda?: string | null
          motivo_perda_id?: string | null
          observacoes?: string | null
          orcamento_id?: string | null
          quantidade_parcelas?: number | null
          recebido_via_compensacao?: boolean | null
          status?: string
          subcategoria_id?: string | null
          updated_at?: string
          valor_original?: number
          valor_recebido?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_compensacao_id_fkey"
            columns: ["compensacao_id"]
            isOneToOne: false
            referencedRelation: "compensacoes_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_fornecedor_cliente_id_fkey"
            columns: ["fornecedor_cliente_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_assinatura_cliente: string | null
          data_assinatura_fornecedor: string | null
          documento_url: string | null
          fornecedor_id: string | null
          id: string
          observacoes: string | null
          orcamento_id: string | null
          proposta_id: string | null
          status_assinatura: string | null
          tipo: string | null
          updated_at: string | null
          valor_contrato: number | null
          zapsign_document_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_assinatura_cliente?: string | null
          data_assinatura_fornecedor?: string | null
          documento_url?: string | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          orcamento_id?: string | null
          proposta_id?: string | null
          status_assinatura?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
          zapsign_document_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_assinatura_cliente?: string | null
          data_assinatura_fornecedor?: string | null
          documento_url?: string | null
          fornecedor_id?: string | null
          id?: string
          observacoes?: string | null
          orcamento_id?: string | null
          proposta_id?: string | null
          status_assinatura?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
          zapsign_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "contratos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "checklist_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      contribuicoes_checklist: {
        Row: {
          checklist_colaborativo_id: string
          created_at: string
          data_contribuicao: string
          fornecedor_id: string
          id: string
          item_id: string
          marcado: boolean
          observacoes: string | null
        }
        Insert: {
          checklist_colaborativo_id: string
          created_at?: string
          data_contribuicao?: string
          fornecedor_id: string
          id?: string
          item_id: string
          marcado?: boolean
          observacoes?: string | null
        }
        Update: {
          checklist_colaborativo_id?: string
          created_at?: string
          data_contribuicao?: string
          fornecedor_id?: string
          id?: string
          item_id?: string
          marcado?: boolean
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribuicoes_checklist_checklist_colaborativo_id_fkey"
            columns: ["checklist_colaborativo_id"]
            isOneToOne: false
            referencedRelation: "checklist_colaborativo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribuicoes_checklist_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribuicoes_checklist_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "contribuicoes_checklist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_atualizacao_diaria_fornecedor: {
        Row: {
          created_at: string | null
          data_verificacao: string
          fornecedor_id: string
          id: string
          tipo_confirmacao: string
        }
        Insert: {
          created_at?: string | null
          data_verificacao: string
          fornecedor_id: string
          id?: string
          tipo_confirmacao?: string
        }
        Update: {
          created_at?: string | null
          data_verificacao?: string
          fornecedor_id?: string
          id?: string
          tipo_confirmacao?: string
        }
        Relationships: []
      }
      crm_avaliacoes_leads: {
        Row: {
          avaliado_por_id: string | null
          avaliado_por_nome: string | null
          created_at: string
          decisor_direto: boolean
          engajamento_alto: boolean
          fornecedor_consegue_orcar: boolean
          id: string
          orcamento_compativel: boolean
          orcamento_id: string
          perfil_ideal: boolean
          pontuacao_total: number | null
          prazo_curto: boolean
          updated_at: string
        }
        Insert: {
          avaliado_por_id?: string | null
          avaliado_por_nome?: string | null
          created_at?: string
          decisor_direto?: boolean
          engajamento_alto?: boolean
          fornecedor_consegue_orcar?: boolean
          id?: string
          orcamento_compativel?: boolean
          orcamento_id: string
          perfil_ideal?: boolean
          pontuacao_total?: number | null
          prazo_curto?: boolean
          updated_at?: string
        }
        Update: {
          avaliado_por_id?: string | null
          avaliado_por_nome?: string | null
          created_at?: string
          decisor_direto?: boolean
          engajamento_alto?: boolean
          fornecedor_consegue_orcar?: boolean
          id?: string
          orcamento_compativel?: boolean
          orcamento_id?: string
          perfil_ideal?: boolean
          pontuacao_total?: number | null
          prazo_curto?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_avaliacoes_leads_avaliado_por_id_fkey"
            columns: ["avaliado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_avaliacoes_leads_avaliado_por_id_fkey"
            columns: ["avaliado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_avaliacoes_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_avaliacoes_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_avaliacoes_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_checklist_etapas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          dias_para_alerta: number
          etapa_crm: Database["public"]["Enums"]["etapa_crm_enum"]
          id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_para_alerta?: number
          etapa_crm: Database["public"]["Enums"]["etapa_crm_enum"]
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_para_alerta?: number
          etapa_crm?: Database["public"]["Enums"]["etapa_crm_enum"]
          id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_checklist_progresso: {
        Row: {
          concluido: boolean
          concluido_por_id: string | null
          concluido_por_nome: string | null
          created_at: string
          data_conclusao: string | null
          id: string
          item_checklist_id: string
          observacao: string | null
          orcamento_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          created_at?: string
          data_conclusao?: string | null
          id?: string
          item_checklist_id: string
          observacao?: string | null
          orcamento_id: string
        }
        Update: {
          concluido?: boolean
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          created_at?: string
          data_conclusao?: string | null
          id?: string
          item_checklist_id?: string
          observacao?: string | null
          orcamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_checklist_progresso_concluido_por_id_fkey"
            columns: ["concluido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_checklist_progresso_concluido_por_id_fkey"
            columns: ["concluido_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_checklist_progresso_item_checklist_id_fkey"
            columns: ["item_checklist_id"]
            isOneToOne: false
            referencedRelation: "crm_checklist_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_checklist_progresso_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_checklist_progresso_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_checklist_progresso_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_etapas_config: {
        Row: {
          ativo: boolean
          cor: string
          cor_atraso: string | null
          created_at: string | null
          descricao: string | null
          dias_limite: number | null
          icone: string | null
          id: string
          ordem: number
          tipo: string
          titulo: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          cor_atraso?: string | null
          created_at?: string | null
          descricao?: string | null
          dias_limite?: number | null
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          cor_atraso?: string | null
          created_at?: string | null
          descricao?: string | null
          dias_limite?: number | null
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      crm_marcenaria_anexos: {
        Row: {
          adicionado_por_id: string | null
          adicionado_por_nome: string | null
          caminho_storage: string
          categoria: string
          created_at: string | null
          id: string
          lead_id: string
          nome_arquivo: string
          tamanho: number
          tipo_arquivo: string
          updated_at: string | null
          url_arquivo: string
        }
        Insert: {
          adicionado_por_id?: string | null
          adicionado_por_nome?: string | null
          caminho_storage: string
          categoria?: string
          created_at?: string | null
          id?: string
          lead_id: string
          nome_arquivo: string
          tamanho: number
          tipo_arquivo: string
          updated_at?: string | null
          url_arquivo: string
        }
        Update: {
          adicionado_por_id?: string | null
          adicionado_por_nome?: string | null
          caminho_storage?: string
          categoria?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          nome_arquivo?: string
          tamanho?: number
          tipo_arquivo?: string
          updated_at?: string | null
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_anexos_adicionado_por_id_fkey"
            columns: ["adicionado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_anexos_adicionado_por_id_fkey"
            columns: ["adicionado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_anexos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_anexos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_anexos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_anexos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_leads_marcenaria_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_anexos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_marcenaria_checklist_etapas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          dias_para_alerta: number
          etapa_marcenaria: string
          id: string
          modelo_mensagem_key: string | null
          ordem: number
          permite_whatsapp: boolean | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          dias_para_alerta?: number
          etapa_marcenaria: string
          id?: string
          modelo_mensagem_key?: string | null
          ordem: number
          permite_whatsapp?: boolean | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          dias_para_alerta?: number
          etapa_marcenaria?: string
          id?: string
          modelo_mensagem_key?: string | null
          ordem?: number
          permite_whatsapp?: boolean | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_marcenaria_checklist_progresso: {
        Row: {
          concluido: boolean | null
          concluido_por_id: string | null
          concluido_por_nome: string | null
          created_at: string | null
          data_conclusao: string | null
          id: string
          item_checklist_id: string
          lead_id: string
          observacao: string | null
        }
        Insert: {
          concluido?: boolean | null
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          id?: string
          item_checklist_id: string
          lead_id: string
          observacao?: string | null
        }
        Update: {
          concluido?: boolean | null
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          id?: string
          item_checklist_id?: string
          lead_id?: string
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_concluido_por_id_fkey"
            columns: ["concluido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_concluido_por_id_fkey"
            columns: ["concluido_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_item_checklist_id_fkey"
            columns: ["item_checklist_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_checklist_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_leads_marcenaria_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_checklist_progresso_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_marcenaria_etapas_config: {
        Row: {
          ativo: boolean
          bloqueado: boolean | null
          cor: string
          cor_atraso: string | null
          created_at: string | null
          descricao: string | null
          dias_limite: number | null
          icone: string | null
          id: string
          ordem: number
          tipo: string
          titulo: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          ativo?: boolean
          bloqueado?: boolean | null
          cor?: string
          cor_atraso?: string | null
          created_at?: string | null
          descricao?: string | null
          dias_limite?: number | null
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          ativo?: boolean
          bloqueado?: boolean | null
          cor?: string
          cor_atraso?: string | null
          created_at?: string | null
          descricao?: string | null
          dias_limite?: number | null
          icone?: string | null
          id?: string
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      crm_marcenaria_historico: {
        Row: {
          data_movimentacao: string | null
          etapa_anterior: string | null
          etapa_nova: string
          id: string
          lead_id: string
          movido_por_id: string | null
          movido_por_nome: string | null
          observacao: string | null
        }
        Insert: {
          data_movimentacao?: string | null
          etapa_anterior?: string | null
          etapa_nova: string
          id?: string
          lead_id: string
          movido_por_id?: string | null
          movido_por_nome?: string | null
          observacao?: string | null
        }
        Update: {
          data_movimentacao?: string | null
          etapa_anterior?: string | null
          etapa_nova?: string
          id?: string
          lead_id?: string
          movido_por_id?: string | null
          movido_por_nome?: string | null
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_leads_marcenaria_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_historico_movido_por_id_fkey"
            columns: ["movido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_historico_movido_por_id_fkey"
            columns: ["movido_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      crm_marcenaria_leads: {
        Row: {
          ambientes_mobiliar: string[] | null
          bloqueado: boolean | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          codigo_orcamento: string | null
          consultor_nome: string | null
          consultor_responsavel_id: string | null
          contratado: boolean | null
          created_at: string | null
          data_contratacao: string | null
          data_criacao_lead: string | null
          data_desbloqueio: string | null
          data_perda: string | null
          estilo_preferido: string | null
          etapa_marcenaria: string
          feedback_cliente: string | null
          id: string
          justificativa_perda: string | null
          mensagem_1_enviada: boolean | null
          mensagem_1_enviada_em: string | null
          mensagem_2_enviada: boolean | null
          mensagem_2_enviada_em: string | null
          mensagem_3_enviada: boolean | null
          mensagem_3_enviada_em: string | null
          motivo_perda_id: string | null
          observacoes_internas: string | null
          orcamento_id: string
          projeto_enviado_em: string | null
          projeto_url: string | null
          reuniao_agendada_para: string | null
          reuniao_realizada_em: string | null
          tem_fotos: boolean | null
          tem_medidas: boolean | null
          tem_planta: boolean | null
          updated_at: string | null
          valor_contrato: number | null
          valor_estimado: number | null
        }
        Insert: {
          ambientes_mobiliar?: string[] | null
          bloqueado?: boolean | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          codigo_orcamento?: string | null
          consultor_nome?: string | null
          consultor_responsavel_id?: string | null
          contratado?: boolean | null
          created_at?: string | null
          data_contratacao?: string | null
          data_criacao_lead?: string | null
          data_desbloqueio?: string | null
          data_perda?: string | null
          estilo_preferido?: string | null
          etapa_marcenaria?: string
          feedback_cliente?: string | null
          id?: string
          justificativa_perda?: string | null
          mensagem_1_enviada?: boolean | null
          mensagem_1_enviada_em?: string | null
          mensagem_2_enviada?: boolean | null
          mensagem_2_enviada_em?: string | null
          mensagem_3_enviada?: boolean | null
          mensagem_3_enviada_em?: string | null
          motivo_perda_id?: string | null
          observacoes_internas?: string | null
          orcamento_id: string
          projeto_enviado_em?: string | null
          projeto_url?: string | null
          reuniao_agendada_para?: string | null
          reuniao_realizada_em?: string | null
          tem_fotos?: boolean | null
          tem_medidas?: boolean | null
          tem_planta?: boolean | null
          updated_at?: string | null
          valor_contrato?: number | null
          valor_estimado?: number | null
        }
        Update: {
          ambientes_mobiliar?: string[] | null
          bloqueado?: boolean | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          codigo_orcamento?: string | null
          consultor_nome?: string | null
          consultor_responsavel_id?: string | null
          contratado?: boolean | null
          created_at?: string | null
          data_contratacao?: string | null
          data_criacao_lead?: string | null
          data_desbloqueio?: string | null
          data_perda?: string | null
          estilo_preferido?: string | null
          etapa_marcenaria?: string
          feedback_cliente?: string | null
          id?: string
          justificativa_perda?: string | null
          mensagem_1_enviada?: boolean | null
          mensagem_1_enviada_em?: string | null
          mensagem_2_enviada?: boolean | null
          mensagem_2_enviada_em?: string | null
          mensagem_3_enviada?: boolean | null
          mensagem_3_enviada_em?: string | null
          motivo_perda_id?: string | null
          observacoes_internas?: string | null
          orcamento_id?: string
          projeto_enviado_em?: string | null
          projeto_url?: string | null
          reuniao_agendada_para?: string | null
          reuniao_realizada_em?: string | null
          tem_fotos?: boolean | null
          tem_medidas?: boolean | null
          tem_planta?: boolean | null
          updated_at?: string | null
          valor_contrato?: number | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_marcenaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_marcenaria_leads_tags: {
        Row: {
          adicionada_por_id: string | null
          adicionada_por_nome: string | null
          created_at: string
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          adicionada_por_id?: string | null
          adicionada_por_nome?: string | null
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          adicionada_por_id?: string | null
          adicionada_por_nome?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_leads_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_leads_marcenaria_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_marcenaria_notas: {
        Row: {
          conteudo: string
          created_at: string | null
          criado_por_id: string
          criado_por_nome: string
          editada: boolean | null
          id: string
          lead_id: string
          updated_at: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          criado_por_id: string
          criado_por_nome: string
          editada?: boolean | null
          id?: string
          lead_id: string
          updated_at?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          criado_por_id?: string
          criado_por_nome?: string
          editada?: boolean | null
          id?: string
          lead_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_notas_criado_por_id_fkey"
            columns: ["criado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_notas_criado_por_id_fkey"
            columns: ["criado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_leads_marcenaria_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_marcenaria_tags: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          criado_por_id: string | null
          criado_por_nome: string | null
          id: string
          nome: string
          visivel_para_todos: boolean
        }
        Insert: {
          ativo?: boolean
          cor: string
          created_at?: string
          criado_por_id?: string | null
          criado_por_nome?: string | null
          id?: string
          nome: string
          visivel_para_todos?: boolean
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          criado_por_id?: string | null
          criado_por_nome?: string | null
          id?: string
          nome?: string
          visivel_para_todos?: boolean
        }
        Relationships: []
      }
      crm_marcenaria_tarefas: {
        Row: {
          concluida: boolean | null
          concluida_por_id: string | null
          concluida_por_nome: string | null
          created_at: string
          criado_por_id: string
          criado_por_nome: string
          data_conclusao: string | null
          data_vencimento: string
          descricao: string | null
          id: string
          lead_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          concluida?: boolean | null
          concluida_por_id?: string | null
          concluida_por_nome?: string | null
          created_at?: string
          criado_por_id: string
          criado_por_nome: string
          data_conclusao?: string | null
          data_vencimento: string
          descricao?: string | null
          id?: string
          lead_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          concluida?: boolean | null
          concluida_por_id?: string | null
          concluida_por_nome?: string | null
          created_at?: string
          criado_por_id?: string
          criado_por_nome?: string
          data_conclusao?: string | null
          data_vencimento?: string
          descricao?: string | null
          id?: string
          lead_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "view_leads_marcenaria_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "vw_crm_marcenaria_leads_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notas_orcamentos: {
        Row: {
          conteudo: string
          created_at: string
          criado_por_id: string
          criado_por_nome: string
          editada: boolean | null
          id: string
          orcamento_id: string
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          criado_por_id: string
          criado_por_nome: string
          editada?: boolean | null
          id?: string
          orcamento_id: string
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_por_id?: string
          criado_por_nome?: string
          editada?: boolean | null
          id?: string
          orcamento_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notas_orcamentos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notas_orcamentos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notas_orcamentos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_orcamentos_tags: {
        Row: {
          adicionada_por_id: string | null
          adicionada_por_nome: string | null
          created_at: string
          id: string
          orcamento_id: string
          tag_id: string
        }
        Insert: {
          adicionada_por_id?: string | null
          adicionada_por_nome?: string | null
          created_at?: string
          id?: string
          orcamento_id: string
          tag_id: string
        }
        Update: {
          adicionada_por_id?: string | null
          adicionada_por_nome?: string | null
          created_at?: string
          id?: string
          orcamento_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_orcamentos_tags_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_orcamentos_tags_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_orcamentos_tags_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_orcamentos_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_orcamentos_tarefas: {
        Row: {
          concluida: boolean | null
          concluida_por_id: string | null
          concluida_por_nome: string | null
          created_at: string
          criado_por_id: string
          criado_por_nome: string
          data_conclusao: string | null
          data_vencimento: string
          descricao: string | null
          id: string
          orcamento_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          concluida?: boolean | null
          concluida_por_id?: string | null
          concluida_por_nome?: string | null
          created_at?: string
          criado_por_id: string
          criado_por_nome: string
          data_conclusao?: string | null
          data_vencimento: string
          descricao?: string | null
          id?: string
          orcamento_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          concluida?: boolean | null
          concluida_por_id?: string | null
          concluida_por_nome?: string | null
          created_at?: string
          criado_por_id?: string
          criado_por_nome?: string
          data_conclusao?: string | null
          data_vencimento?: string
          descricao?: string | null
          id?: string
          orcamento_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_orcamentos_tarefas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_orcamentos_tarefas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_orcamentos_tarefas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          criado_por_id: string | null
          criado_por_nome: string | null
          id: string
          nome: string
          visivel_para_todos: boolean
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          criado_por_id?: string | null
          criado_por_nome?: string | null
          id?: string
          nome: string
          visivel_para_todos?: boolean
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          criado_por_id?: string | null
          criado_por_nome?: string | null
          id?: string
          nome?: string
          visivel_para_todos?: boolean
        }
        Relationships: []
      }
      cronograma_obra: {
        Row: {
          categoria: string
          contrato_id: string | null
          created_at: string | null
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio_prevista: string | null
          data_inicio_real: string | null
          fornecedor_id: string | null
          id: string
          item_checklist: string
          item_proposta_id: string | null
          obra_id: string | null
          observacoes: string | null
          ordem: number | null
          porcentagem_conclusao: number | null
          status: string | null
          updated_at: string | null
          valor_item: number | null
        }
        Insert: {
          categoria: string
          contrato_id?: string | null
          created_at?: string | null
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          fornecedor_id?: string | null
          id?: string
          item_checklist: string
          item_proposta_id?: string | null
          obra_id?: string | null
          observacoes?: string | null
          ordem?: number | null
          porcentagem_conclusao?: number | null
          status?: string | null
          updated_at?: string | null
          valor_item?: number | null
        }
        Update: {
          categoria?: string
          contrato_id?: string | null
          created_at?: string | null
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          fornecedor_id?: string | null
          id?: string
          item_checklist?: string
          item_proposta_id?: string | null
          obra_id?: string | null
          observacoes?: string | null
          ordem?: number | null
          porcentagem_conclusao?: number | null
          status?: string | null
          updated_at?: string | null
          valor_item?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_obra_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_obra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_obra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "cronograma_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_checklist_semana_zero: {
        Row: {
          boas_vindas_enviada: boolean
          concluido: boolean
          concluido_por_id: string | null
          concluido_por_nome: string | null
          created_at: string
          cs_fornecedor_id: string
          data_conclusao: string | null
          documentos_solicitados: boolean
          grupo_whatsapp_criado: boolean
          id: string
          material_educativo_enviado: boolean
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          boas_vindas_enviada?: boolean
          concluido?: boolean
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          created_at?: string
          cs_fornecedor_id: string
          data_conclusao?: string | null
          documentos_solicitados?: boolean
          grupo_whatsapp_criado?: boolean
          id?: string
          material_educativo_enviado?: boolean
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          boas_vindas_enviada?: boolean
          concluido?: boolean
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          created_at?: string
          cs_fornecedor_id?: string
          data_conclusao?: string | null
          documentos_solicitados?: boolean
          grupo_whatsapp_criado?: boolean
          id?: string
          material_educativo_enviado?: boolean
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_checklist_semana_zero_cs_fornecedor_id_fkey"
            columns: ["cs_fornecedor_id"]
            isOneToOne: true
            referencedRelation: "cs_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_etapas_config: {
        Row: {
          ativo: boolean
          cor: string
          cor_texto: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          tipo_flag: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          cor_texto?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          tipo_flag?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          cor_texto?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          tipo_flag?: string
          updated_at?: string
        }
        Relationships: []
      }
      cs_fornecedores: {
        Row: {
          created_at: string
          cs_responsavel_id: string | null
          data_inicio_acompanhamento: string
          etapa_atual_id: string | null
          fornecedor_id: string
          id: string
          observacoes: string | null
          semana_atual: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cs_responsavel_id?: string | null
          data_inicio_acompanhamento?: string
          etapa_atual_id?: string | null
          fornecedor_id: string
          id?: string
          observacoes?: string | null
          semana_atual?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cs_responsavel_id?: string | null
          data_inicio_acompanhamento?: string
          etapa_atual_id?: string | null
          fornecedor_id?: string
          id?: string
          observacoes?: string | null
          semana_atual?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_fornecedores_cs_responsavel_id_fkey"
            columns: ["cs_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_fornecedores_cs_responsavel_id_fkey"
            columns: ["cs_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "cs_fornecedores_etapa_atual_id_fkey"
            columns: ["etapa_atual_id"]
            isOneToOne: false
            referencedRelation: "cs_etapas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      cs_historico_pipeline: {
        Row: {
          cs_fornecedor_id: string
          data_movimentacao: string
          etapa_anterior_id: string | null
          etapa_nova_id: string
          id: string
          movido_por_id: string | null
          movido_por_nome: string | null
          observacao: string | null
        }
        Insert: {
          cs_fornecedor_id: string
          data_movimentacao?: string
          etapa_anterior_id?: string | null
          etapa_nova_id: string
          id?: string
          movido_por_id?: string | null
          movido_por_nome?: string | null
          observacao?: string | null
        }
        Update: {
          cs_fornecedor_id?: string
          data_movimentacao?: string
          etapa_anterior_id?: string | null
          etapa_nova_id?: string
          id?: string
          movido_por_id?: string | null
          movido_por_nome?: string | null
          observacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_historico_pipeline_cs_fornecedor_id_fkey"
            columns: ["cs_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "cs_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_historico_pipeline_etapa_anterior_id_fkey"
            columns: ["etapa_anterior_id"]
            isOneToOne: false
            referencedRelation: "cs_etapas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_historico_pipeline_etapa_nova_id_fkey"
            columns: ["etapa_nova_id"]
            isOneToOne: false
            referencedRelation: "cs_etapas_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_historico_pipeline_movido_por_id_fkey"
            columns: ["movido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_historico_pipeline_movido_por_id_fkey"
            columns: ["movido_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      cs_microtreinamentos: {
        Row: {
          ativo: boolean
          conteudo_sugerido: string | null
          created_at: string
          descricao: string | null
          id: string
          semana: number
          titulo: string
        }
        Insert: {
          ativo?: boolean
          conteudo_sugerido?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          semana: number
          titulo: string
        }
        Update: {
          ativo?: boolean
          conteudo_sugerido?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          semana?: number
          titulo?: string
        }
        Relationships: []
      }
      cs_orientacoes_indicadores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          indicador: string
          ordem: number
          titulo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          indicador: string
          ordem?: number
          titulo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          indicador?: string
          ordem?: number
          titulo?: string
        }
        Relationships: []
      }
      cs_planos_acao: {
        Row: {
          concluida: boolean | null
          created_at: string
          descricao_acao: string
          id: string
          ordem: number
          ritual_semanal_id: string
        }
        Insert: {
          concluida?: boolean | null
          created_at?: string
          descricao_acao: string
          id?: string
          ordem?: number
          ritual_semanal_id: string
        }
        Update: {
          concluida?: boolean | null
          created_at?: string
          descricao_acao?: string
          id?: string
          ordem?: number
          ritual_semanal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_planos_acao_ritual_semanal_id_fkey"
            columns: ["ritual_semanal_id"]
            isOneToOne: false
            referencedRelation: "cs_rituais_semanais"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_rituais_semanais: {
        Row: {
          compareceu_reuniao: boolean | null
          concluido: boolean | null
          concluido_por_id: string | null
          concluido_por_nome: string | null
          contratos_fechados: number | null
          created_at: string
          cs_fornecedor_id: string
          data_conclusao: string | null
          feedback_concierge_consultado: boolean | null
          id: string
          inscricoes_orcamentos: number | null
          microtreinamento_id: string | null
          observacao_feedback_concierge: string | null
          observacao_treinamento: string | null
          orcamentos_enviados: number | null
          orientacoes_aplicadas: Json | null
          semana: number
          status_contratos: string | null
          status_inscricoes: string | null
          status_orcamentos: string | null
          status_visitas: string | null
          tipo_feedback_concierge: string | null
          treinamento_aplicado: boolean | null
          updated_at: string
          visitas_realizadas: number | null
        }
        Insert: {
          compareceu_reuniao?: boolean | null
          concluido?: boolean | null
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          contratos_fechados?: number | null
          created_at?: string
          cs_fornecedor_id: string
          data_conclusao?: string | null
          feedback_concierge_consultado?: boolean | null
          id?: string
          inscricoes_orcamentos?: number | null
          microtreinamento_id?: string | null
          observacao_feedback_concierge?: string | null
          observacao_treinamento?: string | null
          orcamentos_enviados?: number | null
          orientacoes_aplicadas?: Json | null
          semana: number
          status_contratos?: string | null
          status_inscricoes?: string | null
          status_orcamentos?: string | null
          status_visitas?: string | null
          tipo_feedback_concierge?: string | null
          treinamento_aplicado?: boolean | null
          updated_at?: string
          visitas_realizadas?: number | null
        }
        Update: {
          compareceu_reuniao?: boolean | null
          concluido?: boolean | null
          concluido_por_id?: string | null
          concluido_por_nome?: string | null
          contratos_fechados?: number | null
          created_at?: string
          cs_fornecedor_id?: string
          data_conclusao?: string | null
          feedback_concierge_consultado?: boolean | null
          id?: string
          inscricoes_orcamentos?: number | null
          microtreinamento_id?: string | null
          observacao_feedback_concierge?: string | null
          observacao_treinamento?: string | null
          orcamentos_enviados?: number | null
          orientacoes_aplicadas?: Json | null
          semana?: number
          status_contratos?: string | null
          status_inscricoes?: string | null
          status_orcamentos?: string | null
          status_visitas?: string | null
          tipo_feedback_concierge?: string | null
          treinamento_aplicado?: boolean | null
          updated_at?: string
          visitas_realizadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cs_rituais_semanais_concluido_por_id_fkey"
            columns: ["concluido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_rituais_semanais_concluido_por_id_fkey"
            columns: ["concluido_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "cs_rituais_semanais_cs_fornecedor_id_fkey"
            columns: ["cs_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "cs_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cs_rituais_semanais_microtreinamento_id_fkey"
            columns: ["microtreinamento_id"]
            isOneToOne: false
            referencedRelation: "cs_microtreinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      depoimentos_fornecedores: {
        Row: {
          ativo: boolean
          cliente_nome: string
          created_at: string
          criado_por_admin: string | null
          data_depoimento: string | null
          depoimento: string
          fornecedor_id: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_nome: string
          created_at?: string
          criado_por_admin?: string | null
          data_depoimento?: string | null
          depoimento: string
          fornecedor_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_nome?: string
          created_at?: string
          criado_por_admin?: string | null
          data_depoimento?: string | null
          depoimento?: string
          fornecedor_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depoimentos_fornecedores_criado_por_admin_fkey"
            columns: ["criado_por_admin"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depoimentos_fornecedores_criado_por_admin_fkey"
            columns: ["criado_por_admin"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "depoimentos_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depoimentos_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      desistencias_propostas: {
        Row: {
          aprovada: boolean | null
          aprovada_por: string | null
          candidatura_id: string
          created_at: string
          data_aprovacao: string | null
          data_solicitacao: string
          fornecedor_id: string
          id: string
          justificativa: string
          motivo_categoria: string
          observacoes_admin: string | null
          penalidade_aplicada: boolean | null
          updated_at: string
        }
        Insert: {
          aprovada?: boolean | null
          aprovada_por?: string | null
          candidatura_id: string
          created_at?: string
          data_aprovacao?: string | null
          data_solicitacao?: string
          fornecedor_id: string
          id?: string
          justificativa: string
          motivo_categoria: string
          observacoes_admin?: string | null
          penalidade_aplicada?: boolean | null
          updated_at?: string
        }
        Update: {
          aprovada?: boolean | null
          aprovada_por?: string | null
          candidatura_id?: string
          created_at?: string
          data_aprovacao?: string | null
          data_solicitacao?: string
          fornecedor_id?: string
          id?: string
          justificativa?: string
          motivo_categoria?: string
          observacoes_admin?: string | null
          penalidade_aplicada?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "desistencias_propostas_aprovada_por_fkey"
            columns: ["aprovada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desistencias_propostas_aprovada_por_fkey"
            columns: ["aprovada_por"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "desistencias_propostas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desistencias_propostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desistencias_propostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      diario_obra: {
        Row: {
          atividades_realizadas: string
          clima: string | null
          contrato_id: string | null
          created_at: string | null
          data_registro: string
          fornecedor_id: string | null
          fotos: Json | null
          funcionarios_presentes: string | null
          id: string
          materiais_utilizados: string | null
          observacoes: string | null
          updated_at: string | null
          visivel_cliente: boolean | null
        }
        Insert: {
          atividades_realizadas: string
          clima?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_registro: string
          fornecedor_id?: string | null
          fotos?: Json | null
          funcionarios_presentes?: string | null
          id?: string
          materiais_utilizados?: string | null
          observacoes?: string | null
          updated_at?: string | null
          visivel_cliente?: boolean | null
        }
        Update: {
          atividades_realizadas?: string
          clima?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_registro?: string
          fornecedor_id?: string | null
          fotos?: Json | null
          funcionarios_presentes?: string | null
          id?: string
          materiais_utilizados?: string | null
          observacoes?: string | null
          updated_at?: string | null
          visivel_cliente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_obra_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_obra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_obra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      fechamentos_caixa: {
        Row: {
          conta_bancaria_id: string
          created_at: string
          data_fechamento: string
          id: string
          observacoes: string | null
          saldo_final: number
          saldo_inicial: number
          status: string
          total_movimentacoes: number
          updated_at: string
          usuario_fechamento_id: string
        }
        Insert: {
          conta_bancaria_id: string
          created_at?: string
          data_fechamento: string
          id?: string
          observacoes?: string | null
          saldo_final?: number
          saldo_inicial?: number
          status?: string
          total_movimentacoes?: number
          updated_at?: string
          usuario_fechamento_id: string
        }
        Update: {
          conta_bancaria_id?: string
          created_at?: string
          data_fechamento?: string
          id?: string
          observacoes?: string | null
          saldo_final?: number
          saldo_inicial?: number
          status?: string
          total_movimentacoes?: number
          updated_at?: string
          usuario_fechamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_caixa_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_dados_homologacao: {
        Row: {
          cnpj: string
          created_at: string
          email: string
          endereco_completo: string
          forma_pagamento: string
          fornecedor_id: string
          id: string
          telefone: string
          updated_at: string
          vigencia_contrato: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          email: string
          endereco_completo: string
          forma_pagamento: string
          fornecedor_id: string
          id?: string
          telefone: string
          updated_at?: string
          vigencia_contrato: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          email?: string
          endereco_completo?: string
          forma_pagamento?: string
          fornecedor_id?: string
          id?: string
          telefone?: string
          updated_at?: string
          vigencia_contrato?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_dados_homologacao_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_dados_homologacao_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      fornecedor_documentos_homologacao: {
        Row: {
          caminho_storage: string
          created_at: string
          fornecedor_id: string
          id: string
          nome_arquivo: string
          tipo_documento: string
          uploaded_by: string | null
        }
        Insert: {
          caminho_storage: string
          created_at?: string
          fornecedor_id: string
          id?: string
          nome_arquivo: string
          tipo_documento: string
          uploaded_by?: string | null
        }
        Update: {
          caminho_storage?: string
          created_at?: string
          fornecedor_id?: string
          id?: string
          nome_arquivo?: string
          tipo_documento?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_documentos_homologacao_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_documentos_homologacao_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      fornecedores_clientes: {
        Row: {
          ativo: boolean
          created_at: string
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores_importacao: {
        Row: {
          created_at: string | null
          data_termino_contrato: string | null
          email: string
          empresa: string | null
          erro_message: string | null
          id: string
          importacao_id: string | null
          limite_acessos_diarios: number | null
          limite_acessos_mensais: number | null
          linha_excel: number
          nome: string
          status: string | null
          telefone: string | null
          tentativas_email: number | null
          ultimo_envio_email: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_termino_contrato?: string | null
          email: string
          empresa?: string | null
          erro_message?: string | null
          id?: string
          importacao_id?: string | null
          limite_acessos_diarios?: number | null
          limite_acessos_mensais?: number | null
          linha_excel: number
          nome: string
          status?: string | null
          telefone?: string | null
          tentativas_email?: number | null
          ultimo_envio_email?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_termino_contrato?: string | null
          email?: string
          empresa?: string | null
          erro_message?: string | null
          id?: string
          importacao_id?: string | null
          limite_acessos_diarios?: number | null
          limite_acessos_mensais?: number | null
          linha_excel?: number
          nome?: string
          status?: string | null
          telefone?: string | null
          tentativas_email?: number | null
          ultimo_envio_email?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_importacao_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_canais_origem: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      funil_reunioes: {
        Row: {
          caixa_coletado: number
          canal_origem_id: string | null
          closer_id: string
          created_at: string
          data_agendada: string
          faturamento_gerado: number
          id: string
          nome: string
          observacoes_closer: string | null
          observacoes_pre_vendas: string | null
          pre_vendas_id: string
          status: Database["public"]["Enums"]["funil_reuniao_status"]
          teve_pitch: boolean
          teve_venda: boolean
          updated_at: string
        }
        Insert: {
          caixa_coletado?: number
          canal_origem_id?: string | null
          closer_id: string
          created_at?: string
          data_agendada: string
          faturamento_gerado?: number
          id?: string
          nome: string
          observacoes_closer?: string | null
          observacoes_pre_vendas?: string | null
          pre_vendas_id: string
          status?: Database["public"]["Enums"]["funil_reuniao_status"]
          teve_pitch?: boolean
          teve_venda?: boolean
          updated_at?: string
        }
        Update: {
          caixa_coletado?: number
          canal_origem_id?: string | null
          closer_id?: string
          created_at?: string
          data_agendada?: string
          faturamento_gerado?: number
          id?: string
          nome?: string
          observacoes_closer?: string | null
          observacoes_pre_vendas?: string | null
          pre_vendas_id?: string
          status?: Database["public"]["Enums"]["funil_reuniao_status"]
          teve_pitch?: boolean
          teve_venda?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funil_reunioes_canal_origem_id_fkey"
            columns: ["canal_origem_id"]
            isOneToOne: false
            referencedRelation: "funil_canais_origem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_reunioes_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_reunioes_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "funil_reunioes_pre_vendas_id_fkey"
            columns: ["pre_vendas_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_reunioes_pre_vendas_id_fkey"
            columns: ["pre_vendas_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      funil_vendas_metas: {
        Row: {
          ano: number
          closer_id: string | null
          created_at: string
          criado_por_id: string | null
          id: string
          mes: number
          meta_caixa: number
          meta_faturamento: number
          meta_leads: number
          meta_ligacoes: number
          meta_mql: number
          meta_pitchs: number
          meta_reunioes_agendadas: number
          meta_reunioes_iniciadas: number
          meta_vendas: number
          updated_at: string
        }
        Insert: {
          ano: number
          closer_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          id?: string
          mes: number
          meta_caixa?: number
          meta_faturamento?: number
          meta_leads?: number
          meta_ligacoes?: number
          meta_mql?: number
          meta_pitchs?: number
          meta_reunioes_agendadas?: number
          meta_reunioes_iniciadas?: number
          meta_vendas?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          closer_id?: string | null
          created_at?: string
          criado_por_id?: string | null
          id?: string
          mes?: number
          meta_caixa?: number
          meta_faturamento?: number
          meta_leads?: number
          meta_ligacoes?: number
          meta_mql?: number
          meta_pitchs?: number
          meta_reunioes_agendadas?: number
          meta_reunioes_iniciadas?: number
          meta_vendas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funil_vendas_metas_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_vendas_metas_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "funil_vendas_metas_criado_por_id_fkey"
            columns: ["criado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_vendas_metas_criado_por_id_fkey"
            columns: ["criado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      funil_vendas_registros: {
        Row: {
          caixa_coletado: number
          closer_id: string
          created_at: string
          data: string
          faturamento_gerado: number
          id: string
          leads_entrada: number
          ligacoes_realizadas: number
          mql: number
          observacoes: string | null
          pitchs_realizados: number
          reunioes_agendadas: number
          reunioes_iniciadas: number
          updated_at: string
          vendas: number
        }
        Insert: {
          caixa_coletado?: number
          closer_id: string
          created_at?: string
          data: string
          faturamento_gerado?: number
          id?: string
          leads_entrada?: number
          ligacoes_realizadas?: number
          mql?: number
          observacoes?: string | null
          pitchs_realizados?: number
          reunioes_agendadas?: number
          reunioes_iniciadas?: number
          updated_at?: string
          vendas?: number
        }
        Update: {
          caixa_coletado?: number
          closer_id?: string
          created_at?: string
          data?: string
          faturamento_gerado?: number
          id?: string
          leads_entrada?: number
          ligacoes_realizadas?: number
          mql?: number
          observacoes?: string | null
          pitchs_realizados?: number
          reunioes_agendadas?: number
          reunioes_iniciadas?: number
          updated_at?: string
          vendas?: number
        }
        Relationships: [
          {
            foreignKeyName: "funil_vendas_registros_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_vendas_registros_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      gestor_fila_controle: {
        Row: {
          id: string
          ultimo_gestor_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          ultimo_gestor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          ultimo_gestor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gestor_fila_controle_ultimo_gestor_id_fkey"
            columns: ["ultimo_gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestor_fila_controle_ultimo_gestor_id_fkey"
            columns: ["ultimo_gestor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      historico_exclusao_contas: {
        Row: {
          cliente_fornecedor: string
          conta_id: string
          created_at: string | null
          data_exclusao: string | null
          data_vencimento: string
          descricao: string
          excluido_por: string | null
          excluido_por_nome: string | null
          id: string
          motivo_exclusao: string
          observacao_exclusao: string | null
          tipo_conta: string
          valor_original: number
        }
        Insert: {
          cliente_fornecedor: string
          conta_id: string
          created_at?: string | null
          data_exclusao?: string | null
          data_vencimento: string
          descricao: string
          excluido_por?: string | null
          excluido_por_nome?: string | null
          id?: string
          motivo_exclusao: string
          observacao_exclusao?: string | null
          tipo_conta: string
          valor_original: number
        }
        Update: {
          cliente_fornecedor?: string
          conta_id?: string
          created_at?: string | null
          data_exclusao?: string | null
          data_vencimento?: string
          descricao?: string
          excluido_por?: string | null
          excluido_por_nome?: string | null
          id?: string
          motivo_exclusao?: string
          observacao_exclusao?: string | null
          tipo_conta?: string
          valor_original?: number
        }
        Relationships: []
      }
      horarios_visita_orcamento: {
        Row: {
          candidatura_id: string | null
          created_at: string
          data_hora: string
          fornecedor_id: string | null
          id: string
          orcamento_id: string
          reservado_em: string | null
        }
        Insert: {
          candidatura_id?: string | null
          created_at?: string
          data_hora: string
          fornecedor_id?: string | null
          id?: string
          orcamento_id: string
          reservado_em?: string | null
        }
        Update: {
          candidatura_id?: string | null
          created_at?: string
          data_hora?: string
          fornecedor_id?: string | null
          id?: string
          orcamento_id?: string
          reservado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horarios_visita_orcamento_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_visita_orcamento_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_visita_orcamento_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "horarios_visita_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_visita_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horarios_visita_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes_fornecedores: {
        Row: {
          configuracao_lote: Json | null
          created_at: string | null
          id: string
          nome_arquivo: string
          registros_erro: number | null
          registros_processados: number | null
          registros_sucesso: number | null
          status: string | null
          total_registros: number
          updated_at: string | null
          usuario_admin_id: string | null
        }
        Insert: {
          configuracao_lote?: Json | null
          created_at?: string | null
          id?: string
          nome_arquivo: string
          registros_erro?: number | null
          registros_processados?: number | null
          registros_sucesso?: number | null
          status?: string | null
          total_registros: number
          updated_at?: string | null
          usuario_admin_id?: string | null
        }
        Update: {
          configuracao_lote?: Json | null
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          registros_erro?: number | null
          registros_processados?: number | null
          registros_sucesso?: number | null
          status?: string | null
          total_registros?: number
          updated_at?: string | null
          usuario_admin_id?: string | null
        }
        Relationships: []
      }
      inscricoes_fornecedores: {
        Row: {
          data_inscricao: string
          email: string
          empresa: string
          fornecedor_id: string | null
          id: string
          nome: string
          orcamento_id: string | null
          status_acompanhamento:
            | Database["public"]["Enums"]["status_acompanhamento_enum"]
            | null
          telefone: string
        }
        Insert: {
          data_inscricao?: string
          email: string
          empresa: string
          fornecedor_id?: string | null
          id?: string
          nome: string
          orcamento_id?: string | null
          status_acompanhamento?:
            | Database["public"]["Enums"]["status_acompanhamento_enum"]
            | null
          telefone: string
        }
        Update: {
          data_inscricao?: string
          email?: string
          empresa?: string
          fornecedor_id?: string | null
          id?: string
          nome?: string
          orcamento_id?: string | null
          status_acompanhamento?:
            | Database["public"]["Enums"]["status_acompanhamento_enum"]
            | null
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_fornecedores_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_extras_personalizados: {
        Row: {
          categoria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      logs_acesso: {
        Row: {
          acao: string
          data_acesso: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          data_acesso?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          data_acesso?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_acesso_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_acesso_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      mapeamento_status_etapa_crm: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          etapa_crm_destino: string
          id: string
          ordem_prioridade: number
          status_fornecedor: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          etapa_crm_destino: string
          id?: string
          ordem_prioridade: number
          status_fornecedor: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          etapa_crm_destino?: string
          id?: string
          ordem_prioridade?: number
          status_fornecedor?: string
        }
        Relationships: []
      }
      medicoes_itens: {
        Row: {
          created_at: string
          id: string
          item_checklist_id: string
          medicao_id: string
          observacoes: string | null
          percentual_acumulado: number
          percentual_executado: number
          updated_at: string
          valor_item_medicao: number
          valor_item_original: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_checklist_id: string
          medicao_id: string
          observacoes?: string | null
          percentual_acumulado?: number
          percentual_executado?: number
          updated_at?: string
          valor_item_medicao?: number
          valor_item_original?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_checklist_id?: string
          medicao_id?: string
          observacoes?: string | null
          percentual_acumulado?: number
          percentual_executado?: number
          updated_at?: string
          valor_item_medicao?: number
          valor_item_original?: number
        }
        Relationships: []
      }
      medicoes_obra: {
        Row: {
          arquivos_comprobatorios: Json | null
          baseado_em_itens: boolean | null
          contrato_id: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_medicao: string
          data_pagamento: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          numero_medicao: number
          observacoes_cliente: string | null
          observacoes_fornecedor: string | null
          proposta_base_id: string | null
          status: string | null
          updated_at: string | null
          valor_medicao: number
        }
        Insert: {
          arquivos_comprobatorios?: Json | null
          baseado_em_itens?: boolean | null
          contrato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_medicao: string
          data_pagamento?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_medicao: number
          observacoes_cliente?: string | null
          observacoes_fornecedor?: string | null
          proposta_base_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor_medicao: number
        }
        Update: {
          arquivos_comprobatorios?: Json | null
          baseado_em_itens?: boolean | null
          contrato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_medicao?: string
          data_pagamento?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_medicao?: number
          observacoes_cliente?: string | null
          observacoes_fornecedor?: string | null
          proposta_base_id?: string | null
          status?: string | null
          updated_at?: string | null
          valor_medicao?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_obra_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_obra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_obra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      metas_checklist_concierge: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          meta_itens_diarios: number
          nivel_concierge: string | null
          taxa_produtividade: number | null
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          meta_itens_diarios?: number
          nivel_concierge?: string | null
          taxa_produtividade?: number | null
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          meta_itens_diarios?: number
          nivel_concierge?: string | null
          taxa_produtividade?: number | null
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_checklist_concierge_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_checklist_concierge_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      metas_saude_empresa: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          fat_comissoes_meta_mensal: number | null
          fat_comissoes_meta_semanal: number | null
          fat_fornecedores_meta_mensal: number | null
          fat_fornecedores_meta_semanal: number | null
          id: string
          publicacoes_meta_mensal: number | null
          publicacoes_meta_semanal: number | null
          reunioes_meta_mensal: number | null
          reunioes_meta_semanal: number | null
          tarefas_meta_mensal: number | null
          tarefas_meta_semanal: number | null
          updated_at: string | null
          vigente_a_partir_de: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          fat_comissoes_meta_mensal?: number | null
          fat_comissoes_meta_semanal?: number | null
          fat_fornecedores_meta_mensal?: number | null
          fat_fornecedores_meta_semanal?: number | null
          id?: string
          publicacoes_meta_mensal?: number | null
          publicacoes_meta_semanal?: number | null
          reunioes_meta_mensal?: number | null
          reunioes_meta_semanal?: number | null
          tarefas_meta_mensal?: number | null
          tarefas_meta_semanal?: number | null
          updated_at?: string | null
          vigente_a_partir_de?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          fat_comissoes_meta_mensal?: number | null
          fat_comissoes_meta_semanal?: number | null
          fat_fornecedores_meta_mensal?: number | null
          fat_fornecedores_meta_semanal?: number | null
          id?: string
          publicacoes_meta_mensal?: number | null
          publicacoes_meta_semanal?: number | null
          reunioes_meta_mensal?: number | null
          reunioes_meta_semanal?: number | null
          tarefas_meta_mensal?: number | null
          tarefas_meta_semanal?: number | null
          updated_at?: string | null
          vigente_a_partir_de?: string
        }
        Relationships: []
      }
      motivos_perda_crm: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      motivos_perda_financeiro: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      motivos_perda_marcenaria: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      movimentacoes_bancarias: {
        Row: {
          conciliado: boolean
          conta_bancaria_id: string
          created_at: string
          data_movimentacao: string
          descricao: string
          id: string
          origem_id: string | null
          origem_tipo: string | null
          tipo: string
          valor: number
        }
        Insert: {
          conciliado?: boolean
          conta_bancaria_id: string
          created_at?: string
          data_movimentacao: string
          descricao: string
          id?: string
          origem_id?: string | null
          origem_tipo?: string | null
          tipo: string
          valor: number
        }
        Update: {
          conciliado?: boolean
          conta_bancaria_id?: string
          created_at?: string
          data_movimentacao?: string
          descricao?: string
          id?: string
          origem_id?: string | null
          origem_tipo?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_bancarias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_sistema: {
        Row: {
          created_at: string
          dados_extras: Json | null
          data_criacao: string
          id: string
          lida: boolean
          mensagem: string
          referencia_id: string | null
          tipo: string
          tipo_referencia: string | null
          titulo: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          dados_extras?: Json | null
          data_criacao?: string
          id?: string
          lida?: boolean
          mensagem: string
          referencia_id?: string | null
          tipo: string
          tipo_referencia?: string | null
          titulo: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          dados_extras?: Json | null
          data_criacao?: string
          id?: string
          lida?: boolean
          mensagem?: string
          referencia_id?: string | null
          tipo?: string
          tipo_referencia?: string | null
          titulo?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          cliente_id: string
          contrato_id: string | null
          created_at: string
          cronograma_inicial_aprovado: boolean
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio: string | null
          endereco_obra: Json
          fornecedor_id: string
          id: string
          observacoes: string | null
          orcamento_id: string | null
          porcentagem_conclusao: number | null
          proposta_id: string | null
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          cronograma_inicial_aprovado?: boolean
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio?: string | null
          endereco_obra: Json
          fornecedor_id: string
          id?: string
          observacoes?: string | null
          orcamento_id?: string | null
          porcentagem_conclusao?: number | null
          proposta_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          cronograma_inicial_aprovado?: boolean
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio?: string | null
          endereco_obra?: Json
          fornecedor_id?: string
          id?: string
          observacoes?: string | null
          orcamento_id?: string | null
          porcentagem_conclusao?: number | null
          proposta_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "obras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          budget_informado: number | null
          categorias: string[]
          codigo_orcamento: string | null
          created_at: string
          dados_contato: Json | null
          data_fechamento_manual: string | null
          data_inicio: string | null
          data_liberacao_fornecedores: string | null
          data_publicacao: string
          fechado_manualmente: boolean | null
          fechado_por_id: string | null
          gestor_conta_id: string | null
          id: string
          local: string
          motivo_fechamento_manual: string | null
          necessidade: string
          prazo_envio_proposta_dias: number | null
          prazo_explicitamente_definido: boolean | null
          prazo_inicio_texto: string | null
          produto_segmentacao_id: string | null
          quantidade_empresas: number | null
          status: string | null
          tamanho_imovel: number | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          budget_informado?: number | null
          categorias: string[]
          codigo_orcamento?: string | null
          created_at?: string
          dados_contato?: Json | null
          data_fechamento_manual?: string | null
          data_inicio?: string | null
          data_liberacao_fornecedores?: string | null
          data_publicacao?: string
          fechado_manualmente?: boolean | null
          fechado_por_id?: string | null
          gestor_conta_id?: string | null
          id?: string
          local: string
          motivo_fechamento_manual?: string | null
          necessidade: string
          prazo_envio_proposta_dias?: number | null
          prazo_explicitamente_definido?: boolean | null
          prazo_inicio_texto?: string | null
          produto_segmentacao_id?: string | null
          quantidade_empresas?: number | null
          status?: string | null
          tamanho_imovel?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          budget_informado?: number | null
          categorias?: string[]
          codigo_orcamento?: string | null
          created_at?: string
          dados_contato?: Json | null
          data_fechamento_manual?: string | null
          data_inicio?: string | null
          data_liberacao_fornecedores?: string | null
          data_publicacao?: string
          fechado_manualmente?: boolean | null
          fechado_por_id?: string | null
          gestor_conta_id?: string | null
          id?: string
          local?: string
          motivo_fechamento_manual?: string | null
          necessidade?: string
          prazo_envio_proposta_dias?: number | null
          prazo_explicitamente_definido?: boolean | null
          prazo_inicio_texto?: string | null
          produto_segmentacao_id?: string | null
          quantidade_empresas?: number | null
          status?: string | null
          tamanho_imovel?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_fechado_por_id_fkey"
            columns: ["fechado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_fechado_por_id_fkey"
            columns: ["fechado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "orcamentos_gestor_conta_id_fkey"
            columns: ["gestor_conta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_gestor_conta_id_fkey"
            columns: ["gestor_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "orcamentos_produto_segmentacao_id_fkey"
            columns: ["produto_segmentacao_id"]
            isOneToOne: false
            referencedRelation: "produtos_segmentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_checklist_itens: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          obrigatorio: boolean | null
          orcamento_id: string
          origem: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          obrigatorio?: boolean | null
          orcamento_id: string
          origem?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          obrigatorio?: boolean | null
          orcamento_id?: string
          origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_checklist_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_checklist_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_checklist_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_checklist_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_crm_historico: {
        Row: {
          data_movimentacao: string | null
          etapa_anterior: Database["public"]["Enums"]["etapa_crm_enum"] | null
          etapa_nova: Database["public"]["Enums"]["etapa_crm_enum"]
          id: string
          movido_por_id: string
          movido_por_nome: string
          observacao: string | null
          orcamento_id: string
          tipo_movimentacao: string | null
        }
        Insert: {
          data_movimentacao?: string | null
          etapa_anterior?: Database["public"]["Enums"]["etapa_crm_enum"] | null
          etapa_nova: Database["public"]["Enums"]["etapa_crm_enum"]
          id?: string
          movido_por_id: string
          movido_por_nome: string
          observacao?: string | null
          orcamento_id: string
          tipo_movimentacao?: string | null
        }
        Update: {
          data_movimentacao?: string | null
          etapa_anterior?: Database["public"]["Enums"]["etapa_crm_enum"] | null
          etapa_nova?: Database["public"]["Enums"]["etapa_crm_enum"]
          id?: string
          movido_por_id?: string
          movido_por_nome?: string
          observacao?: string | null
          orcamento_id?: string
          tipo_movimentacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_crm_historico_movido_por_id_fkey"
            columns: ["movido_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_historico_movido_por_id_fkey"
            columns: ["movido_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "orcamentos_crm_historico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_historico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_historico_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_crm_tracking: {
        Row: {
          concierge_responsavel_id: string | null
          congelado: boolean | null
          created_at: string | null
          data_conclusao: string | null
          data_congelamento: string | null
          data_entrada_etapa: string | null
          data_entrada_etapa_atual: string | null
          data_reativacao_prevista: string | null
          etapa_crm: Database["public"]["Enums"]["etapa_crm_enum"]
          feedback_cliente_comentario: string | null
          feedback_cliente_nota: number | null
          id: string
          itens_checklist_concluidos: number | null
          justificativa_perda: string | null
          motivo_congelamento: string | null
          motivo_perda_id: string | null
          observacoes_internas: string | null
          orcamento_id: string
          status_contato:
            | Database["public"]["Enums"]["status_contato_enum"]
            | null
          tem_alertas_pendentes: boolean | null
          total_itens_checklist: number | null
          updated_at: string | null
          valor_lead_estimado: number | null
        }
        Insert: {
          concierge_responsavel_id?: string | null
          congelado?: boolean | null
          created_at?: string | null
          data_conclusao?: string | null
          data_congelamento?: string | null
          data_entrada_etapa?: string | null
          data_entrada_etapa_atual?: string | null
          data_reativacao_prevista?: string | null
          etapa_crm?: Database["public"]["Enums"]["etapa_crm_enum"]
          feedback_cliente_comentario?: string | null
          feedback_cliente_nota?: number | null
          id?: string
          itens_checklist_concluidos?: number | null
          justificativa_perda?: string | null
          motivo_congelamento?: string | null
          motivo_perda_id?: string | null
          observacoes_internas?: string | null
          orcamento_id: string
          status_contato?:
            | Database["public"]["Enums"]["status_contato_enum"]
            | null
          tem_alertas_pendentes?: boolean | null
          total_itens_checklist?: number | null
          updated_at?: string | null
          valor_lead_estimado?: number | null
        }
        Update: {
          concierge_responsavel_id?: string | null
          congelado?: boolean | null
          created_at?: string | null
          data_conclusao?: string | null
          data_congelamento?: string | null
          data_entrada_etapa?: string | null
          data_entrada_etapa_atual?: string | null
          data_reativacao_prevista?: string | null
          etapa_crm?: Database["public"]["Enums"]["etapa_crm_enum"]
          feedback_cliente_comentario?: string | null
          feedback_cliente_nota?: number | null
          id?: string
          itens_checklist_concluidos?: number | null
          justificativa_perda?: string | null
          motivo_congelamento?: string | null
          motivo_perda_id?: string | null
          observacoes_internas?: string | null
          orcamento_id?: string
          status_contato?:
            | Database["public"]["Enums"]["status_contato_enum"]
            | null
          tem_alertas_pendentes?: boolean | null
          total_itens_checklist?: number | null
          updated_at?: string | null
          valor_lead_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_crm_tracking_concierge_responsavel_id_fkey"
            columns: ["concierge_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_concierge_responsavel_id_fkey"
            columns: ["concierge_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_motivo_perda_crm_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: true
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      penalidades_fornecedores: {
        Row: {
          aplicada_por: string | null
          ativo: boolean
          created_at: string
          data_aplicacao: string
          data_expiracao: string
          desistencia_id: string | null
          duracao_dias: number
          fornecedor_id: string
          id: string
          limite_original: number | null
          observacoes: string | null
          tipo_penalidade: string
          updated_at: string
        }
        Insert: {
          aplicada_por?: string | null
          ativo?: boolean
          created_at?: string
          data_aplicacao?: string
          data_expiracao: string
          desistencia_id?: string | null
          duracao_dias?: number
          fornecedor_id: string
          id?: string
          limite_original?: number | null
          observacoes?: string | null
          tipo_penalidade: string
          updated_at?: string
        }
        Update: {
          aplicada_por?: string | null
          ativo?: boolean
          created_at?: string
          data_aplicacao?: string
          data_expiracao?: string
          desistencia_id?: string | null
          duracao_dias?: number
          fornecedor_id?: string
          id?: string
          limite_original?: number | null
          observacoes?: string | null
          tipo_penalidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalidades_fornecedores_aplicada_por_fkey"
            columns: ["aplicada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalidades_fornecedores_aplicada_por_fkey"
            columns: ["aplicada_por"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "penalidades_fornecedores_desistencia_id_fkey"
            columns: ["desistencia_id"]
            isOneToOne: false
            referencedRelation: "desistencias_propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalidades_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalidades_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      portfolios_fornecedores: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          data_projeto: string | null
          descricao: string | null
          fornecedor_id: string
          id: string
          imagem_url: string | null
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          data_projeto?: string | null
          descricao?: string | null
          fornecedor_id: string
          id?: string
          imagem_url?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          data_projeto?: string | null
          descricao?: string | null
          fornecedor_id?: string
          id?: string
          imagem_url?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolios_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      produtos_segmentacao: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acessos_diarios: number | null
          acessos_mensais: number | null
          bloqueado_ate: string | null
          candidaturas_diarias: number | null
          candidaturas_mensais: number | null
          created_at: string
          data_criacao: string | null
          data_inicio_contrato: string | null
          data_termino_contrato: string | null
          descricao_fornecedor: string | null
          email: string | null
          empresa: string | null
          endereco: string | null
          id: string
          limite_acessos_diarios: number | null
          limite_acessos_mensais: number | null
          limite_candidaturas_diarias: number | null
          limite_candidaturas_mensais: number | null
          limite_propostas_abertas: number | null
          logo_url: string | null
          must_change_password: boolean | null
          nome: string | null
          penalidades_ativas: number | null
          produto_segmentacao_id: string | null
          site_url: string | null
          status: string | null
          telefone: string | null
          tipo_usuario: string
          ultimo_acesso_candidatura_diario: string | null
          ultimo_acesso_candidatura_mensal: string | null
          ultimo_acesso_diario: string | null
          ultimo_acesso_mensal: string | null
          ultimo_login: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          acessos_diarios?: number | null
          acessos_mensais?: number | null
          bloqueado_ate?: string | null
          candidaturas_diarias?: number | null
          candidaturas_mensais?: number | null
          created_at?: string
          data_criacao?: string | null
          data_inicio_contrato?: string | null
          data_termino_contrato?: string | null
          descricao_fornecedor?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id: string
          limite_acessos_diarios?: number | null
          limite_acessos_mensais?: number | null
          limite_candidaturas_diarias?: number | null
          limite_candidaturas_mensais?: number | null
          limite_propostas_abertas?: number | null
          logo_url?: string | null
          must_change_password?: boolean | null
          nome?: string | null
          penalidades_ativas?: number | null
          produto_segmentacao_id?: string | null
          site_url?: string | null
          status?: string | null
          telefone?: string | null
          tipo_usuario?: string
          ultimo_acesso_candidatura_diario?: string | null
          ultimo_acesso_candidatura_mensal?: string | null
          ultimo_acesso_diario?: string | null
          ultimo_acesso_mensal?: string | null
          ultimo_login?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          acessos_diarios?: number | null
          acessos_mensais?: number | null
          bloqueado_ate?: string | null
          candidaturas_diarias?: number | null
          candidaturas_mensais?: number | null
          created_at?: string
          data_criacao?: string | null
          data_inicio_contrato?: string | null
          data_termino_contrato?: string | null
          descricao_fornecedor?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id?: string
          limite_acessos_diarios?: number | null
          limite_acessos_mensais?: number | null
          limite_candidaturas_diarias?: number | null
          limite_candidaturas_mensais?: number | null
          limite_propostas_abertas?: number | null
          logo_url?: string | null
          must_change_password?: boolean | null
          nome?: string | null
          penalidades_ativas?: number | null
          produto_segmentacao_id?: string | null
          site_url?: string | null
          status?: string | null
          telefone?: string | null
          tipo_usuario?: string
          ultimo_acesso_candidatura_diario?: string | null
          ultimo_acesso_candidatura_mensal?: string | null
          ultimo_acesso_diario?: string | null
          ultimo_acesso_mensal?: string | null
          ultimo_login?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_produto_segmentacao_id_fkey"
            columns: ["produto_segmentacao_id"]
            isOneToOne: false
            referencedRelation: "produtos_segmentacao"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_analises_ia: {
        Row: {
          analise_completa: Json | null
          candidatura_id: string
          created_at: string
          fornecedor_id: string
          id: string
          orcamento_id: string
          pontos_atencao: Json | null
          pontos_fortes: Json | null
          posicionamento: string | null
          propostas_arquivo_id: string | null
          raw_response: string | null
          status: string
          valor_proposta: number | null
          valor_referencia_mercado: number | null
        }
        Insert: {
          analise_completa?: Json | null
          candidatura_id: string
          created_at?: string
          fornecedor_id: string
          id?: string
          orcamento_id: string
          pontos_atencao?: Json | null
          pontos_fortes?: Json | null
          posicionamento?: string | null
          propostas_arquivo_id?: string | null
          raw_response?: string | null
          status?: string
          valor_proposta?: number | null
          valor_referencia_mercado?: number | null
        }
        Update: {
          analise_completa?: Json | null
          candidatura_id?: string
          created_at?: string
          fornecedor_id?: string
          id?: string
          orcamento_id?: string
          pontos_atencao?: Json | null
          pontos_fortes?: Json | null
          posicionamento?: string | null
          propostas_arquivo_id?: string | null
          raw_response?: string | null
          status?: string
          valor_proposta?: number | null
          valor_referencia_mercado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_analises_ia_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_analises_ia_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_analises_ia_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_analises_ia_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_analises_ia_propostas_arquivo_id_fkey"
            columns: ["propostas_arquivo_id"]
            isOneToOne: false
            referencedRelation: "propostas_arquivos"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_arquivos: {
        Row: {
          caminho_storage: string
          candidatura_id: string
          created_at: string | null
          fornecedor_id: string
          id: string
          nome_arquivo: string
          orcamento_id: string
          tamanho: number
          tipo_arquivo: string
          updated_at: string | null
          url_arquivo: string
        }
        Insert: {
          caminho_storage: string
          candidatura_id: string
          created_at?: string | null
          fornecedor_id: string
          id?: string
          nome_arquivo: string
          orcamento_id: string
          tamanho: number
          tipo_arquivo: string
          updated_at?: string | null
          url_arquivo: string
        }
        Update: {
          caminho_storage?: string
          candidatura_id?: string
          created_at?: string | null
          fornecedor_id?: string
          id?: string
          nome_arquivo?: string
          orcamento_id?: string
          tamanho?: number
          tipo_arquivo?: string
          updated_at?: string | null
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "propostas_arquivos_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_arquivos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_arquivos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "propostas_arquivos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_arquivos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_arquivos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_saude_empresa: {
        Row: {
          created_at: string | null
          data_registro: string
          descricao: string | null
          id: string
          registrado_por_id: string | null
          registrado_por_nome: string | null
          tipo: string
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data_registro?: string
          descricao?: string | null
          id?: string
          registrado_por_id?: string | null
          registrado_por_nome?: string | null
          tipo: string
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data_registro?: string
          descricao?: string | null
          id?: string
          registrado_por_id?: string | null
          registrado_por_nome?: string | null
          tipo?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_saude_empresa_registrado_por_id_fkey"
            columns: ["registrado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_saude_empresa_registrado_por_id_fkey"
            columns: ["registrado_por_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      respostas_checklist: {
        Row: {
          ambientes: string[] | null
          checklist_proposta_id: string
          created_at: string | null
          descricao_item_extra: string | null
          id: string
          incluido: boolean
          item_extra: boolean | null
          item_id: string | null
          nome_item_extra: string | null
          observacoes: string | null
          valor_estimado: number | null
        }
        Insert: {
          ambientes?: string[] | null
          checklist_proposta_id: string
          created_at?: string | null
          descricao_item_extra?: string | null
          id?: string
          incluido?: boolean
          item_extra?: boolean | null
          item_id?: string | null
          nome_item_extra?: string | null
          observacoes?: string | null
          valor_estimado?: number | null
        }
        Update: {
          ambientes?: string[] | null
          checklist_proposta_id?: string
          created_at?: string | null
          descricao_item_extra?: string | null
          id?: string
          incluido?: boolean
          item_extra?: boolean | null
          item_id?: string | null
          nome_item_extra?: string | null
          observacoes?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_checklist_checklist_proposta_id_fkey"
            columns: ["checklist_proposta_id"]
            isOneToOne: false
            referencedRelation: "checklist_propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_checklist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      revisoes_propostas: {
        Row: {
          checklist_proposta_id: string
          comentarios: string | null
          data_conclusao: string | null
          data_solicitacao: string
          id: string
          solicitado_por: string | null
          status: string
          versao_anterior: number
          versao_nova: number
        }
        Insert: {
          checklist_proposta_id: string
          comentarios?: string | null
          data_conclusao?: string | null
          data_solicitacao?: string
          id?: string
          solicitado_por?: string | null
          status?: string
          versao_anterior: number
          versao_nova: number
        }
        Update: {
          checklist_proposta_id?: string
          comentarios?: string | null
          data_conclusao?: string | null
          data_solicitacao?: string
          id?: string
          solicitado_por?: string | null
          status?: string
          versao_anterior?: number
          versao_nova?: number
        }
        Relationships: [
          {
            foreignKeyName: "revisoes_propostas_checklist_proposta_id_fkey"
            columns: ["checklist_proposta_id"]
            isOneToOne: false
            referencedRelation: "checklist_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      revisoes_propostas_clientes: {
        Row: {
          checklist_proposta_id: string | null
          cliente_temp_email: string
          created_at: string | null
          data_resposta: string | null
          data_solicitacao: string | null
          id: string
          motivo_revisao: string
          observacoes_fornecedor: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          checklist_proposta_id?: string | null
          cliente_temp_email: string
          created_at?: string | null
          data_resposta?: string | null
          data_solicitacao?: string | null
          id?: string
          motivo_revisao: string
          observacoes_fornecedor?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          checklist_proposta_id?: string | null
          cliente_temp_email?: string
          created_at?: string | null
          data_resposta?: string | null
          data_solicitacao?: string | null
          id?: string
          motivo_revisao?: string
          observacoes_fornecedor?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisoes_propostas_clientes_checklist_proposta_id_fkey"
            columns: ["checklist_proposta_id"]
            isOneToOne: false
            referencedRelation: "checklist_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      selos_fornecedores: {
        Row: {
          ativo: boolean
          concedido_por: string | null
          cor: string
          created_at: string
          data_concessao: string
          data_expiracao: string | null
          descricao: string | null
          fornecedor_id: string
          icone: string | null
          id: string
          nome_selo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          concedido_por?: string | null
          cor?: string
          created_at?: string
          data_concessao?: string
          data_expiracao?: string | null
          descricao?: string | null
          fornecedor_id: string
          icone?: string | null
          id?: string
          nome_selo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          concedido_por?: string | null
          cor?: string
          created_at?: string
          data_concessao?: string
          data_expiracao?: string | null
          descricao?: string | null
          fornecedor_id?: string
          icone?: string | null
          id?: string
          nome_selo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selos_fornecedores_concedido_por_fkey"
            columns: ["concedido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selos_fornecedores_concedido_por_fkey"
            columns: ["concedido_por"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "selos_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selos_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      solicitacoes_ajuda: {
        Row: {
          admin_respondeu_id: string | null
          candidatura_id: string
          created_at: string
          data_resposta: string | null
          data_solicitacao: string
          fornecedor_id: string
          id: string
          mensagem: string
          respondida: boolean
          resposta_admin: string | null
          updated_at: string
        }
        Insert: {
          admin_respondeu_id?: string | null
          candidatura_id: string
          created_at?: string
          data_resposta?: string | null
          data_solicitacao?: string
          fornecedor_id: string
          id?: string
          mensagem: string
          respondida?: boolean
          resposta_admin?: string | null
          updated_at?: string
        }
        Update: {
          admin_respondeu_id?: string | null
          candidatura_id?: string
          created_at?: string
          data_resposta?: string | null
          data_solicitacao?: string
          fornecedor_id?: string
          id?: string
          mensagem?: string
          respondida?: boolean
          resposta_admin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_ajuda_admin_respondeu_id_fkey"
            columns: ["admin_respondeu_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuda_admin_respondeu_id_fkey"
            columns: ["admin_respondeu_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuda_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuda_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_ajuda_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      solicitacoes_materiais: {
        Row: {
          cliente_id: string | null
          contrato_id: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_necessidade: string | null
          descricao: string
          fornecedor_id: string | null
          id: string
          observacoes_cliente: string | null
          observacoes_fornecedor: string | null
          status: string | null
          tipo: string | null
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_necessidade?: string | null
          descricao: string
          fornecedor_id?: string | null
          id?: string
          observacoes_cliente?: string | null
          observacoes_fornecedor?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_necessidade?: string | null
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          observacoes_cliente?: string | null
          observacoes_fornecedor?: string | null
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_materiais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_materiais_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_materiais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_materiais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      subcategorias_financeiras: {
        Row: {
          ativa: boolean
          categoria_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          categoria_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          categoria_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategorias_financeiras_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_comparacao_cliente: {
        Row: {
          cliente_info: Json | null
          created_at: string
          expires_at: string
          id: string
          orcamento_id: string
          token_acesso: string
          total_acessos: number
          ultimo_acesso: string | null
          usado: boolean
        }
        Insert: {
          cliente_info?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          orcamento_id: string
          token_acesso: string
          total_acessos?: number
          ultimo_acesso?: string | null
          usado?: boolean
        }
        Update: {
          cliente_info?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          orcamento_id?: string
          token_acesso?: string
          total_acessos?: number
          ultimo_acesso?: string | null
          usado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tokens_comparacao_cliente_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_comparacao_cliente_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tokens_comparacao_cliente_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes_financeiras: {
        Row: {
          conta_bancaria_id: string | null
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          data_transacao: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          tipo: string
          valor: number
        }
        Insert: {
          conta_bancaria_id?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_transacao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          tipo: string
          valor: number
        }
        Update: {
          conta_bancaria_id?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_transacao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_financeiras_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_financeiras_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_financeiras_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_crm_marcenaria_leads: {
        Row: {
          ambientes_mobiliar: string[] | null
          bloqueado: boolean | null
          categorias: string[] | null
          checklist_concluidos: number | null
          checklist_pendentes: number | null
          checklist_total: number | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          codigo_orcamento: string | null
          consultor_nome: string | null
          consultor_responsavel_id: string | null
          contratado: boolean | null
          created_at: string | null
          data_contratacao: string | null
          data_criacao_lead: string | null
          data_desbloqueio: string | null
          data_inicio: string | null
          data_perda: string | null
          dias_desde_criacao: number | null
          dias_na_etapa_atual: number | null
          estilo_preferido: string | null
          etapa_marcenaria: string | null
          feedback_cliente: string | null
          id: string | null
          justificativa_perda: string | null
          local: string | null
          mensagem_1_enviada: boolean | null
          mensagem_1_enviada_em: string | null
          mensagem_2_enviada: boolean | null
          mensagem_2_enviada_em: string | null
          mensagem_3_enviada: boolean | null
          mensagem_3_enviada_em: string | null
          motivo_perda_id: string | null
          necessidade: string | null
          observacoes_internas: string | null
          orcamento_id: string | null
          prazo_inicio_texto: string | null
          projeto_enviado_em: string | null
          projeto_url: string | null
          reuniao_agendada_para: string | null
          reuniao_realizada_em: string | null
          tags: Json | null
          tarefas_atrasadas: number | null
          tarefas_concluidas: number | null
          tarefas_hoje: number | null
          tem_alerta_checklist: boolean | null
          tem_fotos: boolean | null
          tem_medidas: boolean | null
          tem_planta: boolean | null
          total_notas: number | null
          total_tarefas: number | null
          updated_at: string | null
          valor_contrato: number | null
          valor_estimado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_marcenaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      view_crm_marcenaria_leads_com_checklist: {
        Row: {
          ambientes_mobiliar: string[] | null
          bloqueado: boolean | null
          checklist_concluidos: number | null
          checklist_pendentes: number | null
          checklist_total: number | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          codigo_orcamento: string | null
          consultor_email: string | null
          consultor_nome: string | null
          consultor_responsavel_id: string | null
          contratado: boolean | null
          created_at: string | null
          data_contratacao: string | null
          data_criacao_lead: string | null
          data_desbloqueio: string | null
          data_perda: string | null
          dias_desde_criacao: number | null
          estilo_preferido: string | null
          etapa_marcenaria: string | null
          feedback_cliente: string | null
          id: string | null
          justificativa_perda: string | null
          mensagem_1_enviada: boolean | null
          mensagem_1_enviada_em: string | null
          mensagem_2_enviada: boolean | null
          mensagem_2_enviada_em: string | null
          mensagem_3_enviada: boolean | null
          mensagem_3_enviada_em: string | null
          motivo_perda_id: string | null
          observacoes_internas: string | null
          orcamento_id: string | null
          projeto_enviado_em: string | null
          projeto_url: string | null
          reuniao_agendada_para: string | null
          reuniao_realizada_em: string | null
          tarefas_atrasadas: number | null
          tarefas_concluidas: number | null
          tarefas_hoje: number | null
          tem_alerta_checklist: boolean | null
          tem_fotos: boolean | null
          tem_medidas: boolean | null
          tem_planta: boolean | null
          tempo_na_etapa_dias: number | null
          total_notas: number | null
          total_tarefas: number | null
          ultima_nota_autor: string | null
          ultima_nota_conteudo: string | null
          ultima_nota_data: string | null
          ultima_nota_id: string | null
          updated_at: string | null
          valor_contrato: number | null
          valor_estimado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_marcenaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      view_fornecedores_unicos_crm: {
        Row: {
          email: string | null
          empresa: string | null
          fornecedor_id: string | null
          nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      view_leads_marcenaria_com_checklist: {
        Row: {
          ambientes_mobiliar: string[] | null
          bloqueado: boolean | null
          checklist_concluidos: number | null
          checklist_pendentes: number | null
          checklist_total: number | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          codigo_orcamento: string | null
          consultor_nome: string | null
          consultor_responsavel_id: string | null
          contratado: boolean | null
          created_at: string | null
          data_contratacao: string | null
          data_criacao_lead: string | null
          data_desbloqueio: string | null
          data_perda: string | null
          dias_na_etapa_atual: number | null
          estilo_preferido: string | null
          etapa_marcenaria: string | null
          feedback_cliente: string | null
          id: string | null
          justificativa_perda: string | null
          mensagem_1_enviada: boolean | null
          mensagem_1_enviada_em: string | null
          mensagem_2_enviada: boolean | null
          mensagem_2_enviada_em: string | null
          mensagem_3_enviada: boolean | null
          mensagem_3_enviada_em: string | null
          motivo_perda_id: string | null
          observacoes_internas: string | null
          orcamento_id: string | null
          projeto_enviado_em: string | null
          projeto_url: string | null
          reuniao_agendada_para: string | null
          reuniao_realizada_em: string | null
          tags: Json | null
          tarefas_atrasadas: number | null
          tarefas_concluidas: number | null
          tarefas_hoje: number | null
          tem_alerta_checklist: boolean | null
          tem_fotos: boolean | null
          tem_medidas: boolean | null
          tem_planta: boolean | null
          total_tarefas: number | null
          ultima_nota_autor: string | null
          ultima_nota_conteudo: string | null
          ultima_nota_data: string | null
          ultima_nota_id: string | null
          updated_at: string | null
          valor_contrato: number | null
          valor_estimado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_marcenaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      view_orcamentos_crm: {
        Row: {
          categorias: string[] | null
          codigo_orcamento: string | null
          concierge_email: string | null
          concierge_nome: string | null
          concierge_responsavel_id: string | null
          created_at: string | null
          dados_contato: Json | null
          data_publicacao: string | null
          etapa_crm: string | null
          feedback_cliente_comentario: string | null
          feedback_cliente_nota: number | null
          fornecedores_inscritos_count: number | null
          gestor_conta_id: string | null
          gestor_nome: string | null
          id: string | null
          local: string | null
          necessidade: string | null
          observacoes_internas: string | null
          propostas_enviadas_count: number | null
          status_contato: string | null
          tamanho_imovel: number | null
          ultima_atualizacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_crm_tracking_concierge_responsavel_id_fkey"
            columns: ["concierge_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_concierge_responsavel_id_fkey"
            columns: ["concierge_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "orcamentos_gestor_conta_id_fkey"
            columns: ["gestor_conta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_gestor_conta_id_fkey"
            columns: ["gestor_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      view_orcamentos_crm_com_checklist: {
        Row: {
          budget_informado: number | null
          categorias: string[] | null
          checklist_pendentes: number | null
          codigo_orcamento: string | null
          concierge_email: string | null
          concierge_nome: string | null
          concierge_responsavel_id: string | null
          congelado: boolean | null
          created_at: string | null
          dados_contato: Json | null
          data_conclusao: string | null
          data_congelamento: string | null
          data_entrada_etapa: string | null
          data_inicio: string | null
          data_publicacao: string | null
          data_reativacao_prevista: string | null
          etapa_crm: Database["public"]["Enums"]["etapa_crm_enum"] | null
          fornecedores_inscritos_count: number | null
          gestor_conta_id: string | null
          id: string | null
          itens_checklist_concluidos: number | null
          justificativa_perda: string | null
          local: string | null
          motivo_congelamento: string | null
          motivo_perda_descricao: string | null
          motivo_perda_id: string | null
          motivo_perda_nome: string | null
          necessidade: string | null
          percentual_checklist_concluido: number | null
          prazo_envio_proposta_dias: number | null
          prazo_explicitamente_definido: boolean | null
          prazo_inicio_texto: string | null
          propostas_enviadas_count: number | null
          quantidade_empresas: number | null
          status: string | null
          status_contato:
            | Database["public"]["Enums"]["status_contato_enum"]
            | null
          tags: Json | null
          tamanho_imovel: number | null
          tarefas_atrasadas: number | null
          tarefas_concluidas: number | null
          tarefas_hoje: number | null
          tem_alertas: boolean | null
          tempo_na_etapa_dias: number | null
          total_itens_checklist: number | null
          total_tarefas: number | null
          ultima_nota_autor: string | null
          ultima_nota_conteudo: string | null
          ultima_nota_data: string | null
          ultima_nota_id: string | null
          updated_at: string | null
          usuario_id: string | null
          valor_lead_estimado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_crm_tracking_concierge_responsavel_id_fkey"
            columns: ["concierge_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_concierge_responsavel_id_fkey"
            columns: ["concierge_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "orcamentos_crm_tracking_motivo_perda_crm_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_gestor_conta_id_fkey"
            columns: ["gestor_conta_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_gestor_conta_id_fkey"
            columns: ["gestor_conta_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      vw_clientes_carteira_concierge: {
        Row: {
          clientes_marcenaria: number | null
          clientes_orcamentos: number | null
          nome: string | null
          tipo_usuario: string | null
          total_clientes: number | null
          usuario_id: string | null
        }
        Relationships: []
      }
      vw_crm_marcenaria_leads_com_checklist: {
        Row: {
          ambientes_mobiliar: string[] | null
          bloqueado: boolean | null
          categorias: string[] | null
          checklist_concluidos: number | null
          checklist_pendentes: number | null
          checklist_total: number | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          codigo_orcamento: string | null
          consultor_nome: string | null
          consultor_responsavel_id: string | null
          contratado: boolean | null
          created_at: string | null
          data_contratacao: string | null
          data_criacao_lead: string | null
          data_desbloqueio: string | null
          data_perda: string | null
          dias_desde_criacao: number | null
          dias_na_etapa_atual: number | null
          estilo_preferido: string | null
          etapa_marcenaria: string | null
          feedback_cliente: string | null
          id: string | null
          justificativa_perda: string | null
          local: string | null
          mensagem_1_enviada: boolean | null
          mensagem_1_enviada_em: string | null
          mensagem_2_enviada: boolean | null
          mensagem_2_enviada_em: string | null
          mensagem_3_enviada: boolean | null
          mensagem_3_enviada_em: string | null
          motivo_perda_id: string | null
          necessidade: string | null
          observacoes_internas: string | null
          orcamento_id: string | null
          projeto_enviado_em: string | null
          projeto_url: string | null
          reuniao_agendada_para: string | null
          reuniao_realizada_em: string | null
          tem_alerta_checklist: boolean | null
          tem_fotos: boolean | null
          tem_medidas: boolean | null
          tem_planta: boolean | null
          total_notas: number | null
          updated_at: string | null
          valor_contrato: number | null
          valor_estimado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_consultor_responsavel_id_fkey"
            columns: ["consultor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_motivo_perda_id_fkey"
            columns: ["motivo_perda_id"]
            isOneToOne: false
            referencedRelation: "motivos_perda_marcenaria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_marcenaria_leads_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "view_orcamentos_crm_com_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_metas_calculadas_concierge: {
        Row: {
          clientes_em_carteira: number | null
          meta_diaria_calculada: number | null
          nivel_concierge: string | null
          taxa_produtividade: number | null
          usuario_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_checklist_concierge_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_checklist_concierge_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "vw_clientes_carteira_concierge"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      vw_produtividade_checklist_diaria: {
        Row: {
          data: string | null
          itens_concluidos: number | null
          nome: string | null
          tipo_crm: string | null
          usuario_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aplicar_penalidade_fornecedor: {
        Args: {
          p_desistencia_id: string
          p_duracao_dias: number
          p_fornecedor_id: string
          p_observacoes?: string
          p_tipo_penalidade: string
        }
        Returns: Json
      }
      apropriar_gestor_conta: {
        Args: { p_gestor_conta_id: string; p_orcamento_id: string }
        Returns: Json
      }
      apropriar_lead_marcenaria: {
        Args: { p_consultor_id: string; p_lead_id: string }
        Returns: undefined
      }
      aprovar_fornecedor_admin: {
        Args: {
          p_data_termino_contrato: string
          p_limite_acessos_diarios?: number
          p_limite_acessos_mensais?: number
          p_observacoes?: string
          p_user_id: string
        }
        Returns: Json
      }
      atualizar_conciliacao_e_saldo: {
        Args: {
          p_conciliado: boolean
          p_conta_bancaria_id: string
          p_impacto_saldo: number
          p_movimentacao_id: string
        }
        Returns: undefined
      }
      atualizar_observacoes_acompanhamento: {
        Args: { p_inscricao_id: string; p_observacoes: string }
        Returns: Json
      }
      atualizar_quantidade_empresas: {
        Args: { p_orcamento_id: string }
        Returns: undefined
      }
      atualizar_status_acompanhamento: {
        Args: { p_inscricao_id: string; p_novo_status: string }
        Returns: Json
      }
      atualizar_status_checklist_colaborativo: {
        Args: { p_checklist_id: string }
        Returns: Json
      }
      buscar_itens_contrato: {
        Args: { p_contrato_id: string }
        Returns: {
          ambientes: string[]
          categoria: string
          descricao: string
          item_id: string
          nome: string
          valor_estimado: number
        }[]
      }
      buscar_proposta_por_codigos: {
        Args: { p_codigo_fornecedor: string; p_codigo_orcamento: string }
        Returns: Json
      }
      calcular_alertas_checklist: { Args: never; Returns: undefined }
      calcular_data_limite_envio: {
        Args: { p_data_candidatura: string; p_prazo_dias: number }
        Returns: string
      }
      calcular_dias_restantes_contrato: {
        Args: { user_id: string }
        Returns: number
      }
      calcular_gatilhos_ativos: {
        Args: {
          dias_inativo: number
          dias_plataforma: number
          orc_abertos: number
        }
        Returns: Json
      }
      calcular_media_avaliacoes: {
        Args: { p_fornecedor_id: string }
        Returns: Json
      }
      calcular_percentual_acumulado_item: {
        Args: { p_item_checklist_id: string; p_medicao_atual_id?: string }
        Returns: number
      }
      calcular_prioridade: {
        Args: {
          dias_inativo: number
          dias_plataforma: number
          orc_abertos: number
          status_contrato: string
        }
        Returns: number
      }
      can_access_cs: { Args: never; Returns: boolean }
      can_access_financial: { Args: never; Returns: boolean }
      can_manage_orcamentos: { Args: never; Returns: boolean }
      can_manage_suppliers: { Args: never; Returns: boolean }
      consolidar_checklist_colaborativo: {
        Args: { p_orcamento_id: string }
        Returns: Json
      }
      contar_dias_confirmacao_rapida_consecutivos: {
        Args: { p_fornecedor_id: string }
        Returns: number
      }
      contar_propostas_abertas_fornecedor: {
        Args: { p_fornecedor_id: string }
        Returns: number
      }
      corrigir_inconsistencias_emails_clientes: { Args: never; Returns: Json }
      corrigir_logs_acesso_retroativo: { Args: never; Returns: Json }
      corrigir_revisao_abandonada: { Args: never; Returns: Json }
      corrigir_situacao_cliente_fornecedor: { Args: never; Returns: Json }
      criar_checklists_colaborativos_retroativo: { Args: never; Returns: Json }
      criar_lead_marcenaria_apos_7_dias: { Args: never; Returns: undefined }
      criar_lead_marcenaria_especifico: {
        Args: { p_orcamento_id: string }
        Returns: Json
      }
      criar_notificacao: {
        Args: {
          p_dados_extras?: Json
          p_mensagem: string
          p_referencia_id?: string
          p_tipo: string
          p_tipo_referencia?: string
          p_titulo: string
          p_usuario_id: string
        }
        Returns: string
      }
      current_date_sao_paulo: { Args: never; Returns: string }
      debug_contratos_fornecedor: {
        Args: { p_fornecedor_id: string }
        Returns: {
          cliente_email: string
          cliente_nome: string
          contrato_id: string
          created_at: string
          status_assinatura: string
          valor_contrato: number
        }[]
      }
      definir_acao_sugerida: {
        Args: {
          dias_inativo: number
          dias_plataforma: number
          nome_fornecedor: string
          orc_abertos: number
        }
        Returns: Json
      }
      desbloquear_leads_marcenaria_automatico: {
        Args: never
        Returns: {
          leads_desbloqueados: number
        }[]
      }
      enviar_proposta: {
        Args: { p_checklist_proposta_id: string }
        Returns: Json
      }
      excluir_orcamento_admin: {
        Args: { p_orcamento_id: string }
        Returns: Json
      }
      excluir_usuario_admin: { Args: { p_user_id: string }; Returns: Json }
      extrair_codigo_orcamento: {
        Args: { orcamento_uuid: string }
        Returns: string
      }
      fechar_caixa: {
        Args: {
          p_conta_bancaria_id: string
          p_data_fechamento: string
          p_observacoes?: string
        }
        Returns: Json
      }
      finalizar_revisao_fornecedor: {
        Args: { p_checklist_proposta_id: string }
        Returns: Json
      }
      forcar_consolidacao_checklist: {
        Args: { checklist_id: string }
        Returns: Json
      }
      fornecedor_inscrito_no_orcamento: {
        Args: { p_orcamento_id: string }
        Returns: boolean
      }
      fornecedor_pode_ver_orcamento: {
        Args: { orcamento_produto_id: string }
        Returns: boolean
      }
      gerar_codigo_fornecedor: { Args: never; Returns: string }
      gerar_token_comparacao: {
        Args: { p_orcamento_id: string }
        Returns: Json
      }
      get_all_users: {
        Args: never
        Returns: {
          acessos_diarios: number
          acessos_mensais: number
          created_at: string
          data_criacao: string
          data_termino_contrato: string
          email: string
          empresa: string
          id: string
          limite_acessos_diarios: number
          limite_acessos_mensais: number
          nome: string
          status: string
          telefone: string
          tipo_usuario: string
          ultimo_login: string
          updated_at: string
        }[]
      }
      get_concierge_para_fornecedor: {
        Args: { p_orcamento_id: string }
        Returns: string
      }
      get_consultor_marcenaria_padrao: { Args: never; Returns: string }
      get_user_tipo: { Args: { p_user_id: string }; Returns: string }
      inicializar_orcamento_crm: {
        Args: { p_concierge_id: string; p_orcamento_id: string }
        Returns: undefined
      }
      inscrever_fornecedor_com_limite: {
        Args: {
          p_email: string
          p_empresa: string
          p_fornecedor_id: string
          p_nome: string
          p_orcamento_id: string
          p_telefone: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_gestor: { Args: never; Returns: boolean }
      is_admin_or_master: { Args: { _user_id: string }; Returns: boolean }
      is_closer_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_gestor_conta: { Args: never; Returns: boolean }
      is_gestor_ou_consultor_marcenaria: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
      is_master_or_admin: { Args: never; Returns: boolean }
      is_sdr: { Args: never; Returns: boolean }
      is_user_admin: { Args: { user_id: string }; Returns: boolean }
      limpar_codigos_expirados: { Args: never; Returns: undefined }
      listar_avaliacoes_leads: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          avaliado_por_nome: string
          cliente_nome: string
          codigo_orcamento: string
          data_avaliacao: string
          decisor_direto: boolean
          engajamento_alto: boolean
          fornecedor_consegue_orcar: boolean
          id: string
          orcamento_compativel: boolean
          orcamento_id: string
          perfil_ideal: boolean
          pontuacao_total: number
          prazo_curto: boolean
        }[]
      }
      listar_fornecedores_para_relatorio: {
        Args: never
        Returns: {
          email: string
          empresa: string
          id: string
          nome: string
          status: string
        }[]
      }
      listar_gestores_conta: {
        Args: never
        Returns: {
          email: string
          empresa: string
          id: string
          nome: string
          status: string
        }[]
      }
      mover_lead_marcenaria_etapa: {
        Args: { p_lead_id: string; p_nova_etapa: string; p_observacao?: string }
        Returns: undefined
      }
      mover_orcamento_etapa: {
        Args: {
          p_nova_etapa: string
          p_observacao?: string
          p_orcamento_id: string
          p_usuario_id: string
        }
        Returns: Json
      }
      obter_cadastros_pendentes: {
        Args: never
        Returns: {
          created_at: string
          email: string
          empresa: string
          id: string
          nome: string
          telefone: string
        }[]
      }
      obter_estatisticas_fornecedor: {
        Args: { fornecedor_id: string }
        Returns: Json
      }
      obter_inscricoes_usuario_mes: {
        Args: { user_id: string }
        Returns: number
      }
      obter_inscricoes_usuario_total: {
        Args: { user_id: string }
        Returns: number
      }
      obter_orcamentos_mes_atual: { Args: never; Returns: number }
      obter_proximo_gestor_fila: { Args: never; Returns: string }
      obter_proximo_numero_medicao: {
        Args: { p_contrato_id: string }
        Returns: number
      }
      pode_solicitar_desistencia: {
        Args: { p_candidatura_id: string }
        Returns: boolean
      }
      popular_cronograma_obra: {
        Args: { p_obra_id: string; p_proposta_id: string }
        Returns: undefined
      }
      processar_candidatura_fornecedor:
        | {
            Args: {
              p_email: string
              p_empresa: string
              p_nome: string
              p_orcamento_id: string
              p_telefone: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_email: string
              p_empresa: string
              p_horario_visita_id?: string
              p_nome: string
              p_orcamento_id: string
              p_telefone: string
            }
            Returns: Json
          }
      processar_fornecedor_individual: {
        Args: {
          p_erro_message?: string
          p_fornecedor_id: string
          p_sucesso: boolean
          p_user_id: string
        }
        Returns: Json
      }
      processar_lote_fornecedores: {
        Args: { p_importacao_id: string; p_tamanho_lote?: number }
        Returns: Json
      }
      processar_lote_fornecedores_real: {
        Args: { p_importacao_id: string; p_tamanho_lote?: number }
        Returns: Json
      }
      reabrir_caixa: {
        Args: {
          p_conta_bancaria_id: string
          p_data_fechamento: string
          p_motivo?: string
        }
        Returns: Json
      }
      reativar_orcamentos_congelados: { Args: never; Returns: undefined }
      recriar_conta_cliente: {
        Args: { p_cliente_id: string; p_novo_email: string }
        Returns: Json
      }
      recuperar_proposta_problematica: {
        Args: { p_checklist_proposta_id: string }
        Returns: Json
      }
      registrar_acesso_bem_sucedido: {
        Args: { user_id: string }
        Returns: undefined
      }
      registrar_candidatura_bem_sucedida: {
        Args: { user_id: string }
        Returns: undefined
      }
      rejeitar_fornecedor_admin: {
        Args: { p_motivo?: string; p_user_id: string }
        Returns: Json
      }
      relatorio_acessos_unicos_diarios: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          acessos_unicos: number
          data: string
        }[]
      }
      relatorio_avaliacoes_leads: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          media_pontuacao: number
          percentual_frios: number
          percentual_mornos: number
          percentual_quentes: number
          total_avaliacoes: number
          total_frios: number
          total_mornos: number
          total_quentes: number
        }[]
      }
      relatorio_clientes_postados_mes: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          categorias: string[]
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string
          codigo_orcamento: string
          data_publicacao: string
          fornecedores_inscritos: Json
          gestor_conta_email: string
          gestor_conta_nome: string
          local: string
          necessidade: string
          orcamento_id: string
          status_orcamento: string
          tamanho_imovel: string
          total_fornecedores_inscritos: number
        }[]
      }
      relatorio_conversao_orcamentos_diarios: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          data: string
          quantidade_fechados: number
          quantidade_postados: number
          taxa_conversao: number
        }[]
      }
      relatorio_experiencia_fornecedor: {
        Args: never
        Returns: {
          acao_sugerida: Json
          data_cadastro: string
          data_termino_contrato: string
          dias_inativo: number
          dias_plataforma: number
          dias_restantes_contrato: number
          email: string
          empresa: string
          gatilhos_ativos: Json
          id: string
          nivel_alerta: string
          nome: string
          orcamentos_abertos: number
          prioridade: number
          propostas_enviadas: number
          status_contrato: string
          taxa_conversao: number
          telefone: string
          total_inscricoes: number
          ultimo_acesso: string
        }[]
      }
      relatorio_fluxo_caixa:
        | {
            Args: {
              p_data_fim: string
              p_data_inicio: string
              p_incluir_pagas?: boolean
            }
            Returns: {
              categoria: string
              cliente_fornecedor: string
              data_vencimento: string
              descricao: string
              email: string
              id: string
              origem: string
              status: string
              telefone: string
              tipo: string
              valor_original: number
              valor_pago: number
              valor_recebido: number
            }[]
          }
        | {
            Args: {
              p_data_fim: string
              p_data_inicio: string
              p_incluir_pagas?: boolean
              p_status_filtros?: string[]
            }
            Returns: {
              categoria: string
              cliente_fornecedor: string
              data_vencimento: string
              descricao: string
              email: string
              id: string
              origem: string
              status: string
              subcategoria: string
              telefone: string
              tipo: string
              valor_original: number
              valor_pago: number
              valor_recebido: number
            }[]
          }
      relatorio_forecast_crm: {
        Args: { ano?: number; gestor_id?: string; mes?: number }
        Returns: {
          etapa: string
          pipeline_bruto: number
          pipeline_ponderado: number
          probabilidade: number
          quantidade: number
          ticket_medio: number
        }[]
      }
      relatorio_fornecedores_ativos_por_data: {
        Args: { p_data_consulta: string }
        Returns: {
          fornecedores: Json
          novos_no_mes: number
          sem_prazo: number
          total_ativos: number
          vencendo_30_dias: number
        }[]
      }
      relatorio_fornecedores_completo: {
        Args: {
          p_busca_texto?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_status_filtro?: string[]
          p_vencimento_proximo_dias?: number
        }
        Returns: {
          data_cadastro: string
          data_termino_contrato: string
          dias_para_vencimento: number
          email: string
          empresa: string
          id: string
          nome: string
          propostas_enviadas: number
          status: string
          taxa_conversao: number
          telefone: string
          total_inscricoes: number
          ultimo_login: string
        }[]
      }
      relatorio_funil_crm:
        | {
            Args: {
              data_fim?: string
              data_inicio?: string
              gestor_id?: string
            }
            Returns: {
              etapa: string
              ordem: number
              percentual_total: number
              quantidade: number
              taxa_conversao_proxima: number
              tempo_medio_dias: number
              ticket_medio: number
              valor_total: number
            }[]
          }
        | {
            Args: {
              data_fim?: string
              data_inicio?: string
              fornecedor_id?: string
              gestor_id?: string
            }
            Returns: {
              etapa: string
              quantidade: number
              taxa_conversao: number
              ticket_medio: number
              valor: number
            }[]
          }
      relatorio_funil_crm_acumulado:
        | {
            Args: {
              data_fim?: string
              data_inicio?: string
              gestor_id?: string
            }
            Returns: {
              etapa_nome: string
              ordem: number
              percentual_total: number
              quantidade_passou: number
              taxa_conversao_proxima: number
            }[]
          }
        | {
            Args: {
              data_fim?: string
              data_inicio?: string
              fornecedor_id?: string
              gestor_id?: string
            }
            Returns: {
              etapa_nome: string
              ordem: number
              percentual_total: number
              quantidade_passou: number
              taxa_conversao_proxima: number
            }[]
          }
      relatorio_funil_vendas: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          etapa: string
          percentual_total: number
          quantidade: number
          taxa_conversao: number
        }[]
      }
      relatorio_inscricoes_fornecedor: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_fornecedor_id: string
        }
        Returns: {
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string
          codigo_orcamento: string
          data_inscricao: string
          data_ultima_atualizacao: string
          inscricao_id: string
          local: string
          necessidade: string
          observacoes_acompanhamento: string
          orcamento_id: string
          status_acompanhamento: string
          status_orcamento: string
          tamanho_imovel: number
        }[]
      }
      relatorio_logins_fornecedor: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_fornecedor_id?: string
        }
        Returns: {
          data_login: string
          dias_desde_ultimo_login: number
          empresa: string
          fornecedor_id: string
          fornecedor_nome: string
        }[]
      }
      relatorio_lt_churn: {
        Args: {
          p_agrupamento?: string
          p_data_fim?: string
          p_data_inicio?: string
        }
        Returns: {
          churn_rate_mensal: number
          churn_rate_periodo: number
          comparacao_periodo_anterior: Json
          coortes_dados: Json
          curva_sobrevivencia: Json
          distribuicao_lt: Json
          fornecedores_ativos: number
          fornecedores_churned: number
          lt_medio_ativos: number
          lt_medio_churned: number
          lt_medio_geral: number
          total_fornecedores: number
        }[]
      }
      relatorio_metricas_crm:
        | {
            Args: {
              data_fim?: string
              data_inicio?: string
              gestor_id?: string
            }
            Returns: {
              pipeline_ponderado_total: number
              taxa_conversao_geral: number
              ticket_medio_geral: number
              total_ganhos: number
              total_orcamentos_ativos: number
              total_perdas: number
              valor_total_pipeline: number
            }[]
          }
        | {
            Args: {
              data_fim?: string
              data_inicio?: string
              fornecedor_id?: string
              gestor_id?: string
            }
            Returns: {
              taxa_conversao_geral: number
              ticket_medio_geral: number
              total_ganhos: number
              total_oportunidades: number
              total_perdidos: number
              valor_ganho: number
              valor_perdido: number
              valor_total_pipeline: number
            }[]
          }
      relatorio_orcamentos_por_concierge: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          gestor_conta_id: string
          gestor_nome: string
          mes: string
          total_orcamentos: number
        }[]
      }
      relatorio_orcamentos_postados_diarios: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          data: string
          quantidade_postados: number
        }[]
      }
      relatorio_perfil_orcamentos: {
        Args: { p_data_fim?: string; p_data_inicio?: string }
        Returns: {
          faixa_0_10: number
          faixa_10_30: number
          faixa_100_150: number
          faixa_30_60: number
          faixa_60_100: number
          faixa_acima_150: number
          perc_0_10: number
          perc_10_30: number
          perc_100_150: number
          perc_30_60: number
          perc_60_100: number
          perc_abertos: number
          perc_acima_150: number
          perc_fechados: number
          perc_prazo_12_meses: number
          perc_prazo_3_meses: number
          perc_prazo_6_meses: number
          perc_prazo_9_meses: number
          perc_prazo_flexivel: number
          perc_prazo_imediato: number
          prazo_12_meses: number
          prazo_3_meses: number
          prazo_6_meses: number
          prazo_9_meses: number
          prazo_flexivel: number
          prazo_imediato: number
          status_abertos: number
          status_fechados: number
          tamanho_mediano: number
          tamanho_medio: number
          top_categorias: Json
          total_orcamentos: number
        }[]
      }
      relatorio_status_orcamentos_fornecedor: {
        Args: {
          p_data_fim: string
          p_data_inicio: string
          p_fornecedor_id: string
        }
        Returns: {
          percentual: number
          quantidade: number
          status_acompanhamento: string
        }[]
      }
      remover_penalidades_expiradas: { Args: never; Returns: Json }
      reset_contadores_candidatura_diarios: { Args: never; Returns: undefined }
      reset_contadores_diarios: { Args: never; Returns: undefined }
      solicitar_revisao_proposta:
        | {
            Args: { p_checklist_proposta_id: string; p_comentarios: string }
            Returns: Json
          }
        | {
            Args: {
              p_checklist_proposta_id: string
              p_cliente_email: string
              p_motivo_revisao: string
              p_token_acesso: string
            }
            Returns: Json
          }
      upsert_respostas_checklist: {
        Args: { p_checklist_proposta_id: string; p_respostas: Json }
        Returns: Json
      }
      validar_acesso_comparador: {
        Args: { p_codigo_orcamento: string; p_senha_comparacao: string }
        Returns: Json
      }
      validar_edicao_conta_paga: {
        Args: { p_conta_id: string; p_novo_valor: number }
        Returns: Json
      }
      validar_token_comparacao: { Args: { p_token: string }; Returns: Json }
      verificar_acesso_comparacao_token: {
        Args: { p_orcamento_id: string }
        Returns: boolean
      }
      verificar_checklists_expirados: { Args: never; Returns: Json }
      verificar_contratos_expirados: { Args: never; Returns: undefined }
      verificar_limite_acesso: { Args: { user_id: string }; Returns: boolean }
      verificar_limite_candidatura: {
        Args: { p_fornecedor_id: string }
        Returns: Json
      }
      verificar_limite_propostas_fornecedor: {
        Args: { p_fornecedor_id: string }
        Returns: Json
      }
      verificar_penalidades_ativas: {
        Args: { p_fornecedor_id: string }
        Returns: Json
      }
      verificar_pendencias_atualizacao_fornecedor: {
        Args: { p_fornecedor_id: string }
        Returns: {
          cliente_nome: string
          codigo_orcamento: string
          data_candidatura: string
          inscricao_id: string
          local: string
          necessidade: string
          orcamento_id: string
          status_acompanhamento: string
          status_orcamento: string
        }[]
      }
      verificar_periodo_fechado: {
        Args: { p_conta_bancaria_id: string; p_data: string }
        Returns: boolean
      }
    }
    Enums: {
      etapa_crm_enum:
        | "orcamento_postado"
        | "contato_agendamento"
        | "em_orcamento"
        | "propostas_enviadas"
        | "compatibilizacao"
        | "fechamento_contrato"
        | "pos_venda_feedback"
        | "ganho"
        | "perdido"
      funil_reuniao_status: "agendada" | "realizada" | "no_show" | "cancelada"
      status_acompanhamento_enum:
        | "1_contato_realizado"
        | "2_contato_realizado"
        | "3_contato_realizado"
        | "4_contato_realizado"
        | "5_contato_realizado"
        | "cliente_respondeu_nao_agendou"
        | "visita_agendada"
        | "visita_realizada"
        | "orcamento_enviado"
        | "negocio_fechado"
        | "negocio_perdido"
        | "nao_respondeu_mensagens"
      status_contato_enum:
        | "sem_contato"
        | "em_contato"
        | "visita_agendada"
        | "visita_realizada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      etapa_crm_enum: [
        "orcamento_postado",
        "contato_agendamento",
        "em_orcamento",
        "propostas_enviadas",
        "compatibilizacao",
        "fechamento_contrato",
        "pos_venda_feedback",
        "ganho",
        "perdido",
      ],
      funil_reuniao_status: ["agendada", "realizada", "no_show", "cancelada"],
      status_acompanhamento_enum: [
        "1_contato_realizado",
        "2_contato_realizado",
        "3_contato_realizado",
        "4_contato_realizado",
        "5_contato_realizado",
        "cliente_respondeu_nao_agendou",
        "visita_agendada",
        "visita_realizada",
        "orcamento_enviado",
        "negocio_fechado",
        "negocio_perdido",
        "nao_respondeu_mensagens",
      ],
      status_contato_enum: [
        "sem_contato",
        "em_contato",
        "visita_agendada",
        "visita_realizada",
      ],
    },
  },
} as const
