import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
const AguardandoAprovacao = () => {
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };
  return <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="bg-yellow-100 rounded-full p-4 w-fit mx-auto">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl text-secondary">
            Aguardando Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <p className="text-gray-600">
              Sua solicitação de cadastro foi enviada com sucesso!
            </p>
            <p className="text-gray-600">
              Nossa equipe está analisando suas informações e você receberá um email assim que seu cadastro for aprovado.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-blue-800">Próximos passos:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Aguarde o email de aprovação</li>
              <li>• Mantenha seus dados atualizados</li>
              <li>• Entre em contato se precisar de ajuda</li>
            </ul>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-gray-800">Precisa de ajuda?</h4>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>contato@reforma100.com</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>(11) 95717-3611</span>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Fazer Logout
            </Button>
            <Button onClick={() => navigate('/cadastro-fornecedor')} variant="link" className="w-full text-sm">
              Cadastrar outro fornecedor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default AguardandoAprovacao;