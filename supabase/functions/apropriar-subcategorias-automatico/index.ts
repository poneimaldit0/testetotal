import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { corsHeaders } from '../_shared/cors.ts';

interface RegraApropriacao {
  padroes: string[];
  categoria_nome: string;
  subcategoria_nome: string;
  prioridade: number;
}

// Regras de matching para Contas a Receber
const regrasContasReceber: RegraApropriacao[] = [
  {
    padroes: ['homologacao', 'sinal', 'parcela 1'],
    categoria_nome: 'Homologação',
    subcategoria_nome: 'Novos Fornecedores',
    prioridade: 10
  },
  {
    padroes: ['homologacao', 'parcela 2', 'parcela 3', 'parcela 4', 'recorrencia'],
    categoria_nome: 'Homologação',
    subcategoria_nome: 'Recorrência de Fornecedor',
    prioridade: 9
  },
  {
    padroes: ['comissao', 'comissionamento', 'obra'],
    categoria_nome: 'Comissionamento de reforma',
    subcategoria_nome: 'Comissionamento de obra',
    prioridade: 10
  },
  {
    padroes: ['comissao', 'comissionamento', 'projeto', 'vidracaria', 'marmoraria', 'material'],
    categoria_nome: 'Comissionamento de materiais',
    subcategoria_nome: 'Comissionamento de materiais',
    prioridade: 9
  },
  {
    padroes: ['reparos de obra', 'reparo'],
    categoria_nome: 'Produtos complementares',
    subcategoria_nome: 'Reparos de Obra',
    prioridade: 10
  }
];

