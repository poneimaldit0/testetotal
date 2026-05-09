import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Activity } from 'lucide-react';
import { useSaudeEmpresa } from '@/hooks/useSaudeEmpresa';
import { CardFaturamentoFornecedores } from './saude-empresa/CardFaturamentoFornecedores';
import { CardFaturamentoComissoes } from './saude-empresa/CardFaturamentoComissoes';
import { ConfiguracaoMetasModal } from './saude-empresa/ConfiguracaoMetasModal';
import { NovoRegistroModal } from './saude-empresa/NovoRegistroModal';
import { HistoricoRegistros } from './saude-empresa/HistoricoRegistros';
import { Skeleton } from '@/components/ui/skeleton';

export const PainelSaudeEmpresa = () => {
  const { metas, realizados, loading, recarregarDados } = useSaudeEmpresa();
  const [modalMetasOpen, setModalMetasOpen] = useState(false);
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);
  const [recarregarHistorico, setRecarregarHistorico] = useState(false);

  const handleSalvarMetas = () => {
    recarregarDados();
  };

  const handleSalvarRegistro = () => {
    recarregarDados();
    setRecarregarHistorico(!recarregarHistorico);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Saúde Geral da Empresa</h1>
        </div>
        <Button onClick={() => setModalMetasOpen(true)} variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Configurar Metas
        </Button>
      </div>

      <div className="space-y-4">
        <CardFaturamentoFornecedores metas={metas} realizados={realizados} />
        <CardFaturamentoComissoes metas={metas} realizados={realizados} />
        <HistoricoRegistros 
          onNovoRegistro={() => setModalRegistroOpen(true)}
          recarregar={recarregarHistorico}
        />
      </div>

      <ConfiguracaoMetasModal
        open={modalMetasOpen}
        onOpenChange={setModalMetasOpen}
        metasAtuais={metas}
        onSalvar={handleSalvarMetas}
      />

      <NovoRegistroModal
        open={modalRegistroOpen}
        onOpenChange={setModalRegistroOpen}
        onSalvar={handleSalvarRegistro}
      />
    </div>
  );
};
