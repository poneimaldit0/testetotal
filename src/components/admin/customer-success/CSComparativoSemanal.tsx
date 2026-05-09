import { useState } from 'react';
import { CSRitualSemanal } from '@/types/customerSuccess';
import { compararSemanas, calcularMediaIncremento } from '@/utils/calcularMetricasCS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface CSComparativoSemanalProps {
  rituais: CSRitualSemanal[];
}

export function CSComparativoSemanal({ rituais }: CSComparativoSemanalProps) {
  const rituaisConcluidos = rituais.filter(r => r.concluido).sort((a, b) => b.semana - a.semana);
  
  const [semana1, setSemana1] = useState<number>(
    rituaisConcluidos.length > 1 ? rituaisConcluidos[1].semana : rituaisConcluidos[0]?.semana || 1
  );
  const [semana2, setSemana2] = useState<number>(
    rituaisConcluidos[0]?.semana || 1
  );
  const [modoComparacao, setModoComparacao] = useState<'semana' | 'media'>('semana');

  if (rituaisConcluidos.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📈 Comparativo Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete pelo menos 2 semanas para ver comparativos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const comparacao = compararSemanas(rituais, semana1, semana2);

  const mediaInscricoes = calcularMediaIncremento(rituais, 'inscricoes_orcamentos');
  const mediaVisitas = calcularMediaIncremento(rituais, 'visitas_realizadas');
  const mediaOrcamentos = calcularMediaIncremento(rituais, 'orcamentos_enviados');
  const mediaContratos = calcularMediaIncremento(rituais, 'contratos_fechados');

  const renderIndicador = (valor: number, percentual: number) => {
    if (Math.abs(percentual) < 0.1) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    if (percentual > 0) {
      return <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    return <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
  };

  const formatDelta = (valor: number, percentual: number) => {
    const sinal = valor >= 0 ? '+' : '';
    const corClasse = valor > 0 
      ? 'text-green-600 dark:text-green-400' 
      : valor < 0 
        ? 'text-red-600 dark:text-red-400' 
        : 'text-muted-foreground';
    return (
      <span className={corClasse}>
        {sinal}{valor} ({percentual >= 0 ? '+' : ''}{percentual.toFixed(1)}%)
      </span>
    );
  };

  const metricas = [
    { label: 'Inscrições', campo: 'inscricoes', incremento: 'inscricoesIncremento', media: mediaInscricoes },
    { label: 'Visitas', campo: 'visitas', incremento: 'visitasIncremento', media: mediaVisitas },
    { label: 'Orçamentos', campo: 'orcamentos', incremento: 'orcamentosIncremento', media: mediaOrcamentos },
    { label: 'Contratos', campo: 'contratos', incremento: 'contratosIncremento', media: mediaContratos },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📈 Comparativo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletores */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Modo</Label>
            <Select value={modoComparacao} onValueChange={(v) => setModoComparacao(v as 'semana' | 'media')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Semana vs Semana</SelectItem>
                <SelectItem value="media">Semana vs Média</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {modoComparacao === 'semana' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Comparar</Label>
                <Select value={String(semana1)} onValueChange={(v) => setSemana1(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rituaisConcluidos.map(r => (
                      <SelectItem key={r.semana} value={String(r.semana)}>
                        Semana {r.semana}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground pb-2">com</span>
              <div className="space-y-1">
                <Label className="text-xs">Base</Label>
                <Select value={String(semana2)} onValueChange={(v) => setSemana2(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rituaisConcluidos.map(r => (
                      <SelectItem key={r.semana} value={String(r.semana)}>
                        Semana {r.semana}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {modoComparacao === 'media' && (
            <div className="space-y-1">
              <Label className="text-xs">Semana</Label>
              <Select value={String(semana2)} onValueChange={(v) => setSemana2(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rituaisConcluidos.map(r => (
                    <SelectItem key={r.semana} value={String(r.semana)}>
                      Semana {r.semana}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tabela de Comparação */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2 font-medium">Métrica</th>
                {modoComparacao === 'semana' ? (
                  <>
                    <th className="text-center p-2 font-medium">Sem {semana1}</th>
                    <th className="text-center p-2 font-medium">Sem {semana2}</th>
                  </>
                ) : (
                  <>
                    <th className="text-center p-2 font-medium">Média/sem</th>
                    <th className="text-center p-2 font-medium">Sem {semana2}</th>
                  </>
                )}
                <th className="text-center p-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((m) => {
                const incrementoKey = m.incremento as keyof typeof comparacao.semana1;
                
                if (modoComparacao === 'semana' && comparacao.semana1 && comparacao.semana2 && comparacao.diferencas) {
                  const val1 = comparacao.semana1[incrementoKey] as number;
                  const val2 = comparacao.semana2[incrementoKey] as number;
                  const diff = comparacao.diferencas[m.campo as keyof typeof comparacao.diferencas] as number;
                  const diffPercent = comparacao.diferencas[`${m.campo}Percent` as keyof typeof comparacao.diferencas] as number;
                  
                  return (
                    <tr key={m.label} className="border-t">
                      <td className="p-2">{m.label} (incr.)</td>
                      <td className="text-center p-2">{val1}</td>
                      <td className="text-center p-2">{val2}</td>
                      <td className="text-center p-2 flex items-center justify-center gap-1">
                        {renderIndicador(diff, diffPercent)}
                        {formatDelta(diff, diffPercent)}
                      </td>
                    </tr>
                  );
                }

                if (modoComparacao === 'media' && comparacao.semana2) {
                  const valMedia = m.media;
                  const valSemana = comparacao.semana2[incrementoKey] as number;
                  const diff = valSemana - valMedia;
                  const diffPercent = valMedia !== 0 ? (diff / valMedia) * 100 : 0;
                  
                  return (
                    <tr key={m.label} className="border-t">
                      <td className="p-2">{m.label} (incr.)</td>
                      <td className="text-center p-2">{valMedia.toFixed(1)}</td>
                      <td className="text-center p-2">{valSemana}</td>
                      <td className="text-center p-2 flex items-center justify-center gap-1">
                        {renderIndicador(diff, diffPercent)}
                        {formatDelta(Math.round(diff), diffPercent)}
                      </td>
                    </tr>
                  );
                }

                return null;
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
