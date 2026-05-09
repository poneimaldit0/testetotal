import { useState } from "react";
import { format, startOfYear } from "date-fns";

export interface FiltrosRelatorioCRM {
  dataInicio: string;
  dataFim: string;
  gestorId?: string;
  fornecedorId?: string;
  mes?: number;
  ano?: number;
}

export const useFiltrosRelatorioCRM = () => {
  // Calcular datas padrão: ano atual
  const hoje = new Date();
  const inicioPadrao = format(startOfYear(hoje), 'yyyy-MM-dd');
  const fimPadrao = format(hoje, 'yyyy-MM-dd');

  const [filtros, setFiltros] = useState<FiltrosRelatorioCRM>({
    dataInicio: inicioPadrao,
    dataFim: fimPadrao,
    gestorId: undefined,
    fornecedorId: undefined,
    mes: undefined,
    ano: undefined,
  });

  const atualizarFiltro = <K extends keyof FiltrosRelatorioCRM>(
    campo: K,
    valor: FiltrosRelatorioCRM[K]
  ) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const limparFiltros = () => {
    const hoje = new Date();
    const inicioPadrao = format(startOfYear(hoje), 'yyyy-MM-dd');
    const fimPadrao = format(hoje, 'yyyy-MM-dd');
    
    setFiltros({
      dataInicio: inicioPadrao,
      dataFim: fimPadrao,
      gestorId: undefined,
      fornecedorId: undefined,
      mes: undefined,
      ano: undefined,
    });
  };

  const obterDataInicio = (): Date | undefined => {
    return filtros.dataInicio ? new Date(filtros.dataInicio) : undefined;
  };

  const obterDataFim = (): Date | undefined => {
    return filtros.dataFim ? new Date(filtros.dataFim) : undefined;
  };

  const temFiltrosAtivos = (): boolean => {
    return !!(
      filtros.dataInicio ||
      filtros.dataFim ||
      filtros.gestorId ||
      filtros.fornecedorId ||
      filtros.mes ||
      filtros.ano
    );
  };

  return {
    filtros,
    atualizarFiltro,
    limparFiltros,
    obterDataInicio,
    obterDataFim,
    temFiltrosAtivos,
  };
};
