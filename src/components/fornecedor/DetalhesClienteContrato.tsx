import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  DollarSign,
  Calendar,
  IdCard,
  Building2
} from 'lucide-react';
import type { ContratoAtivo } from '@/hooks/useContratosAtivos';

interface DetalhesClienteContratoProps {
  cliente: ContratoAtivo['cliente'];
  contrato: Omit<ContratoAtivo, 'cliente'>;
}

export const DetalhesClienteContrato: React.FC<DetalhesClienteContratoProps> = ({
  cliente,
  contrato
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatEndereco = (endereco: any) => {
    if (!endereco) return 'Não informado';
    
    const partes = [
      endereco.logradouro,
      endereco.numero && `nº ${endereco.numero}`,
      endereco.complemento,
      endereco.bairro,
      endereco.cidade,
      endereco.uf && `- ${endereco.uf}`,
      endereco.cep && `CEP: ${endereco.cep}`
    ].filter(Boolean);
    
    return partes.join(', ');
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="space-y-6">
      {/* Informações Pessoais do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Nome Completo</p>
                <p className="font-medium">{cliente.nome}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <IdCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium">{formatCPF(cliente.cpf)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-medium">{cliente.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{cliente.telefone}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Badge variant={cliente.status === 'ativo' ? 'default' : 'secondary'}>
                Status: {cliente.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereços */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereços
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Endereço Atual (Residencial)</h4>
            <p className="text-sm bg-muted p-3 rounded-lg">
              {formatEndereco(cliente.endereco_atual)}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Endereço da Obra/Reforma</h4>
            <p className="text-sm bg-muted p-3 rounded-lg">
              {formatEndereco(cliente.endereco_reforma)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Contrato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Valor do Contrato</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(contrato.valor_contrato)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data de Criação</p>
                <p className="font-medium">
                  {new Date(contrato.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Status da Assinatura</p>
                <Badge variant={contrato.status_assinatura === 'assinado' ? 'default' : 'secondary'}>
                  {contrato.status_assinatura === 'aguardando_emissao' && 'Aguardando Emissão'}
                  {contrato.status_assinatura === 'aguardando_assinatura' && 'Aguardando Assinatura'}
                  {contrato.status_assinatura === 'assinado' && 'Assinado'}
                </Badge>
              </div>
            </div>
          </div>
          
          {contrato.data_assinatura_fornecedor && (
            <div>
              <p className="text-sm text-muted-foreground">Assinado pelo fornecedor em:</p>
              <p className="font-medium">
                {new Date(contrato.data_assinatura_fornecedor).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
          
          {contrato.data_assinatura_cliente && (
            <div>
              <p className="text-sm text-muted-foreground">Assinado pelo cliente em:</p>
              <p className="font-medium">
                {new Date(contrato.data_assinatura_cliente).toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações da Obra */}
      {contrato.obra && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Status da Obra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status Atual</p>
                <Badge variant="outline" className="mt-1">
                  {contrato.obra.status || 'Não iniciada'}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="text-lg font-semibold">
                  {contrato.obra.porcentagem_conclusao}% concluída
                </p>
              </div>
              
              {contrato.obra.data_inicio && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Início</p>
                  <p className="font-medium">
                    {new Date(contrato.obra.data_inicio).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
            
            {contrato.obra.data_fim_prevista && (
              <div>
                <p className="text-sm text-muted-foreground">Previsão de Término</p>
                <p className="font-medium">
                  {new Date(contrato.obra.data_fim_prevista).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detalhes da Proposta */}
      {contrato.checklist_proposta && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Proposta Aceita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Estimado Original</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(contrato.checklist_proposta.valor_total_estimado)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Status da Proposta</p>
                <Badge variant="outline">
                  {contrato.checklist_proposta.status}
                </Badge>
              </div>
            </div>
            
            {contrato.checklist_proposta.observacoes && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Observações da Proposta</p>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {contrato.checklist_proposta.observacoes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};