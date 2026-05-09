
import { useState, useMemo } from 'react';
import { OrcamentoGlobal } from './useOrcamentosGlobal';
import { obterPrioridadePrazo } from '@/utils/orcamentoUtils';

export interface Filtros {
  local: string;
  categoria: string;
  prazoInicio: string;
  metragemMin: string;
  metragemMax: string;
  dataInicio: string;
  dataFim: string;
  ordenacao: string;
}

export const useOrcamentoFilters = (orcamentos: OrcamentoGlobal[]) => {
  const [filtros, setFiltros] = useState<Filtros>({
    local: '',
    categoria: '',
    prazoInicio: '',
    metragemMin: '',
    metragemMax: '',
    dataInicio: '',
    dataFim: '',
    ordenacao: 'recentes',
  });

  const orcamentosFiltrados = useMemo(() => {
    let filtrados = orcamentos.filter(orcamento => {
      // Filtro por categoria
      if (filtros.categoria && !orcamento.categorias.includes(filtros.categoria)) return false;
      
      // Filtro por prazo de início
      if (filtros.prazoInicio && orcamento.prazoInicioTexto !== filtros.prazoInicio) return false;
      
      // Filtro de local
      if (filtros.local && !orcamento.local.toLowerCase().includes(filtros.local.toLowerCase())) return false;
      
      // Filtro de metragem
      if (filtros.metragemMin && orcamento.tamanhoImovel < parseInt(filtros.metragemMin)) return false;
      if (filtros.metragemMax && orcamento.tamanhoImovel > parseInt(filtros.metragemMax)) return false;
      
      // Filtro de data
      if (filtros.dataInicio) {
        const dataFiltro = new Date(filtros.dataInicio);
        if (orcamento.dataPublicacao < dataFiltro) return false;
      }
      if (filtros.dataFim) {
        const dataFiltro = new Date(filtros.dataFim);
        if (orcamento.dataPublicacao > dataFiltro) return false;
      }
      
      return true;
    });

    // Aplicar ordenação
    switch (filtros.ordenacao) {
      case 'antigos':
        filtrados.sort((a, b) => a.dataPublicacao.getTime() - b.dataPublicacao.getTime());
        break;
      case 'prazo_urgente':
        filtrados.sort((a, b) => {
          const prioridadeA = obterPrioridadePrazo(a.dataInicio);
          const prioridadeB = obterPrioridadePrazo(b.dataInicio);
          return prioridadeA - prioridadeB;
        });
        break;
      case 'maior_metragem':
        filtrados.sort((a, b) => b.tamanhoImovel - a.tamanhoImovel);
        break;
      case 'menor_metragem':
        filtrados.sort((a, b) => a.tamanhoImovel - b.tamanhoImovel);
        break;
      case 'recentes':
      default:
        // Abertos primeiro, depois fechados, ambos ordenados por data
        filtrados.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'aberto' ? -1 : 1;
          }
          return b.dataPublicacao.getTime() - a.dataPublicacao.getTime();
        });
        break;
    }

    return filtrados;
  }, [orcamentos, filtros]);

  const handleFiltroChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
  };

  const handleLimparFiltros = () => {
    setFiltros({
      local: '',
      categoria: '',
      prazoInicio: '',
      metragemMin: '',
      metragemMax: '',
      dataInicio: '',
      dataFim: '',
      ordenacao: 'recentes',
    });
  };

  const contarFiltrosAtivos = () => {
    return Object.entries(filtros).filter(([key, value]) => 
      value && key !== 'ordenacao' && value !== 'recentes'
    ).length;
  };

  return {
    filtros,
    orcamentosFiltrados,
    handleFiltroChange,
    handleLimparFiltros,
    contarFiltrosAtivos,
  };
};
