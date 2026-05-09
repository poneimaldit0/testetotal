import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Registro {
  id: string;
  tipo: string;
  valor: number;
  descricao: string | null;
  data_registro: string;
  registrado_por_nome: string | null;
}

interface HistoricoRegistrosProps {
  onNovoRegistro: () => void;
  recarregar: boolean;
}

const getTipoLabel = (tipo: string) => {
  const labels: Record<string, string> = {
    'faturamento_fornecedor': 'Fat. Fornecedor',
    'faturamento_comissao': 'Fat. Comissão',
    'reuniao': 'Reunião'
  };
  return labels[tipo] || tipo;
};

const getTipoColor = (tipo: string) => {
  const colors: Record<string, string> = {
    'faturamento_fornecedor': 'bg-blue-100 text-blue-800',
    'faturamento_comissao': 'bg-green-100 text-green-800',
    'reuniao': 'bg-purple-100 text-purple-800'
  };
  return colors[tipo] || 'bg-gray-100 text-gray-800';
};

export const HistoricoRegistros = ({ onNovoRegistro, recarregar }: HistoricoRegistrosProps) => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const buscarRegistros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('registros_saude_empresa')
      .select('*')
      .order('data_registro', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar registros:', error);
      toast.error('Erro ao carregar histórico');
    } else {
      setRegistros(data || []);
    }
    setLoading(false);
  };

  const handleDeletar = async (id: string) => {
    if (!confirm('Deseja realmente deletar este registro?')) return;

    const { error } = await supabase
      .from('registros_saude_empresa')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao deletar registro');
    } else {
      toast.success('Registro deletado');
      buscarRegistros();
    }
  };

  useEffect(() => {
    buscarRegistros();
  }, [recarregar]);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Histórico de Registros</CardTitle>
          <Button onClick={onNovoRegistro} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Registro
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : registros.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(registro.data_registro), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTipoColor(registro.tipo)} variant="secondary">
                        {getTipoLabel(registro.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {registro.descricao || '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {registro.tipo === 'reuniao' 
                        ? '-' 
                        : `R$ ${registro.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {registro.registrado_por_nome || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletar(registro.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
