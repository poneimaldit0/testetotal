import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GeradorCodigosAcesso } from './GeradorCodigosAcesso';
import { Building, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface Orcamento {
  id: string;
  necessidade: string;
  local: string;
  categorias: string[];
  data_publicacao: string;
}

export const CodigosAcessoAdmin = () => {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  const carregarOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, necessidade, local, categorias, data_publicacao')
        .order('data_publicacao', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const orcamentoAtual = orcamentos.find(o => o.id === orcamentoSelecionado);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerador de Códigos de Acesso Individual
          </CardTitle>
          <CardDescription>
            Gere códigos únicos para que fornecedores acessem suas propostas individualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Selecione um orçamento:
              </label>
              <Select value={orcamentoSelecionado} onValueChange={setOrcamentoSelecionado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha um orçamento para gerar códigos" />
                </SelectTrigger>
                <SelectContent>
                  {orcamentos.map((orcamento) => (
                    <SelectItem key={orcamento.id} value={orcamento.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="truncate">
                          {orcamento.necessidade} - {orcamento.local}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {orcamentoSelecionado && orcamentoAtual && (
        <GeradorCodigosAcesso 
          orcamentoId={orcamentoSelecionado}
          orcamentoNecessidade={orcamentoAtual.necessidade}
        />
      )}
    </div>
  );
};