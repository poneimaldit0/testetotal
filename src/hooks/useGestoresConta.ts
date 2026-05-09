import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GestorConta {
  id: string;
  nome: string;
  email: string;
  empresa: string | null;
  status: string;
}

export const useGestoresConta = () => {
  return useQuery({
    queryKey: ["gestores-conta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("listar_gestores_conta");

      if (error) {
        console.error("Erro ao buscar gestores de conta:", error);
        toast.error("Erro ao carregar gestores de conta");
        throw error;
      }

      return (data as GestorConta[]) || [];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
};
