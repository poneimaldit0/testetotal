import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PrazoInfo {
  candidaturaId: string;
  dataLimite: Date | null;
  diasRestantes: number;
  horasRestantes: number;
  minutosRestantes: number;
  vencido: boolean;
  podeDesistir: boolean;
  statusUrgencia: 'verde' | 'amarelo' | 'vermelho';
  textoTempo: string;
}

export const usePrazosPropostas = (candidaturaId?: string) => {
  const [prazoInfo, setPrazoInfo] = useState<PrazoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const calcularPrazo = useCallback((dataLimite: Date | null): PrazoInfo => {
    const agora = new Date();
    
    if (!dataLimite) {
      return {
        candidaturaId: candidaturaId || '',
        dataLimite: null,
        diasRestantes: 0,
        horasRestantes: 0,
        minutosRestantes: 0,
        vencido: false,
        podeDesistir: true,
        statusUrgencia: 'verde',
        textoTempo: 'Sem prazo definido'
      };
    }

    const diferenca = dataLimite.getTime() - agora.getTime();
    const vencido = diferenca <= 0;
    
    const diasRestantes = Math.floor(Math.abs(diferenca) / (1000 * 60 * 60 * 24));
    const horasRestantes = Math.floor((Math.abs(diferenca) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutosRestantes = Math.floor((Math.abs(diferenca) % (1000 * 60 * 60)) / (1000 * 60));

    // Determinar status de urgência
    let statusUrgencia: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    if (vencido) {
      statusUrgencia = 'vermelho';
    } else if (diasRestantes <= 1) {
      statusUrgencia = 'vermelho';
    } else if (diasRestantes <= 3) {
      statusUrgencia = 'amarelo';
    }

    // Pode desistir se ainda não venceu ou se venceu há menos de 24 horas
    const podeDesistir = !vencido || diasRestantes === 0;

    // Texto descritivo
    let textoTempo: string;
    if (vencido) {
      if (diasRestantes > 0) {
        textoTempo = `Vencido há ${diasRestantes} dias`;
      } else if (horasRestantes > 0) {
        textoTempo = `Vencido há ${horasRestantes}h`;
      } else {
        textoTempo = `Vencido há ${minutosRestantes}min`;
      }
    } else {
      if (diasRestantes > 0) {
        textoTempo = `${diasRestantes} dias restantes`;
      } else if (horasRestantes > 0) {
        textoTempo = `${horasRestantes}h ${minutosRestantes}min restantes`;
      } else {
        textoTempo = `${minutosRestantes} minutos restantes`;
      }
    }

    return {
      candidaturaId: candidaturaId || '',
      dataLimite,
      diasRestantes,
      horasRestantes,
      minutosRestantes,
      vencido,
      podeDesistir,
      statusUrgencia,
      textoTempo
    };
  }, [candidaturaId]);

  const carregarPrazo = useCallback(async () => {
    if (!candidaturaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: candidatura, error } = await supabase
        .from('candidaturas_fornecedores')
        .select('data_limite_envio')
        .eq('id', candidaturaId)
        .single();

      if (error) {
        console.error('Erro ao buscar prazo:', error);
        setLoading(false);
        return;
      }

      const dataLimite = candidatura?.data_limite_envio ? new Date(candidatura.data_limite_envio) : null;
      const info = calcularPrazo(dataLimite);
      setPrazoInfo(info);

    } catch (error) {
      console.error('Erro geral ao carregar prazo:', error);
    } finally {
      setLoading(false);
    }
  }, [candidaturaId, calcularPrazo]);

  // Atualizar contador em tempo real
  useEffect(() => {
    if (!prazoInfo?.dataLimite) return;

    const interval = setInterval(() => {
      const novaInfo = calcularPrazo(prazoInfo.dataLimite);
      setPrazoInfo(novaInfo);
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [prazoInfo?.dataLimite, calcularPrazo]);

  useEffect(() => {
    carregarPrazo();
  }, [carregarPrazo]);

  return {
    prazoInfo,
    loading,
    recarregar: carregarPrazo
  };
};