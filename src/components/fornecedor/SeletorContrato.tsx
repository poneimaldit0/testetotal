import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, User, DollarSign, Phone, Mail } from 'lucide-react';
import { ContratoDiario } from '@/hooks/useDiarioObra';

interface SeletorContratoProps {
  contratos: ContratoDiario[];
  contratoSelecionado?: string;
  onContratoChange: (contratoId: string) => void;
  loading?: boolean;
}

export const SeletorContrato: React.FC<SeletorContratoProps> = ({
  contratos,
  contratoSelecionado,
  onContratoChange,
  loading = false
}) => {
  const contratoAtual = contratos.find(c => c.id === contratoSelecionado);

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (contratos.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Nenhum Contrato Ativo
          </CardTitle>
          <CardDescription className="text-amber-700">
            Você não possui contratos assinados para gerenciar diário de obra.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de Contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Selecionar Projeto
          </CardTitle>
          <CardDescription>
            Escolha o projeto para gerenciar o diário de obra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={contratoSelecionado} onValueChange={onContratoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um contrato/projeto" />
            </SelectTrigger>
            <SelectContent>
              {contratos.map((contrato) => (
                <SelectItem key={contrato.id} value={contrato.id}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="font-medium">{contrato.clientes?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatarValor(contrato.valor_contrato)} • Assinado em {formatarData(contrato.data_assinatura_fornecedor)}
                      </p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Informações do Contrato Selecionado */}
      {contratoAtual && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Projeto Selecionado
              </CardTitle>
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                Ativo
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Informações do Cliente */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cliente
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{contratoAtual.clientes?.nome}</p>
                  {contratoAtual.clientes?.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {contratoAtual.clientes.email}
                    </p>
                  )}
                  {contratoAtual.clientes?.telefone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {contratoAtual.clientes.telefone}
                    </p>
                  )}
                </div>
              </div>

              {/* Informações do Contrato */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Contrato
                </h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Valor:</span>{' '}
                    <span className="font-semibold text-green-600">
                      {formatarValor(contratoAtual.valor_contrato)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Assinado em:</span>{' '}
                    <span className="font-medium">
                      {formatarData(contratoAtual.data_assinatura_fornecedor)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge variant="outline" className="ml-1">
                      {contratoAtual.status_assinatura}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};