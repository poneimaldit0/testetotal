import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry {
  userId: string;
  diasRestantes: number | null;
  fetchedAt: number;
}

// TTL do cache local (em ms). Mantém o resultado fresco por 30s para evitar
// re-fetch quando múltiplos componentes consomem o mesmo hook em sequência.
const CACHE_TTL_MS = 30_000;

export interface UseDiasRestantesContratoResult {
  diasRestantes: number | null;
  loading: boolean;
  recarregar: () => Promise<void>;
}

/**
 * Hook reativo para obter dias restantes do contrato do fornecedor.
 * - Chama a RPC `calcular_dias_restantes_contrato` (mesma lógica antes inline em ContratoInfo).
 * - Cacheia o último resultado por 30s (por userId) para evitar re-fetch desnecessário.
 * - Quando `userId` é undefined/empty, retorna estado neutro (sem chamada).
 */
export const useDiasRestantesContrato = (userId?: string): UseDiasRestantesContratoResult => {
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const cacheRef = useRef<CacheEntry | null>(null);

  const fetchDias = useCallback(async (force = false) => {
    if (!userId) {
      setDiasRestantes(null);
      setLoading(false);
      return;
    }

    // Reaproveita cache válido para o mesmo userId.
    const now = Date.now();
    const cached = cacheRef.current;
    if (
      !force &&
      cached &&
      cached.userId === userId &&
      now - cached.fetchedAt < CACHE_TTL_MS
    ) {
      setDiasRestantes(cached.diasRestantes);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('calcular_dias_restantes_contrato', {
        user_id: userId,
      });

      if (error) {
        console.error('Erro ao calcular dias restantes:', error);
        cacheRef.current = { userId, diasRestantes: null, fetchedAt: now };
        setDiasRestantes(null);
        return;
      }

      const valor = (data as number | null) ?? null;
      cacheRef.current = { userId, diasRestantes: valor, fetchedAt: now };
      setDiasRestantes(valor);
    } catch (error) {
      console.error('Erro ao buscar dias restantes:', error);
      setDiasRestantes(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDias();
  }, [fetchDias]);

  const recarregar = useCallback(async () => {
    await fetchDias(true);
  }, [fetchDias]);

  return { diasRestantes, loading, recarregar };
};
