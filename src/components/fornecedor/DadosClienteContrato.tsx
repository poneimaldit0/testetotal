import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ClienteContrato {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  endereco_atual: any;
  endereco_reforma: any;
  status: string;
  orcamento_id: string;
}

interface ContratoInfo {
  id: string;
  valor_contrato: number | null;
  data_assinatura_cliente: string | null;
  status_assinatura: string;
  observacoes: string | null;
}

export const DadosClienteContrato: React.FC = () => {
  const [cliente, setCliente] = useState<ClienteContrato | null>(null);
  const [contrato, setContrato] = useState<ContratoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    carregarDadosCliente();
  }, [profile?.id]);

  const carregarDadosCliente = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      
      // Buscar contratos do fornecedor
      const { data: contratos, error: contratoError } = await supabase
        .from('contratos')
        .select(`
          id,
          valor_contrato,
          data_assinatura_cliente,
          status_assinatura,
          observacoes,
          cliente_id,
          clientes (
            id,
            nome,
            email,
            telefone,
            cpf,
            endereco_atual,
            endereco_reforma,
            status,
            orcamento_id
          )
        `)
        .eq('fornecedor_id', profile.id)
        .eq('status_assinatura', 'assinado')
        .order('created_at', { ascending: false });

      if (contratoError) throw contratoError;

      if (contratos && contratos.length > 0) {
        const contratoAtivo = contratos[0];
        setContrato({
          id: contratoAtivo.id,
          valor_contrato: contratoAtivo.valor_contrato,
          data_assinatura_cliente: contratoAtivo.data_assinatura_cliente,
          status_assinatura: contratoAtivo.status_assinatura,
          observacoes: contratoAtivo.observacoes,
        });
        
        if (contratoAtivo.clientes) {
          setCliente(contratoAtivo.clientes as ClienteContrato);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados do cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatEndereco = (endereco: any) => {
    if (!endereco) return 'Não informado';
    
    const parts = [];
    if (endereco.rua) parts.push(endereco.rua);
    if (endereco.numero) parts.push(`nº ${endereco.numero}`);
    if (endereco.complemento) parts.push(endereco.complemento);
    if (endereco.bairro) parts.push(endereco.bairro);
    if (endereco.cidade) parts.push(endereco.cidade);
    if (endereco.estado) parts.push(endereco.estado);
    if (endereco.cep) parts.push(`CEP ${endereco.cep}`);
    
    return parts.join(', ') || 'Endereço não informado';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando dados do cliente...</p>
        </CardContent>
      </Card>
    );
  }

  if (!cliente || !contrato) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Nenhum contrato ativo encontrado. Os dados do cliente aparecerão aqui após o aceite da proposta.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Dados do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações Pessoais */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Informações Pessoais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome Completo:</label>
              <p className="font-medium">{cliente.nome}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">CPF:</label>
              <p className="font-medium">{cliente.cpf || 'Não informado'}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">E-mail:</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{cliente.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Telefone:</label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{cliente.telefone || 'Não informado'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Endereços */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Endereços</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Endereço Atual:
              </label>
              <p className="text-sm bg-muted p-3 rounded-md">
                {formatEndereco(cliente.endereco_atual)}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Endereço da Reforma:
              </label>
              <p className="text-sm bg-muted p-3 rounded-md">
                {formatEndereco(cliente.endereco_reforma)}
              </p>
            </div>
          </div>
        </div>

        {/* Informações do Contrato */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Informações do Contrato</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Valor do Contrato:</label>
              <p className="font-bold text-lg text-primary">
                {contrato.valor_contrato ? formatCurrency(contrato.valor_contrato) : 'Não definido'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status:</label>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <FileText className="h-3 w-3 mr-1" />
                Contrato Assinado
              </Badge>
            </div>
            
            {contrato.data_assinatura_cliente && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Data de Assinatura:</label>
                <p className="font-medium">
                  {new Date(contrato.data_assinatura_cliente).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
          
          {contrato.observacoes && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Observações do Contrato:</label>
              <p className="text-sm bg-muted p-3 rounded-md">{contrato.observacoes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};