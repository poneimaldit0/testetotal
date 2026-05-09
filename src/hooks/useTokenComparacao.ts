import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTokenComparacao = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const gerarToken = async (orcamentoId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .rpc('gerar_token_comparacao', { p_orcamento_id: orcamentoId });

      if (error || !(data as any)?.success) {
        throw new Error((data as any)?.message || 'Erro ao gerar token de comparação');
      }

      const result = data as any;
      const baseUrl = window.location.origin;
      const linkComparacao = `${baseUrl}/comparar?token=${result.token}`;

      toast({
        title: "Token gerado com sucesso",
        description: "Link de comparação copiado para o clipboard",
      });

      // Copiar para clipboard
      await navigator.clipboard.writeText(linkComparacao);

      return {
        success: true,
        token: result.token,
        link: linkComparacao,
        expires_at: result.expires_at
      };

    } catch (err: any) {
      console.error('Erro ao gerar token:', err);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const gerarLinkWhatsApp = (telefone: string, link: string, necessidade: string) => {
    const mensagem = `Olá! Aqui está o link para comparar as propostas do seu orçamento "${necessidade}": ${link}`;
    const telefoneFormatado = telefone.replace(/\D/g, '');
    const telefoneComCodigo = telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`;
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${telefoneComCodigo}&text=${encodeURIComponent(mensagem)}&type=phone_number&app_absent=0`;
    return whatsappUrl;
  };

  return {
    gerarToken,
    gerarLinkWhatsApp,
    loading
  };
};