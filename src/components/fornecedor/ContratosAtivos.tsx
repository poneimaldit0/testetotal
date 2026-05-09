import React, { useState } from 'react';
import { useContratosAtivos, type ContratoAtivo } from '@/hooks/useContratosAtivos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { 
  FileText, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  DollarSign, 
  Calendar, 
  CheckCircle,
  Clock,
  Building2,
  Eye,
  Edit,
  MessageSquare
} from 'lucide-react';
import { DetalhesClienteContrato } from './DetalhesClienteContrato';
import { StatusContratoSelector } from './StatusContratoSelector';

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: any, label: string }> = {
    aguardando_assinatura: { variant: "outline", label: "Aguardando Assinatura" },
    assinado: { variant: "default", label: "Aprovado para Início" }
  };

  const config = variants[status] || variants.aguardando_assinatura;
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

const ContratoCard = ({ contrato, onStatusChange, isLoading, onNavigateToCronograma }: { 
  contrato: ContratoAtivo, 
  onStatusChange: (contratoId: string, status: 'aguardando_assinatura' | 'assinado') => void,
  isLoading?: boolean,
  onNavigateToCronograma?: () => void
}) => {
  const [showDetalhes, setShowDetalhes] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatEndereco = (endereco: any) => {
    if (!endereco) return 'Endereço não informado';
    return `${endereco.logradouro || ''}, ${endereco.numero || ''} - ${endereco.bairro || ''}, ${endereco.cidade || ''} - ${endereco.uf || ''}`.trim();
  };

  const abrirWhatsApp = () => {
    if (contrato.cliente.telefone) {
      const telefone = contrato.cliente.telefone.replace(/\D/g, '');
      const mensagem = encodeURIComponent(
        `Olá ${contrato.cliente.nome}, sua proposta foi aceita! Gostaria de agendar uma reunião para apresentar o contrato e discutir os próximos passos da obra.`
      );
      window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank');
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {contrato.cliente.nome}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {contrato.cliente.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {contrato.cliente.telefone}
              </span>
            </CardDescription>
          </div>
          <div className="text-right space-y-2">
            <div className="mb-6">
              <StatusContratoSelector
                status={contrato.status_assinatura}
                contratoId={contrato.id}
                onStatusChange={onStatusChange}
                isLoading={isLoading}
              />
            </div>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(contrato.valor_contrato)}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Endereço da Obra:</strong><br />
                {formatEndereco(contrato.cliente.endereco_reforma)}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            {contrato.obra && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Status da Obra:</strong> {contrato.obra.status || 'Não iniciada'}
                  {contrato.obra.porcentagem_conclusao > 0 && (
                    <span className="ml-2">({contrato.obra.porcentagem_conclusao}% concluída)</span>
                  )}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Contrato criado em:</strong> {new Date(contrato.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes Completos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dados Completos do Cliente</DialogTitle>
                <DialogDescription>
                  Informações detalhadas do cliente e contrato
                </DialogDescription>
              </DialogHeader>
              <DetalhesClienteContrato 
                cliente={contrato.cliente} 
                contrato={contrato}
              />
            </DialogContent>
          </Dialog>

          {contrato.status_assinatura === 'assinado' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onNavigateToCronograma}
            >
              <Edit className="h-4 w-4 mr-2" />
              Gerenciar Cronograma
            </Button>
          )}

          <Button 
            variant="default" 
            size="sm" 
            onClick={abrirWhatsApp}
            className="bg-green-600 hover:bg-green-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chamar WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ContratosAtivos = ({ onNavigateToCronograma }: { onNavigateToCronograma?: () => void } = {}) => {
  const { contratos, loading, estatisticas, atualizarStatusAssinatura } = useContratosAtivos();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Contratos</h1>
        <p className="text-muted-foreground">
          Gerencie seus contratos e acompanhe o status das obras
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Contratos</p>
                <p className="text-xl font-semibold">{estatisticas.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Assinatura</p>
                <p className="text-xl font-semibold">{estatisticas.aguardando_assinatura}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Aprovados para Início</p>
                <p className="text-xl font-semibold">{estatisticas.aprovados_inicio}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-semibold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(estatisticas.valor_total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Contratos */}
      {contratos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum contrato encontrado</h3>
            <p className="text-muted-foreground">
              Quando um cliente aceitar sua proposta, o contrato aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contratos.map((contrato) => (
            <ContratoCard 
              key={contrato.id} 
              contrato={contrato} 
              onStatusChange={atualizarStatusAssinatura}
              isLoading={loading}
              onNavigateToCronograma={onNavigateToCronograma}
            />
          ))}
        </div>
      )}
    </div>
  );
};