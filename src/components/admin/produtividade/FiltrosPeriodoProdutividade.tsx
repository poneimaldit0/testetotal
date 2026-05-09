import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FiltrosPeriodoProdutividadeProps {
  dataInicio: string;
  dataFim: string;
  onPeriodoChange: (dataInicio: string, dataFim: string) => void;
}

type FiltroRapido = 'hoje' | 'ontem' | '7dias' | '14dias' | '30dias' | 'semana_atual' | 'mes_atual' | 'mes_anterior' | 'personalizado';

export function FiltrosPeriodoProdutividade({
  dataInicio,
  dataFim,
  onPeriodoChange
}: FiltrosPeriodoProdutividadeProps) {
  const [filtroSelecionado, setFiltroSelecionado] = useState<FiltroRapido>('14dias');
  const [dataInicioLocal, setDataInicioLocal] = useState<Date | undefined>(new Date(dataInicio));
  const [dataFimLocal, setDataFimLocal] = useState<Date | undefined>(new Date(dataFim));

  // Detectar qual filtro rápido está ativo baseado nas datas
  useEffect(() => {
    const hoje = startOfDay(new Date());
    const inicio = startOfDay(new Date(dataInicio));
    const fim = endOfDay(new Date(dataFim));

    if (inicio.getTime() === hoje.getTime() && fim.getTime() === endOfDay(hoje).getTime()) {
      setFiltroSelecionado('hoje');
    } else if (inicio.getTime() === startOfDay(subDays(hoje, 1)).getTime() && 
               fim.getTime() === endOfDay(subDays(hoje, 1)).getTime()) {
      setFiltroSelecionado('ontem');
    } else if (inicio.getTime() === startOfDay(subDays(hoje, 6)).getTime() && 
               fim.getTime() === endOfDay(hoje).getTime()) {
      setFiltroSelecionado('7dias');
    } else if (inicio.getTime() === startOfDay(subDays(hoje, 13)).getTime() && 
               fim.getTime() === endOfDay(hoje).getTime()) {
      setFiltroSelecionado('14dias');
    } else if (inicio.getTime() === startOfDay(subDays(hoje, 29)).getTime() && 
               fim.getTime() === endOfDay(hoje).getTime()) {
      setFiltroSelecionado('30dias');
    } else {
      setFiltroSelecionado('personalizado');
    }
  }, [dataInicio, dataFim]);

  const handleFiltroRapido = (filtro: FiltroRapido) => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date;

    switch (filtro) {
      case 'hoje':
        inicio = startOfDay(hoje);
        fim = endOfDay(hoje);
        break;
      case 'ontem':
        inicio = startOfDay(subDays(hoje, 1));
        fim = endOfDay(subDays(hoje, 1));
        break;
      case '7dias':
        inicio = startOfDay(subDays(hoje, 6));
        fim = endOfDay(hoje);
        break;
      case '14dias':
        inicio = startOfDay(subDays(hoje, 13));
        fim = endOfDay(hoje);
        break;
      case '30dias':
        inicio = startOfDay(subDays(hoje, 29));
        fim = endOfDay(hoje);
        break;
      case 'semana_atual':
        inicio = startOfWeek(hoje, { locale: ptBR });
        fim = endOfWeek(hoje, { locale: ptBR });
        break;
      case 'mes_atual':
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case 'mes_anterior':
        const mesAnterior = subMonths(hoje, 1);
        inicio = startOfMonth(mesAnterior);
        fim = endOfMonth(mesAnterior);
        break;
      case 'personalizado':
        return;
      default:
        return;
    }

    setFiltroSelecionado(filtro);
    setDataInicioLocal(inicio);
    setDataFimLocal(fim);
    onPeriodoChange(format(inicio, 'yyyy-MM-dd'), format(fim, 'yyyy-MM-dd'));
  };

  const handleAplicarPersonalizado = () => {
    if (dataInicioLocal && dataFimLocal) {
      onPeriodoChange(
        format(dataInicioLocal, 'yyyy-MM-dd'),
        format(dataFimLocal, 'yyyy-MM-dd')
      );
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={filtroSelecionado}
        onValueChange={(v) => handleFiltroRapido(v as FiltroRapido)}
      >
        <SelectTrigger className="w-[180px]">
          <CalendarIcon className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hoje">Hoje</SelectItem>
          <SelectItem value="ontem">Ontem</SelectItem>
          <SelectItem value="7dias">Últimos 7 dias</SelectItem>
          <SelectItem value="14dias">Últimos 14 dias</SelectItem>
          <SelectItem value="30dias">Últimos 30 dias</SelectItem>
          <SelectItem value="semana_atual">Semana atual</SelectItem>
          <SelectItem value="mes_atual">Mês atual</SelectItem>
          <SelectItem value="mes_anterior">Mês anterior</SelectItem>
          <SelectItem value="personalizado">Período personalizado</SelectItem>
        </SelectContent>
      </Select>

      {filtroSelecionado === 'personalizado' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !dataInicioLocal && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInicioLocal ? format(dataInicioLocal, "dd/MM/yyyy") : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInicioLocal}
                onSelect={setDataInicioLocal}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !dataFimLocal && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataFimLocal ? format(dataFimLocal, "dd/MM/yyyy") : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataFimLocal}
                onSelect={setDataFimLocal}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleAplicarPersonalizado}>
            Aplicar
          </Button>
        </>
      )}
    </div>
  );
}
