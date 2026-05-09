import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Target } from 'lucide-react';
import { useFunilVendas } from '@/hooks/useFunilVendas';
import { useAuth } from '@/hooks/useAuth';
import { FunilVendasMeta, ETAPAS_FUNIL, ETAPAS_FINANCEIRAS } from '@/types/funilVendas';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const GestaoMetas: React.FC = () => {
  const { user } = useAuth();
  const { buscarMetas, salvarMeta, buscarClosers, metas } = useFunilVendas();
  const [closers, setClosers] = useState<any[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [tipoMeta, setTipoMeta] = useState<'global' | string>('global');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    meta_leads: 0,
    meta_mql: 0,
    meta_ligacoes: 0,
    meta_reunioes_agendadas: 0,
    meta_reunioes_iniciadas: 0,
    meta_pitchs: 0,
    meta_vendas: 0,
    meta_caixa: 0,
    meta_faturamento: 0,
  });

  useEffect(() => {
    loadData();
  }, [mesSelecionado, anoSelecionado]);

  const loadData = async () => {
    setLoading(true);
    const [metasData, closersList] = await Promise.all([
      buscarMetas(mesSelecionado, anoSelecionado),
      buscarClosers(),
    ]);
    setClosers(closersList);
    loadMetaForm(metasData, tipoMeta);
    setLoading(false);
  };

  const loadMetaForm = (metasData: FunilVendasMeta[], tipo: string) => {
    const closerId = tipo === 'global' ? null : tipo;
    const metaExistente = metasData.find(m => 
      m.mes === mesSelecionado && m.ano === anoSelecionado && 
      (closerId ? m.closer_id === closerId : !m.closer_id)
    );

    if (metaExistente) {
      setForm({
        meta_leads: metaExistente.meta_leads,
        meta_mql: metaExistente.meta_mql,
        meta_ligacoes: metaExistente.meta_ligacoes,
        meta_reunioes_agendadas: metaExistente.meta_reunioes_agendadas,
        meta_reunioes_iniciadas: metaExistente.meta_reunioes_iniciadas,
        meta_pitchs: metaExistente.meta_pitchs,
        meta_vendas: metaExistente.meta_vendas,
        meta_caixa: Number(metaExistente.meta_caixa),
        meta_faturamento: Number(metaExistente.meta_faturamento),
      });
    } else {
      setForm({ meta_leads: 0, meta_mql: 0, meta_ligacoes: 0, meta_reunioes_agendadas: 0, meta_reunioes_iniciadas: 0, meta_pitchs: 0, meta_vendas: 0, meta_caixa: 0, meta_faturamento: 0 });
    }
  };

  const handleTipoMetaChange = (tipo: string) => {
    setTipoMeta(tipo);
    loadMetaForm(metas, tipo);
  };

  const handleSalvar = async () => {
    await salvarMeta({
      mes: mesSelecionado,
      ano: anoSelecionado,
      closer_id: tipoMeta === 'global' ? null : tipoMeta,
      ...form,
      criado_por_id: user?.id || null,
    });
    loadData();
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Configurar Metas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <Label>Mês</Label>
              <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input type="number" value={anoSelecionado} onChange={(e) => setAnoSelecionado(parseInt(e.target.value))} className="w-28" />
            </div>
            <div>
              <Label>Tipo de Meta</Label>
              <Select value={tipoMeta} onValueChange={handleTipoMetaChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Meta Global (Time)</SelectItem>
                  {closers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome || c.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {ETAPAS_FUNIL.map(etapa => (
              <div key={etapa.metaKey}>
                <Label className="text-xs">{etapa.label}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form[etapa.metaKey as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [etapa.metaKey]: parseInt(e.target.value) || 0 })}
                />
              </div>
            ))}
            <div>
              <Label className="text-xs">Meta Caixa (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.meta_caixa}
                onChange={(e) => setForm({ ...form, meta_caixa: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="text-xs">Meta Faturamento (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.meta_faturamento}
                onChange={(e) => setForm({ ...form, meta_faturamento: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <Button onClick={handleSalvar}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Meta
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de metas */}
      <Card>
        <CardHeader>
          <CardTitle>Metas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead>Tipo</TableHead>
                  {ETAPAS_FUNIL.map(e => <TableHead key={e.key} className="text-center">{e.label}</TableHead>)}
                  <TableHead className="text-right">Caixa</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metas.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{MESES[m.mes - 1]} {m.ano}</TableCell>
                    <TableCell>
                      <Badge variant={m.closer_id ? 'outline' : 'default'}>
                        {m.closer_id ? closers.find(c => c.id === m.closer_id)?.nome || 'Closer' : 'Global'}
                      </Badge>
                    </TableCell>
                    {ETAPAS_FUNIL.map(e => (
                      <TableCell key={e.key} className="text-center">{m[e.metaKey as keyof FunilVendasMeta] as number}</TableCell>
                    ))}
                    <TableCell className="text-right">{Number(m.meta_caixa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{Number(m.meta_faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                {metas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhuma meta cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
