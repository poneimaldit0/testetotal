import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Eye, EyeOff, Mail, ExternalLink, Shield, Copy, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credenciais: {
    email: string;
    senha_temporaria: string;
  };
  nomeCliente: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  onOpenChange,
  credenciais,
  nomeCliente
}) => {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const { toast } = useToast();

  const copiarCredenciais = () => {
    const texto = `Email: ${credenciais.email}\nSenha: ${credenciais.senha_temporaria}`;
    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: "Credenciais copiadas para a área de transferência",
    });
  };

  const acessarSistema = () => {
    window.open('/login-cliente', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 text-xl">
            <CheckCircle2 className="h-7 w-7" />
            Proposta Aceita com Sucesso!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 text-lg">
              Parabéns, <strong>{nomeCliente}</strong>! Sua conta foi criada e você já pode acessar sua área exclusiva.
            </p>
          </div>

          {/* Card com credenciais - mais destaque */}
          <Card className="border-2 border-green-300 bg-green-50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-green-600" />
                <h4 className="font-semibold text-green-800 text-lg">Seus dados de acesso:</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Email:</label>
                  <div className="bg-white p-3 rounded-lg border-2 border-gray-200 text-base font-mono break-all">
                    {credenciais.email}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Senha temporária:</label>
                  <div className="bg-white p-3 rounded-lg border-2 border-gray-200 text-base font-mono flex items-center gap-3">
                    <span className="flex-1 break-all">
                      {mostrarSenha ? credenciais.senha_temporaria : '••••••••••••'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={copiarCredenciais}
                className="w-full mt-4 text-green-700 border-2 border-green-300 hover:bg-green-100 py-3 text-base font-semibold"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copiar Credenciais
              </Button>
            </CardContent>
          </Card>

          {/* Aviso importante */}
          <Alert className="border-2 border-amber-300 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800 font-semibold">Importante</AlertTitle>
            <AlertDescription className="text-amber-800">
              Por segurança, você será solicitado a alterar essa senha temporária no seu primeiro acesso.
            </AlertDescription>
          </Alert>

          {/* Informação sobre email e como acessar */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-3 flex-1">
                <p className="text-sm text-blue-800 font-medium">
                  Enviamos também um email com suas credenciais e instruções detalhadas.
                </p>
                <div className="bg-blue-100 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-1">🔗 Link de acesso exclusivo para clientes:</p>
                  <div className="text-xs text-blue-700 font-mono break-all bg-white p-2 rounded border">
                    https://clientes.reforma100.com.br/login-cliente
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* O que encontrará no sistema */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 text-base">Na sua área você encontrará:</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Detalhes completos do seu projeto</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Acompanhamento do progresso da obra</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Comunicação direta com o fornecedor</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Documentos e contratos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span>Diário da obra com fotos</span>
              </li>
            </ul>
          </div>

          {/* Botões de ação - mais destaque */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-3 text-base border-2 border-gray-300 hover:bg-gray-50"
            >
              Fechar
            </Button>
            <Button
              onClick={acessarSistema}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-base font-semibold shadow-lg"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Acessar Área do Cliente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};