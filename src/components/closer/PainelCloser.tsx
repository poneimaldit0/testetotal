import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, TrendingUp, Calendar, Pencil, Plus, Check, Users, Phone, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFunilVendas } from '@/hooks/useFunilVendas';
import { ETAPAS_CLOSER, ETAPAS_FINANCEIRAS, ETAPAS_PRE_VENDAS, FunilVendasAcumulado, FunilReuniao, FunilCanalOrigem } from '@/types/funilVendas';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
  no_show_desapareceu: 'No Show - Cliente desapareceu',
  no_show_remarcar: 'No Show - Cliente pediu para remarcar',
  no_show_cancelar: 'No Show - Cliente pediu para cancelar',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  agendada: 'outline',
  realizada: 'default',
  no_show_desapareceu: 'destructive',
  no_show_remarcar: 'destructive',
  no_show_cancelar: 'secondary',
};

export const PainelCloser: React.FC = () => {
  const { user, profile } = useAuth();
  const isPreVendas = profile?.tipo_usuario === 'pre_vendas';
  const etapas = isPreVendas ? ETAPAS_PRE_VENDAS : ETAPAS_CLOSER;
  const showFinanceiro = !isPreVendas;
  const { loading, buscarRegistros, salvarRegistro, buscarMetas, calcularAcumulado, buscarClosers, buscarReunioes, criarReuniao, atualizarReuniao, excluirRegistro, excluirReuniao, buscarCanaisOrigem } = useFunilVendas();
  const [dataSelecionada, setDataSelecionada] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [acumuladoMes, setAcumuladoMes] = useState<FunilVendasAcumulado | null>(null);
  const [metaAtual, setMetaAtual] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [reunioes, setReunioes] = useState<FunilReuniao[]>([]);
  const [closers, setClosers] = useState<any[]>([]);
  const [canais, setCanais] = useState<FunilCanalOrigem[]>([]);

  const [editando, setEditando] = useState(false);

  // Form for daily record (etapas numéricas que não são reuniões)
  const [form, setForm] = useState({
    leads_entrada: 0,
    mql: 0,
    ligacoes_realizadas: 0,
    reunioes_agendadas: 0,
    reunioes_iniciadas: 0,
    pitchs_realizados: 0,
    vendas: 0,
    caixa_coletado: 0,
    faturamento_gerado: 0,
    observacoes: '',
  });

  // Form for new reunion (SDR)
  const [novaReuniao, setNovaReuniao] = useState({
    nome: '',
    data_agendada: format(new Date(), 'yyyy-MM-dd'),
    closer_id: '',
    observacoes_pre_vendas: '',
    canal_origem_id: '',
  });

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  useEffect(() => {
    if (user?.id) carregarDados();
  }, [user?.id]);

  const carregarDados = async () => {
    if (!user?.id) return;

    const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd');

    const promises: Promise<any>[] = [
      buscarRegistros({ closerId: user.id, dataInicio: inicioMes, dataFim: fimMes }),
      buscarMetas(mesAtual, anoAtual),
      buscarReunioes(isPreVendas
        ? { preVendasId: user.id, dataInicio: inicioMes, dataFim: fimMes }
        : { closerId: user.id, dataInicio: inicioMes, dataFim: fimMes }
      ),
    ];

    if (isPreVendas) {
      promises.push(buscarClosers());
      promises.push(buscarCanaisOrigem());
    }

    const [regs, metasData, reunioesData, closersData, canaisData] = await Promise.all(promises);

    setHistorico(regs);
    const baseAcumulado = calcularAcumulado(regs);
    const reunioesList = reunioesData || [];
    
    // Merge reunion-derived metrics into summary
    const reunioesAgendadas = reunioesList.length;
    const reunioesRealizadas = reunioesList.filter((r: any) => r.status === 'realizada').length;
    const pitchs = reunioesList.filter((r: any) => r.teve_pitch).length;
    const vendasCount = reunioesList.filter((r: any) => r.teve_venda).length;
    const caixaReunioes = reunioesList.reduce((sum: number, r: any) => sum + Number(r.caixa_coletado || 0), 0);
    const fatReunioes = reunioesList.reduce((sum: number, r: any) => sum + Number(r.faturamento_gerado || 0), 0);

    setAcumuladoMes({
      ...baseAcumulado,
      reunioes_agendadas: baseAcumulado.reunioes_agendadas + reunioesAgendadas,
      reunioes_iniciadas: baseAcumulado.reunioes_iniciadas + reunioesRealizadas,
      pitchs_realizados: baseAcumulado.pitchs_realizados + pitchs,
      vendas: baseAcumulado.vendas + vendasCount,
      caixa_coletado: baseAcumulado.caixa_coletado + caixaReunioes,
      faturamento_gerado: baseAcumulado.faturamento_gerado + fatReunioes,
    });
    setReunioes(reunioesList);
    if (closersData) setClosers(closersData);
    if (canaisData) setCanais(canaisData);

    const metaCloser = metasData.find((m: any) => m.closer_id === user.id);
    const metaGlobal = metasData.find((m: any) => !m.closer_id);
    setMetaAtual(metaCloser || metaGlobal || null);

    const regDia = regs.find((r: any) => r.data === dataSelecionada);
    if (regDia) {
      setEditando(true);
      setForm({
        leads_entrada: regDia.leads_entrada,
        mql: regDia.mql,
        ligacoes_realizadas: regDia.ligacoes_realizadas,
        reunioes_agendadas: regDia.reunioes_agendadas,
        reunioes_iniciadas: regDia.reunioes_iniciadas,
        pitchs_realizados: regDia.pitchs_realizados,
        vendas: regDia.vendas,
        caixa_coletado: Number(regDia.caixa_coletado),
        faturamento_gerado: Number(regDia.faturamento_gerado),
        observacoes: regDia.observacoes || '',
      });
    }
  };

  const handleSalvar = async () => {
    if (!user?.id) return;
    const result = await salvarRegistro({
      data: dataSelecionada,
      closer_id: user.id,
      ...form,
    });
    if (result) carregarDados();
  };

  const handleDataChange = async (novaData: string) => {
    setDataSelecionada(novaData);
    if (!user?.id) return;
    const regs = await buscarRegistros({ closerId: user.id, dataInicio: novaData, dataFim: novaData });
    const regDia = regs.find((r: any) => r.data === novaData);
    if (regDia) {
      setEditando(true);
      setForm({
        leads_entrada: regDia.leads_entrada,
        mql: regDia.mql,
        ligacoes_realizadas: regDia.ligacoes_realizadas,
        reunioes_agendadas: regDia.reunioes_agendadas,
        reunioes_iniciadas: regDia.reunioes_iniciadas,
        pitchs_realizados: regDia.pitchs_realizados,
        vendas: regDia.vendas,
        caixa_coletado: Number(regDia.caixa_coletado),
        faturamento_gerado: Number(regDia.faturamento_gerado),
        observacoes: regDia.observacoes || '',
      });
    } else {
      setEditando(false);
      setForm({ leads_entrada: 0, mql: 0, ligacoes_realizadas: 0, reunioes_agendadas: 0, reunioes_iniciadas: 0, pitchs_realizados: 0, vendas: 0, caixa_coletado: 0, faturamento_gerado: 0, observacoes: '' });
    }
  };

  const handleNovoRegistro = () => {
    setEditando(false);
    setDataSelecionada(format(new Date(), 'yyyy-MM-dd'));
    setForm({ leads_entrada: 0, mql: 0, ligacoes_realizadas: 0, reunioes_agendadas: 0, reunioes_iniciadas: 0, pitchs_realizados: 0, vendas: 0, caixa_coletado: 0, faturamento_gerado: 0, observacoes: '' });
  };

  const handleAgendarReuniao = async () => {
    if (!user?.id || !novaReuniao.nome || !novaReuniao.closer_id) return;
    const result = await criarReuniao({
      nome: novaReuniao.nome,
      data_agendada: novaReuniao.data_agendada,
      closer_id: novaReuniao.closer_id,
      pre_vendas_id: user.id,
      observacoes_pre_vendas: novaReuniao.observacoes_pre_vendas || undefined,
      canal_origem_id: novaReuniao.canal_origem_id || undefined,
    });
    if (result) {
      setNovaReuniao({ nome: '', data_agendada: format(new Date(), 'yyyy-MM-dd'), closer_id: '', observacoes_pre_vendas: '', canal_origem_id: '' });
      carregarDados();
    }
  };

  const handleAtualizarReuniao = async (id: string, updates: Partial<FunilReuniao>) => {
    // Optimistic update - update local state immediately
    // If status changed away from 'realizada', clear pitch/venda/caixa/faturamento
    setReunioes(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      if (updates.status && updates.status !== 'realizada') {
        updated.teve_pitch = false;
        updated.teve_venda = false;
        updated.caixa_coletado = 0;
        updated.faturamento_gerado = 0;
        updated.observacoes_closer = '';
      }
      if (updates.teve_pitch === false) {
        updated.teve_venda = false;
        updated.caixa_coletado = 0;
        updated.faturamento_gerado = 0;
      }
      return updated;
    }));
    // Also clear dependent fields on DB if status changed
    if (updates.status && updates.status !== 'realizada') {
      updates.teve_pitch = false;
      updates.teve_venda = false;
      updates.caixa_coletado = 0;
      updates.faturamento_gerado = 0;
      updates.observacoes_closer = '';
    }
    if (updates.teve_pitch === false) {
      updates.teve_venda = false;
      updates.caixa_coletado = 0;
      updates.faturamento_gerado = 0;
    }
    await atualizarReuniao(id, updates);
  };

  const handleExcluirRegistro = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    const ok = await excluirRegistro(id);
    if (ok) {
      setEditando(false);
      handleNovoRegistro();
      carregarDados();
    }
  };

  const handleExcluirReuniao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta reunião?')) return;
    const ok = await excluirReuniao(id);
    if (ok) carregarDados();
  };

  const getProgress = (atual: number, meta: number) => {
    if (meta === 0) return 0;
    return Math.min((atual / meta) * 100, 100);
  };

  // Etapas do formulário diário - para closer, removemos reunioes_agendadas pois vem do SDR
  const etapasFormulario = isPreVendas
    ? ETAPAS_PRE_VENDAS.filter(e => e.key !== 'reunioes_agendadas') // reuniões agendadas agora são individuais
    : ETAPAS_CLOSER.filter(e => e.key !== 'reunioes_agendadas' && e.key !== 'reunioes_iniciadas' && e.key !== 'pitchs_realizados' && e.key !== 'vendas');
    // Para closer: reuniões/pitch/venda vêm das reuniões individuais

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{isPreVendas ? 'SDR Fornecedor' : 'Funil de Vendas'}</h2>
        <Badge variant="outline" className="text-sm">
          {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
        </Badge>
      </div>

      {/* Cards de resumo do mês */}
      {acumuladoMes && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {etapas.map(etapa => {
            const valor = acumuladoMes[etapa.key as keyof FunilVendasAcumulado] as number;
            const meta = metaAtual?.[etapa.metaKey] || 0;
            return (
              <Card key={etapa.key} className="border border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{etapa.label}</p>
                  <p className="text-2xl font-bold text-foreground">{valor}</p>
                  {meta > 0 && (
                    <>
                      <Progress value={getProgress(valor, meta)} className="h-1.5 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(getProgress(valor, meta))}% da meta ({meta})</p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {showFinanceiro && ETAPAS_FINANCEIRAS.map(etapa => {
            const valor = acumuladoMes[etapa.key as keyof FunilVendasAcumulado] as number;
            const meta = metaAtual?.[etapa.metaKey] || 0;
            return (
              <Card key={etapa.key} className="border border-border">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{etapa.label}</p>
                  <p className="text-xl font-bold text-foreground">R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {meta > 0 && (
                    <>
                      <Progress value={getProgress(valor, meta)} className="h-1.5 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">{Math.round(getProgress(valor, meta))}% da meta</p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* SDR: Agendar Reunião */}
      {isPreVendas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agendar Reunião para Closer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Closer</Label>
                <Select value={novaReuniao.closer_id} onValueChange={(v) => setNovaReuniao({ ...novaReuniao, closer_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar closer" />
                  </SelectTrigger>
                  <SelectContent>
                    {closers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome || c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Canal de Origem</Label>
                <Select value={novaReuniao.canal_origem_id} onValueChange={(v) => setNovaReuniao({ ...novaReuniao, canal_origem_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {canais.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nome da Reunião</Label>
                <Input
                  value={novaReuniao.nome}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, nome: e.target.value })}
                  placeholder="Ex: Reunião com João Silva"
                />
              </div>
              <div>
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={novaReuniao.data_agendada}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, data_agendada: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Input
                  value={novaReuniao.observacoes_pre_vendas}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, observacoes_pre_vendas: e.target.value })}
                  placeholder="Notas..."
                />
              </div>
            </div>
            <Button onClick={handleAgendarReuniao} disabled={!novaReuniao.nome || !novaReuniao.closer_id || !novaReuniao.canal_origem_id}>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Reunião
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reuniões do mês */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {isPreVendas ? 'Reuniões Agendadas no Mês' : 'Minhas Reuniões'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  {isPreVendas && <TableHead>Closer</TableHead>}
                  {isPreVendas && <TableHead>Canal</TableHead>}
                  <TableHead>Status</TableHead>
                  {!isPreVendas && <TableHead className="text-center">Pitch</TableHead>}
                  {!isPreVendas && <TableHead className="text-center">Venda</TableHead>}
                  {!isPreVendas && <TableHead className="text-right">Caixa (R$)</TableHead>}
                  {!isPreVendas && <TableHead className="text-right">Faturamento (R$)</TableHead>}
                  <TableHead>Obs</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reunioes.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{format(new Date(r.data_agendada + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</TableCell>
                    {isPreVendas && (
                      <TableCell>{closers.find(c => c.id === r.closer_id)?.nome || '—'}</TableCell>
                    )}
                    {isPreVendas && (
                      <TableCell>
                        <Select
                          value={r.canal_origem_id || ''}
                          onValueChange={(v) => handleAtualizarReuniao(r.id, { canal_origem_id: v })}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {canais.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell>
                      {isPreVendas ? (
                        <Badge variant={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                      ) : (
                        <Select
                          value={r.status}
                          onValueChange={(v) => handleAtualizarReuniao(r.id, { status: v as any })}
                        >
                          <SelectTrigger className="w-56 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agendada">Agendada</SelectItem>
                            <SelectItem value="realizada">Realizada</SelectItem>
                            <SelectItem value="no_show_desapareceu">No Show - Desapareceu</SelectItem>
                            <SelectItem value="no_show_remarcar">No Show - Remarcar</SelectItem>
                            <SelectItem value="no_show_cancelar">No Show - Cancelar</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    {!isPreVendas && (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={r.teve_pitch}
                          disabled={r.status !== 'realizada'}
                          onCheckedChange={(checked) => handleAtualizarReuniao(r.id, { teve_pitch: !!checked })}
                        />
                      </TableCell>
                    )}
                    {!isPreVendas && (
                      <TableCell className="text-center">
                        <Checkbox
                          checked={r.teve_venda}
                          disabled={!r.teve_pitch}
                          onCheckedChange={(checked) => handleAtualizarReuniao(r.id, { teve_venda: !!checked })}
                        />
                      </TableCell>
                    )}
                    {!isPreVendas && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28 h-8 text-right"
                          disabled={!r.teve_venda}
                          defaultValue={Number(r.caixa_coletado)}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val !== Number(r.caixa_coletado)) {
                              handleAtualizarReuniao(r.id, { caixa_coletado: val });
                            }
                          }}
                        />
                      </TableCell>
                    )}
                    {!isPreVendas && (
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-28 h-8 text-right"
                          disabled={!r.teve_venda}
                          defaultValue={Number(r.faturamento_gerado)}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (val !== Number(r.faturamento_gerado)) {
                              handleAtualizarReuniao(r.id, { faturamento_gerado: val });
                            }
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell className="max-w-48">
                      {isPreVendas ? (
                        <span className="text-xs text-muted-foreground truncate block">{r.observacoes_pre_vendas}</span>
                      ) : r.teve_venda ? (
                        <Input
                          className="w-36 h-8 text-xs"
                          placeholder="Observações..."
                          defaultValue={r.observacoes_closer || ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val !== (r.observacoes_closer || '')) {
                              handleAtualizarReuniao(r.id, { observacoes_closer: val });
                            }
                          }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate block">{r.observacoes_closer || r.observacoes_pre_vendas || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleExcluirReuniao(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {reunioes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhuma reunião neste mês
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de registro diário (apenas campos numéricos restantes) */}
      {etapasFormulario.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Registro Diário
              {editando && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  <Pencil className="h-3 w-3 mr-1" />
                  Editando registro de {format(new Date(dataSelecionada + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={dataSelecionada} onChange={(e) => handleDataChange(e.target.value)} className="w-48" />
              </div>
              {editando && (
                <Button variant="outline" size="sm" onClick={handleNovoRegistro}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Registro
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {etapasFormulario.map(etapa => (
                <div key={etapa.key}>
                  <Label className="text-xs">{etapa.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form[etapa.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [etapa.key]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
              {showFinanceiro && (
                <>
                  <div>
                    <Label className="text-xs">Caixa Coletado (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.caixa_coletado}
                      onChange={(e) => setForm({ ...form, caixa_coletado: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Faturamento Gerado (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.faturamento_gerado}
                      onChange={(e) => setForm({ ...form, faturamento_gerado: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas sobre o dia..."
                className="h-20"
              />
            </div>

            <Button onClick={handleSalvar} disabled={loading}>
              {editando ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editando ? 'Atualizar Registro' : 'Salvar Registro'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Histórico do mês */}
      {historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Histórico do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    {etapas.map(e => <TableHead key={e.key} className="text-center">{e.label}</TableHead>)}
                    {showFinanceiro && <TableHead className="text-right">Caixa (R$)</TableHead>}
                    {showFinanceiro && <TableHead className="text-right">Faturamento (R$)</TableHead>}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map(r => (
                    <TableRow key={r.id} className={`cursor-pointer hover:bg-muted/50 ${r.data === dataSelecionada ? 'bg-primary/10' : ''}`} onClick={() => handleDataChange(r.data)}>
                      <TableCell>{format(new Date(r.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</TableCell>
                      {etapas.map(e => (
                        <TableCell key={e.key} className="text-center">{r[e.key]}</TableCell>
                      ))}
                      {showFinanceiro && <TableCell className="text-right">{Number(r.caixa_coletado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                      {showFinanceiro && <TableCell className="text-right">{Number(r.faturamento_gerado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                      <TableCell className="flex gap-1">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleExcluirRegistro(r.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
