import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, MapPin, AlertTriangle } from 'lucide-react';

type PageState = 'loading' | 'confirm' | 'already_confirmed' | 'error' | 'success';

export default function ValidarVisita() {
  const { candidaturaId, token } = useParams<{ candidaturaId: string; token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [candidatura, setCandidatura] = useState<{ empresa: string; orcamento_id: string } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [rpcWarning, setRpcWarning] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !candidaturaId || !token) return;
    if (!user) return;

    const verificar = async () => {
      const { data, error } = await (supabase as any)
        .from('candidaturas_fornecedores')
        .select('id, empresa, nome, orcamento_id, token_visita, visita_confirmada_em, status_acompanhamento')
        .eq('id', candidaturaId)
        .maybeSingle();

      if (error || !data) {
        setPageState('error');
        return;
      }

      if (data.token_visita !== token) {
        setPageState('error');
        return;
      }

      setCandidatura({ empresa: data.empresa || data.nome, orcamento_id: data.orcamento_id });

      if (data.visita_confirmada_em) {
        setPageState('already_confirmed');
        return;
      }

      setPageState('confirm');
    };

    verificar();
  }, [authLoading, user, candidaturaId, token]);

  const confirmarVisita = async () => {
    if (!candidaturaId || !user || !candidatura) return;
    setConfirmando(true);
    try {
      const { error } = await (supabase as any)
        .from('candidaturas_fornecedores')
        .update({
          visita_confirmada_em:  new Date().toISOString(),
          visita_confirmada_por: user.id,
          status_acompanhamento: 'visita_realizada',
        })
        .eq('id', candidaturaId);

      if (error) throw error;

      // Garante que o lead esteja em em_orcamento se há pelo menos 1 candidatura realizada
      try {
        const { data: realizadas, error: qErr } = await (supabase as any)
          .from('candidaturas_fornecedores')
          .select('id')
          .eq('orcamento_id', candidatura.orcamento_id)
          .in('status_acompanhamento', ['visita_realizada', 'reuniao_realizada']);

        if (qErr) throw qErr;

        if (realizadas && realizadas.length >= 1) {
          const { error: rpcErr } = await (supabase as any).rpc('mover_orcamento_etapa', {
            p_orcamento_id: candidatura.orcamento_id,
            p_nova_etapa:   'em_orcamento',
            p_usuario_id:   user.id,
          });

          if (rpcErr) throw rpcErr;
        }
      } catch (rpcEx) {
        console.error('[ValidarVisita] liberação CRM falhou:', rpcEx);
        setRpcWarning('Visita confirmada, mas houve um erro ao liberar o lead para o consultor. A equipe será notificada.');
      }

      setPageState('success');
    } catch (err) {
      console.error('[ValidarVisita] confirmarVisita:', err);
      setPageState('error');
    } finally {
      setConfirmando(false);
    }
  };

  if (authLoading || pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const returnUrl = encodeURIComponent(window.location.pathname);
    return <Navigate to={`/auth?next=${returnUrl}`} replace />;
  }

  const wrapCard = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
        {children}
      </div>
    </div>
  );

  if (pageState === 'error') return wrapCard(
    <>
      <XCircle className="h-12 w-12 text-red-500 mx-auto" />
      <h2 className="text-xl font-bold text-gray-800">Link inválido</h2>
      <p className="text-sm text-gray-500">Este QR Code não é válido ou já expirou. Solicite um novo link ao seu consultor.</p>
    </>
  );

  if (pageState === 'already_confirmed') return wrapCard(
    <>
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
      <h2 className="text-xl font-bold text-gray-800">Visita já confirmada</h2>
      <p className="text-sm text-gray-500">A presença de <strong>{candidatura?.empresa}</strong> já foi registrada anteriormente.</p>
    </>
  );

  if (pageState === 'success') return wrapCard(
    <>
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
      <h2 className="text-xl font-bold text-gray-800">Visita confirmada!</h2>
      <p className="text-sm text-gray-500">Presença de <strong>{candidatura?.empresa}</strong> registrada com sucesso.</p>
      {rpcWarning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-left">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">{rpcWarning}</p>
        </div>
      )}
    </>
  );

  return wrapCard(
    <>
      <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
        <MapPin className="h-7 w-7 text-orange-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Confirmar visita</h2>
      <p className="text-sm text-gray-500">
        Confirme a presença de <strong>{candidatura?.empresa}</strong> neste imóvel.
      </p>
      <Button
        className="w-full bg-orange-600 hover:bg-orange-700"
        size="lg"
        disabled={confirmando}
        onClick={confirmarVisita}
      >
        {confirmando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Confirmar presença
      </Button>
    </>
  );
}