// Regras de matching para Contas a Pagar
const regrasContasPagar: RegraApropriacao[] = [
  {
    padroes: ['pro-labore', 'prolabore'],
    categoria_nome: 'Despesas Fixas',
    subcategoria_nome: 'Pró-Labore',
    prioridade: 10
  },
  {
    padroes: ['salario', 'concierge'],
    categoria_nome: 'Despesas Fixas',
    subcategoria_nome: 'Concierge',
    prioridade: 10
  },
  {
    padroes: ['salario', 'sdr cliente', 'sdr - cliente'],
    categoria_nome: 'Despesas Fixas',
    subcategoria_nome: 'SDR - Cliente reforma',
    prioridade: 10
  },
  {
    padroes: ['salario', 'sdr fornecedor', 'sdr - fornecedor'],
    categoria_nome: 'Despesas Fixas',
    subcategoria_nome: 'SDR - Fornecedores',
    prioridade: 10
  },
  {
    padroes: ['assessoria juridica', 'juridico'],
    categoria_nome: 'Despesas Fixas',
    subcategoria_nome: 'Assessoria Juridica',
    prioridade: 10
  },
  {
    padroes: ['vr', 'vt', 'transporte', 'alimentacao'],
    categoria_nome: 'Despesas Fixas',
    subcategoria_nome: 'Escritório',
    prioridade: 9
  },
  {
    padroes: ['salario', 'closer'],
    categoria_nome: 'Despesas Fixas',
    subcategoria_nome: 'Closer',
    prioridade: 8
  },
  {
    padroes: ['software', 'assinatura', 'chatgpt', 'canva', 'crm', 'ferramenta'],
    categoria_nome: 'Custos Indiretos Variáveis',
    subcategoria_nome: 'Software',
    prioridade: 10
  },
  {
    padroes: ['hospedagem', 'site', 'servidor'],
    categoria_nome: 'Custos Indiretos Variáveis',
    subcategoria_nome: 'Hospedagem',
    prioridade: 10
  },
  {
    padroes: ['hospedagem', 'e-mail', 'email'],
    categoria_nome: 'Custos Indiretos Variáveis',
    subcategoria_nome: 'Hospedagem',
    prioridade: 9
  },
  {
    padroes: ['branding', 'thiago lacerda', 'design grafico'],
    categoria_nome: 'Custos Indiretos Variáveis',
    subcategoria_nome: 'Branding',
    prioridade: 10
  },
  {
    padroes: ['marketing', 'prospeccao', 'plataforma'],
    categoria_nome: 'Custos Indiretos Variáveis',
    subcategoria_nome: 'Marketing',
    prioridade: 9
  },
  {
    padroes: ['contratacao', 'vaga', 'recrutamento'],
    categoria_nome: 'Custos Indiretos Variáveis',
    subcategoria_nome: 'Terceirização de Contratação',
    prioridade: 10
  },
  {
    padroes: ['supabase', 'banco de dados', 'database'],
    categoria_nome: 'Custos Indiretos Variáveis',
    subcategoria_nome: 'Banco de Dados',
    prioridade: 10
  },
  {
    padroes: ['trafego pago', 'ads', 'anuncios'],
    categoria_nome: 'Custos variáveis',
    subcategoria_nome: 'Tráfego pago',
    prioridade: 10
  },
  {
    padroes: ['simples nacional', 'receita federal', 'darf', 'cef matriz', 'imposto'],
    categoria_nome: 'Custos variáveis',
    subcategoria_nome: 'Impostos',
    prioridade: 10
  },
  {
    padroes: ['bonus', 'bonificacao'],
    categoria_nome: 'Custos variáveis',
    subcategoria_nome: 'Bônus',
    prioridade: 10
  },
  {
    padroes: ['confraternizacao', 'festa', 'evento'],
    categoria_nome: 'Custos variáveis',
    subcategoria_nome: 'Confraternização',
    prioridade: 10
  },
  {
    padroes: ['computador', 'webcam', 'mouse', 'teclado', 'monitor'],
    categoria_nome: 'Custos variáveis',
    subcategoria_nome: 'Equipamentos',
    prioridade: 10
  },
  {
    padroes: ['reembolso', 'materiais', 'suprimentos'],
    categoria_nome: 'Custos variáveis',
    subcategoria_nome: 'Materiais/Suprimentos Escritório',
    prioridade: 9
  },
  {
    padroes: ['agua', 'galao'],
    categoria_nome: 'Custos variáveis',
    subcategoria_nome: 'Equipamentos',
    prioridade: 8
  },
  {
    padroes: ['comissionamento', 'comissao'],
    categoria_nome: 'Dedução de receita',
    subcategoria_nome: 'Comissões',
    prioridade: 9
  },
  {
    padroes: ['reembolso', 'homologacao'],
    categoria_nome: 'Dedução de receita',
    subcategoria_nome: 'Reembolso',
    prioridade: 10
  },
  {
    padroes: ['taxas', 'notificacao', 'tarifa'],
    categoria_nome: 'Dedução de receita',
    subcategoria_nome: 'Taxas',
    prioridade: 10
  }
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function encontrarSubcategoria(
  descricao: string,
  categoriaNome: string,
  regras: RegraApropriacao[]
): { subcategoriaNome: string | null; confianca: 'alta' | 'media' | 'baixa'; regra?: RegraApropriacao } {
  const descNorm = normalizar(descricao);
  const catNorm = normalizar(categoriaNome);
  
  // Filtrar regras pela categoria e ordenar por prioridade
  const regrasCategoria = regras
    .filter(r => normalizar(r.categoria_nome) === catNorm)
    .sort((a, b) => b.prioridade - a.prioridade);
  
  for (const regra of regrasCategoria) {
    const matches = regra.padroes.filter(p => descNorm.includes(normalizar(p)));
    
    if (matches.length > 0) {
      // Alta confiança: 2+ padrões matched ou 1 padrão com prioridade 10
      // Média confiança: 1 padrão com prioridade < 10
      const confianca = matches.length >= 2 || regra.prioridade === 10 ? 'alta' : 'media';
      return { subcategoriaNome: regra.subcategoria_nome, confianca, regra };
    }
  }
  
  return { subcategoriaNome: null, confianca: 'baixa' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { modo = 'dry_run', tipo = 'todas', ids_selecionados = [] } = await req.json();

    console.log(`[Apropriação Automática] Iniciando em modo: ${modo}, tipo: ${tipo}`);

    // Buscar todas as categorias e subcategorias para mapear IDs
    const { data: categorias, error: catError } = await supabaseClient
      .from('categorias_financeiras')
      .select('id, nome');

    if (catError) throw catError;

    const { data: subcategorias, error: subError } = await supabaseClient
      .from('subcategorias_financeiras')
      .select('id, nome, categoria_id');

    if (subError) throw subError;

    // Criar mapas para lookup rápido
    const categoriaMap = new Map(categorias.map(c => [normalizar(c.nome), c.id]));
    const subcategoriaMap = new Map(
      subcategorias.map(s => [`${s.categoria_id}:${normalizar(s.nome)}`, s.id])
    );

    const resultado = {
      total_analisadas: 0,
      apropriadas_com_sucesso: 0,
      sem_match: 0,
      detalhes: [] as any[],
      sem_match_lista: [] as any[]
    };

    // Processar Contas a Receber
    if (tipo === 'todas' || tipo === 'contas_receber') {
      const { data: contasReceber, error: crError } = await supabaseClient
        .from('contas_receber')
        .select(`
          id, 
          descricao, 
          categoria_id,
          cliente_nome,
          cliente_email,
          cliente_telefone,
          valor_original,
          data_vencimento,
          status,
          observacoes,
          categorias_financeiras!inner(nome)
        `)
        .is('subcategoria_id', null)
        .not('categoria_id', 'is', null);

      if (crError) throw crError;

      console.log(`[Apropriação Automática] Processando ${contasReceber.length} contas a receber`);

      for (const conta of contasReceber) {
        resultado.total_analisadas++;
        const categoriaNome = (conta as any).categorias_financeiras.nome;
        
        const match = encontrarSubcategoria(conta.descricao, categoriaNome, regrasContasReceber);
        
        if (match.subcategoriaNome) {
          const subcategoriaId = subcategoriaMap.get(`${conta.categoria_id}:${normalizar(match.subcategoriaNome)}`);
          
          if (subcategoriaId) {
            if (modo === 'executar') {
              // Se ids_selecionados está vazio, apropriar todas. Senão, apenas as selecionadas
              const deveApropriar = ids_selecionados.length === 0 || ids_selecionados.includes(conta.id);
              
              if (deveApropriar) {
                const { error: updateError } = await supabaseClient
                  .from('contas_receber')
                  .update({ subcategoria_id: subcategoriaId })
                  .eq('id', conta.id);

                if (updateError) {
                  console.error(`Erro ao atualizar conta ${conta.id}:`, updateError);
                  continue;
                }
              }
            }

            resultado.apropriadas_com_sucesso++;
            resultado.detalhes.push({
              id: conta.id,
              tipo: 'conta_receber',
              descricao: conta.descricao,
              categoria: categoriaNome,
              subcategoria_apropriada: match.subcategoriaNome,
              confianca: match.confianca,
              padroes_encontrados: match.regra?.padroes.filter(p => 
                normalizar(conta.descricao).includes(normalizar(p))
              ),
              pessoa_nome: conta.cliente_nome,
              pessoa_email: conta.cliente_email,
              pessoa_telefone: conta.cliente_telefone,
              valor_original: conta.valor_original,
              data_vencimento: conta.data_vencimento,
              status: conta.status,
              observacoes: conta.observacoes
            });
          }
        } else {
          resultado.sem_match++;
          resultado.sem_match_lista.push({
            id: conta.id,
            tipo: 'conta_receber',
            descricao: conta.descricao,
            categoria: categoriaNome
          });
        }
      }
    }

    // Processar Contas a Pagar
    if (tipo === 'todas' || tipo === 'contas_pagar') {
      const { data: contasPagar, error: cpError } = await supabaseClient
        .from('contas_pagar')
        .select(`
          id, 
          descricao, 
          categoria_id,
          fornecedor_nome,
          fornecedor_email,
          fornecedor_telefone,
          valor_original,
          data_vencimento,
          status,
          observacoes,
          categorias_financeiras!inner(nome)
        `)
        .is('subcategoria_id', null)
        .not('categoria_id', 'is', null);

      if (cpError) throw cpError;

      console.log(`[Apropriação Automática] Processando ${contasPagar.length} contas a pagar`);

      for (const conta of contasPagar) {
        resultado.total_analisadas++;
        const categoriaNome = (conta as any).categorias_financeiras.nome;
        
        const match = encontrarSubcategoria(conta.descricao, categoriaNome, regrasContasPagar);
        
        if (match.subcategoriaNome) {
          const subcategoriaId = subcategoriaMap.get(`${conta.categoria_id}:${normalizar(match.subcategoriaNome)}`);
          
          if (subcategoriaId) {
            if (modo === 'executar') {
              // Se ids_selecionados está vazio, apropriar todas. Senão, apenas as selecionadas
              const deveApropriar = ids_selecionados.length === 0 || ids_selecionados.includes(conta.id);
              
              if (deveApropriar) {
                const { error: updateError } = await supabaseClient
                  .from('contas_pagar')
                  .update({ subcategoria_id: subcategoriaId })
                  .eq('id', conta.id);

                if (updateError) {
                  console.error(`Erro ao atualizar conta ${conta.id}:`, updateError);
                  continue;
                }
              }
            }

            resultado.apropriadas_com_sucesso++;
            resultado.detalhes.push({
              id: conta.id,
              tipo: 'conta_pagar',
              descricao: conta.descricao,
              categoria: categoriaNome,
              subcategoria_apropriada: match.subcategoriaNome,
              confianca: match.confianca,
              padroes_encontrados: match.regra?.padroes.filter(p => 
                normalizar(conta.descricao).includes(normalizar(p))
              ),
              pessoa_nome: conta.fornecedor_nome,
              pessoa_email: conta.fornecedor_email,
              pessoa_telefone: conta.fornecedor_telefone,
              valor_original: conta.valor_original,
              data_vencimento: conta.data_vencimento,
              status: conta.status,
              observacoes: conta.observacoes
            });
          }
        } else {
          resultado.sem_match++;
          resultado.sem_match_lista.push({
            id: conta.id,
            tipo: 'conta_pagar',
            descricao: conta.descricao,
            categoria: categoriaNome
          });
        }
      }
    }

    console.log(`[Apropriação Automática] Concluído: ${resultado.apropriadas_com_sucesso}/${resultado.total_analisadas} apropriadas`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        modo,
        resultado
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('[Apropriação Automática] Erro:', error);
    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
