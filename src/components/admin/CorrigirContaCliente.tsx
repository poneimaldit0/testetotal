import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { corrigirEmailCliente } from '@/utils/criarContaCliente';
import { AlertTriangle, CheckCircle, Mail, User } from 'lucide-react';

export function CorrigirContaCliente() {
  const [loading, setLoading] = useState(false);
  const [corrigido, setCorrigido] = useState(false);
  const { toast } = useToast();

  const handleCorrigir = async () => {
    setLoading(true);
    try {
      const resultado = await corrigirEmailCliente();
      
      if (resultado.success) {
        setCorrigido(true);
        toast({
          title: "Conta corrigida com sucesso!",
          description: "Nova conta criada e credenciais enviadas por email.",
        });
      } else {
        toast({
          title: "Erro ao corrigir conta",
          description: resultado.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao corrigir a conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {corrigido ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          Correção de Email do Cliente
        </CardTitle>
        <CardDescription>
          Corrigir o email da conta do cliente de temporário para o email real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!corrigido ? (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Email Temporário Detectado
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    A conta do cliente foi criada com email temporário
                    (financeiro+cliente1758244116502@reforma100.com.br) ao invés 
                    do email real (financeiro@reforma100.com.br).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </Label>
                <Input value="Raphael Nardi" disabled />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email do Cliente
                </Label>
                <Input value="financeiro@reforma100.com.br" disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Email Atual (Temporário)
                </Label>
                <Input value="financeiro+cliente1758244116502@reforma100.com.br" disabled className="text-red-600" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Email Correto
                </Label>
                <Input value="financeiro@reforma100.com.br" disabled className="text-green-600" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">
                    Ação Corretiva
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    O email será atualizado no Supabase Auth e novas credenciais
                    serão enviadas para o email correto.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCorrigir} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Corrigindo Email..." : "Corrigir Email Agora"}
            </Button>
          </>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 mb-2">
              Email Corrigido com Sucesso!
            </h3>
            <p className="text-green-700">
              Email atualizado para financeiro@reforma100.com.br e novas credenciais enviadas
            </p>
            <div className="mt-4 p-4 bg-white rounded border">
              <p className="text-sm text-gray-600">
                ✅ Email atualizado no Supabase Auth<br />
                ✅ Registro do cliente atualizado<br />
                ✅ Novas credenciais enviadas<br />
                ✅ Cliente pode fazer login normalmente
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}