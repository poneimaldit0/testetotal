import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCRMMarcenaria } from "@/hooks/useCRMMarcenaria";
import { useMarcemariaFilters } from "@/hooks/useMarcemariaFilters";
import { ETAPAS_MARCENARIA, ETAPAS_MARCENARIA_ARQUIVADAS, isEtapaArquivada } from "@/constants/crmMarcenaria";
import { LeadMarcenariaComChecklist, EtapaMarcenaria } from "@/types/crmMarcenaria";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Filter, Eye, EyeOff, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LeadMarcenáriaCard } from "./crm/marcenaria/LeadMarcenariaCard";
import { ModalDetalhesLeadMarcenaria } from "./crm/marcenaria/ModalDetalhesLeadMarcenaria";
import { FiltrosAvancadosMarcenaria } from "./crm/marcenaria/FiltrosAvancadosMarcenaria";
import { ApropriarLeadsMarcenariaMassa } from "./crm/marcenaria/ApropriarLeadsMarcenariaMassa";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEtapasConfig } from "@/hooks/useEtapasConfig";

export function CRMKanbanMarcenaria() {
  const { profile } = useAuth();
  const { leads, isLoading, refetch } = useCRMMarcenaria(profile);
  const { etapasAtivas: etapasConfigBanco } = useEtapasConfig('marcenaria');
  const [leadSelecionado, setLeadSelecionado] = useState<LeadMarcenariaComChecklist | null>(null);
  const [mostrarArquivados, setMostrarArquivados] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [modalApropriacaoAberto, setModalApropriacaoAberto] = useState(false);

  // Buscar lista de consultores para o filtro
  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores-marcenaria'],
    queryFn: async () => {
      // Query usando any para evitar problemas de tipo
      const { data, error } = await (supabase as any)
        .from('usuarios')
        .select('id, nome')
        .eq('tipo', 'admin')
        .order('nome');
      
      if (error) {
        console.error('Erro ao buscar consultores:', error);
        return [];
      }
      return (data || []) as Array<{ id: string; nome: string }>;
    }
  });

  // Hook de filtros
  const { 
    filtros, 
    setFiltros, 
    leadsFiltrados, 
    filtrosAtivos 
  } = useMarcemariaFilters(leads, profile?.id);

  // Usar etapas do banco ou fallback para constantes
  const etapasAtivas = useMemo(() => {
    if (etapasConfigBanco && etapasConfigBanco.length > 0) {
      return etapasConfigBanco.filter(e => e.tipo === 'normal').map(e => ({
        valor: e.valor as any,
        titulo: e.titulo,
        descricao: e.descricao || '',
        cor: e.cor,
        icone: e.icone,
        bloqueado: e.bloqueado || false
      }));
    }
    return ETAPAS_MARCENARIA;
  }, [etapasConfigBanco]);

  const etapasArquivadas = useMemo(() => {
    if (etapasConfigBanco && etapasConfigBanco.length > 0) {
      return etapasConfigBanco.filter(e => e.tipo === 'arquivado').map(e => ({
        valor: e.valor as any,
        titulo: e.titulo,
        descricao: e.descricao || '',
        cor: e.cor,
        icone: e.icone
      }));
    }
    return ETAPAS_MARCENARIA_ARQUIVADAS;
  }, [etapasConfigBanco]);

  // Criar mapa de config por etapa para passar aos cards
  const configPorEtapa = useMemo(() => {
    const map: Record<string, typeof etapasConfigBanco[0]> = {};
    if (etapasConfigBanco) {
      etapasConfigBanco.forEach(e => {
        map[e.valor] = e;
      });
    }
    return map;
  }, [etapasConfigBanco]);

  // Organizar leads por etapa (ativos e arquivados juntos)
  const leadsPorEtapa = useMemo(() => {
    const grupos: Record<string, LeadMarcenariaComChecklist[]> = {};
    
    // Etapas ativas
    etapasAtivas.forEach(etapa => {
      grupos[etapa.valor] = leadsFiltrados.filter(lead => lead.etapa_marcenaria === etapa.valor);
    });
    
    // Etapas arquivadas
    etapasArquivadas.forEach(etapa => {
      grupos[etapa.valor] = leadsFiltrados.filter(lead => lead.etapa_marcenaria === etapa.valor);
    });
    
    return grupos;
  }, [leadsFiltrados, etapasAtivas, etapasArquivadas]);

  // Contar leads ativos e arquivados
  const { leadsAtivos, leadsArquivados } = useMemo(() => {
    const ativos = leadsFiltrados.filter(lead => !isEtapaArquivada(lead.etapa_marcenaria)).length;
    const arquivados = leadsFiltrados.filter(lead => isEtapaArquivada(lead.etapa_marcenaria)).length;
    return { leadsAtivos: ativos, leadsArquivados: arquivados };
  }, [leadsFiltrados]);

  // Contar leads sem apropriação
  const leadsSemApropriacao = useMemo(() => {
    return leadsFiltrados.filter(lead => !lead.consultor_responsavel_id);
  }, [leadsFiltrados]);

  const handleAbrirLead = (lead: LeadMarcenariaComChecklist) => {
    // Não permitir abrir lead bloqueado
    if (lead.bloqueado) {
      return;
    }
    setLeadSelecionado(lead);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando leads de marcenaria...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="space-y-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🪚 CRM Marcenaria
          </h2>
          <p className="text-sm text-muted-foreground">
            {leadsFiltrados.length} de {leads.length} leads
            {filtrosAtivos > 0 && ` • ${filtrosAtivos} filtro(s) ativo(s)`}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10">
            {leadsAtivos} leads ativos
          </Badge>
          <Badge variant="outline" className="bg-muted">
            {leadsArquivados} arquivados
          </Badge>
          {leadsSemApropriacao.length > 0 && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
              {leadsSemApropriacao.length} sem apropriação
            </Badge>
          )}
          
          {leadsSemApropriacao.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalApropriacaoAberto(true)}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Apropriar Todos
            </Button>
          )}
          
          <Popover open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {filtrosAtivos > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {filtrosAtivos}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="p-0 w-auto">
              <FiltrosAvancadosMarcenaria
                filtros={filtros}
                onFiltrosChange={setFiltros}
                onClose={() => setFiltrosAbertos(false)}
                consultores={consultores}
              />
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarArquivados(!mostrarArquivados)}
          >
            {mostrarArquivados ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {mostrarArquivados ? 'Ocultar' : 'Mostrar'} Arquivados
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Kanban - Todas as Etapas */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Etapas Ativas */}
        {etapasAtivas.map((etapa) => {
          const leadsNaEtapa = leadsPorEtapa[etapa.valor] || [];
          const etapaBloqueada = etapa.bloqueado;

          return (
            <Card key={etapa.valor} className="flex-shrink-0 w-80 p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span>{etapa.icone}</span>
                    <span>{etapa.titulo}</span>
                  </h3>
                  <Badge variant="secondary" className={etapa.cor}>
                    {leadsNaEtapa.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{etapa.descricao}</p>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {leadsNaEtapa.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum lead nesta etapa
                  </div>
                ) : (
                  leadsNaEtapa.map((lead) => (
                    <LeadMarcenáriaCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => handleAbrirLead(lead)}
                      bloqueado={etapaBloqueada}
                      configEtapa={configPorEtapa[etapa.valor]}
                    />
                  ))
                )}
              </div>
            </Card>
          );
        })}

        {/* Etapas Arquivadas */}
        {mostrarArquivados && etapasArquivadas.map((etapa) => {
          const leadsNaEtapa = leadsPorEtapa[etapa.valor] || [];

          return (
            <Card key={etapa.valor} className="flex-shrink-0 w-80 p-4 space-y-3 border-l-4" style={{ borderLeftColor: etapa.valor === 'ganho' ? '#16a34a' : '#dc2626' }}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span>{etapa.icone}</span>
                    <span>{etapa.titulo}</span>
                  </h3>
                  <Badge variant="secondary" className={etapa.cor}>
                    {leadsNaEtapa.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{etapa.descricao}</p>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {leadsNaEtapa.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum lead nesta etapa
                  </div>
                ) : (
                  leadsNaEtapa.map((lead) => (
                    <LeadMarcenáriaCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => handleAbrirLead(lead)}
                      configEtapa={configPorEtapa[etapa.valor]}
                    />
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal de Detalhes */}
      {leadSelecionado && (
        <ModalDetalhesLeadMarcenaria
          lead={leadSelecionado}
          open={!!leadSelecionado}
          onClose={() => setLeadSelecionado(null)}
        />
      )}

      {/* Modal de Apropriação em Massa */}
      <ApropriarLeadsMarcenariaMassa
        isOpen={modalApropriacaoAberto}
        onClose={() => setModalApropriacaoAberto(false)}
        leadsIds={leadsSemApropriacao.map(lead => lead.id)}
      />
    </div>
  );
}
