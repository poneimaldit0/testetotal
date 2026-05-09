import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CheckCircle2, 
  Package, 
  MessageCircle, 
  FileText,
  Clock
} from 'lucide-react';
import { CronogramaObra } from './CronogramaObra';
import { MedicoesObra } from './MedicoesObra';
import { SolicitarMateriais } from './SolicitarMateriais';

interface ClienteFuncionalidadesProps {
  contratoId?: string;
  hasActiveContract: boolean;
}

export const ClienteFuncionalidades: React.FC<ClienteFuncionalidadesProps> = ({ 
  contratoId, 
  hasActiveContract 
}) => {
  const [activeTab, setActiveTab] = useState('cronograma');

  if (!hasActiveContract) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
              <MessageCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Chat</p>
                <p className="text-sm text-gray-500">Em breve</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Cronograma</p>
                <p className="text-sm text-gray-500">Aguardando contrato</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
              <div>
                <p className="font-medium">Medições</p>
                <p className="text-sm text-gray-500">Aguardando contrato</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
              <Package className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">Materiais</p>
                <p className="text-sm text-gray-500">Aguardando contrato</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                As funcionalidades ficam disponíveis após a assinatura do contrato
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Acompanhe seu Projeto</CardTitle>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Contrato Ativo
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cronograma" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Cronograma
            </TabsTrigger>
            <TabsTrigger value="medicoes" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Medições
            </TabsTrigger>
            <TabsTrigger value="materiais" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Materiais
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cronograma" className="mt-6">
            <CronogramaObra contratoId={contratoId} />
          </TabsContent>

          <TabsContent value="medicoes" className="mt-6">
            <MedicoesObra contratoId={contratoId} />
          </TabsContent>

          <TabsContent value="materiais" className="mt-6">
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Gestão de Materiais</p>
              <p className="text-sm">Em breve você poderá solicitar e acompanhar materiais extras</p>
            </div>
          </TabsContent>

          <TabsContent value="documentos" className="mt-6">
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Documentos do projeto</p>
              <p className="text-sm">Em breve você poderá acessar e baixar todos os documentos</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};