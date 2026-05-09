
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMeusCandidaturas, CandidaturaOrcamento } from '@/hooks/useMeusCandiaturas';
import { CandidaturaCard } from './CandidaturaCard';
import { useLimitesPropostas } from '@/hooks/useLimitesPropostas';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ORDEM_ETAPAS, StatusAcompanhamento } from '@/hooks/useStatusAcompanhamento';

type TipoOrdenacao = 'data_atualizacao' | 'data_inscricao' | 'etapa';

export const MinhasCandidaturas: React.FC = () => {
  const { user } = useAuth();
  const { candidaturas, loading, error, recarregar, atualizarStatusLocal } = useMeusCandidaturas(user?.id);
  const { limites } = useLimitesPropostas();
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'abertos' | 'fechados' | 'vencidos'>('todos');
  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>('data_atualizacao');
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // Filtrar candidaturas por status (ANTES dos returns condicionais)
  const candidaturasPorStatus = useMemo(() => {
    return candidaturas.filter(c => {
      switch (filtroStatus) {
        case 'abertos': return c.status === 'aberto';
        case 'fechados': return c.status === 'fechado';
        case 'vencidos': return c.status === 'aberto';
        default: return true;
      }
    });
  }, [candidaturas, filtroStatus]);

  // Aplicar pesquisa e ordenação (ANTES dos returns condicionais)
  const candidaturasFiltradas = useMemo(() => {
    // Função de pesquisa inline
    const filtrarPorPesquisa = (lista: CandidaturaOrcamento[]) => {
      if (!termoPesquisa.trim()) return lista;
      
      const termo = termoPesquisa.toLowerCase().trim();
      
      return lista.filter(c => {
        const nome = c.dadosContato?.nome?.toLowerCase() || '';
        const telefone = c.dadosContato?.telefone?.toLowerCase() || '';
        const email = c.dadosContato?.email?.toLowerCase() || '';
        const local = c.local?.toLowerCase() || '';
        const necessidade = c.necessidade?.toLowerCase() || '';
        
        return nome.includes(termo) || 
               telefone.includes(termo) || 
               email.includes(termo) ||
               local.includes(termo) || 
               necessidade.includes(termo);
      });
    };

    // Função de ordenação inline
    const ordenarCandidaturas = (lista: CandidaturaOrcamento[]) => {
      return [...lista].sort((a, b) => {
        switch (ordenacao) {
          case 'data_atualizacao':
            return b.dataAtualizacao.getTime() - a.dataAtualizacao.getTime();
          case 'data_inscricao':
            return b.dataCandidatura.getTime() - a.dataCandidatura.getTime();
          case 'etapa':
            const statusA = a.statusAcompanhamento || 'null';
            const statusB = b.statusAcompanhamento || 'null';
            const ordemA = ORDEM_ETAPAS[statusA as keyof typeof ORDEM_ETAPAS] ?? 0;
            const ordemB = ORDEM_ETAPAS[statusB as keyof typeof ORDEM_ETAPAS] ?? 0;
            return ordemB - ordemA;
          default:
            return 0;
        }
      });
    };

    const pesquisadas = filtrarPorPesquisa(candidaturasPorStatus);
    return ordenarCandidaturas(pesquisadas);
  }, [candidaturasPorStatus, termoPesquisa, ordenacao]);

  // Separar candidaturas por status para melhor visualização
  const candidaturasFechadas = useMemo(() => 
    candidaturasFiltradas.filter(c => c.status === 'fechado'), 
    [candidaturasFiltradas]
  );
  const candidaturasAbertas = useMemo(() => 
    candidaturasFiltradas.filter(c => c.status === 'aberto'), 
    [candidaturasFiltradas]
  );

  console.log('🏠 MinhasCandidaturas: Renderizando componente');
  console.log('👤 MinhasCandidaturas: User ID:', user?.id);
  console.log('📋 MinhasCandidaturas: Candidaturas:', candidaturas.length);

  // Log detalhado das candidaturas por status
  if (candidaturas.length > 0) {
    const abertas = candidaturas.filter(c => c.status === 'aberto');
    const fechadas = candidaturas.filter(c => c.status === 'fechado');
    
    console.log('📊 MinhasCandidaturas: Resumo por status:', {
      total: candidaturas.length,
      abertas: abertas.length,
      fechadas: fechadas.length
    });
  }

  if (loading) {
    console.log('⏳ MinhasCandidaturas: Mostrando loading state');
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Minhas Candidaturas</h2>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando suas candidaturas...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    console.log('❌ MinhasCandidaturas: Mostrando error state:', error);
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Minhas Candidaturas</h2>
        <Card className="bg-white shadow-lg border border-red-100 rounded-xl">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={recarregar}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 MinhasCandidaturas: Usuário não autenticado');
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Minhas Candidaturas</h2>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center text-gray-600">
            Você precisa estar logado para ver suas candidaturas.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (candidaturas.length === 0) {
    console.log('📭 MinhasCandidaturas: Mostrando estado vazio');
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Minhas Candidaturas</h2>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            0 candidaturas
          </Badge>
        </div>
        <Card className="bg-white shadow-lg border border-gray-100 rounded-xl">
          <CardContent className="p-6 text-center text-gray-600">
            <div className="mb-4">📋</div>
            <p className="mb-4">Você ainda não se candidatou a nenhum orçamento.</p>
            <p className="text-sm text-gray-500">
              Vá para a aba "Orçamentos Disponíveis" para encontrar oportunidades.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('📋 MinhasCandidaturas: Renderizando lista de candidaturas');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Minhas Candidaturas</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            {candidaturas.length} {candidaturas.length === 1 ? 'candidatura' : 'candidaturas'}
          </Badge>
          {candidaturasAbertas.length > 0 && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {candidaturasAbertas.length} abertas
            </Badge>
          )}
          {candidaturasFechadas.length > 0 && (
            <Badge variant="outline" className="text-gray-600 border-gray-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              {candidaturasFechadas.length} fechadas
            </Badge>
          )}
          <Button 
            onClick={recarregar}
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-600 hover:bg-gray-50 ml-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa e ordenação */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Campo de pesquisa */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar por nome, telefone, endereço..."
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Seletor de ordenação */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar por:</span>
          <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as TipoOrdenacao)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data_atualizacao">Data de Atualização</SelectItem>
              <SelectItem value="data_inscricao">Data de Inscrição</SelectItem>
              <SelectItem value="etapa">Etapa (Progresso)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alertas de limite */}
      {limites.limiteAtual !== null && limites.proposasAbertas >= limites.limiteAtual && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Limite atingido:</strong> Você tem {limites.proposasAbertas} propostas abertas (limite: {limites.limiteAtual}). 
            Para se candidatar a novos orçamentos, finalize ou desista de algumas propostas pendentes.
          </AlertDescription>
        </Alert>
      )}

      {limites.proximosVencimentos.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Prazos próximos:</strong> Você tem {limites.proximosVencimentos.length} propostas com prazo vencendo nos próximos dias.
          </AlertDescription>
        </Alert>
      )}

      {/* Seção de Orçamentos Fechados */}
      {candidaturasFechadas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-600 flex items-center gap-2">
            📋 Orçamentos Fechados ({candidaturasFechadas.length})
          </h3>
          <div className="grid gap-4">
            {candidaturasFechadas.map((candidatura, index) => {
              console.log(`🔄 MinhasCandidaturas: Renderizando card FECHADO ${index + 1} - ${candidatura.id.slice(-8)}`);
              return (
                <CandidaturaCard
                  key={candidatura.candidaturaId}
                  candidatura={candidatura}
                  onStatusChange={recarregar}
                  onStatusUpdate={atualizarStatusLocal}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Seção de Orçamentos Abertos */}
      {candidaturasAbertas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
            ⏳ Orçamentos Abertos ({candidaturasAbertas.length})
          </h3>
          <div className="grid gap-4">
            {candidaturasAbertas.map((candidatura, index) => {
              console.log(`🔄 MinhasCandidaturas: Renderizando card ABERTO ${index + 1} - ${candidatura.id.slice(-8)}`);
              return (
                <CandidaturaCard
                  key={candidatura.candidaturaId}
                  candidatura={candidatura}
                  onStatusChange={recarregar}
                  onStatusUpdate={atualizarStatusLocal}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
