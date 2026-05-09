import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, User, MapPin, CreditCard } from 'lucide-react';
import { PropostaComparacao } from '@/types/comparacao';
import { DadosCadastroCliente } from '@/types/cliente';

interface AceitarPropostaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: PropostaComparacao;
  onAceitar: (dados: DadosCadastroCliente) => void;
  loading?: boolean;
}

export const AceitarPropostaModal = ({
  open,
  onOpenChange,
  proposta,
  onAceitar,
  loading = false
}: AceitarPropostaModalProps) => {
  const [dados, setDados] = useState<DadosCadastroCliente>({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco_atual: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: ''
    },
    endereco_reforma: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: ''
    }
  });

  const [mesmoEndereco, setMesmoEndereco] = useState(false);

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dadosFinais = {
      ...dados,
      endereco_reforma: mesmoEndereco ? dados.endereco_atual : dados.endereco_reforma
    };
    
    onAceitar(dadosFinais);
  };

  const handleInputChange = (field: string, value: string) => {
    setDados(prev => ({ ...prev, [field]: value }));
  };

  const handleEnderecoChange = (tipo: 'endereco_atual' | 'endereco_reforma', field: string, value: string) => {
    setDados(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], [field]: value }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Aceitar Proposta
          </DialogTitle>
          <DialogDescription>
            Complete os dados abaixo para prosseguir com a proposta selecionada
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da Proposta */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Proposta Selecionada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fornecedor</p>
                <p className="font-semibold">{proposta.fornecedor.empresa}</p>
                <p className="text-sm">{proposta.fornecedor.nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatarValor(proposta.proposta.valor_total_estimado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={dados.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={dados.cpf}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={dados.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={dados.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço Atual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cep_atual">CEP *</Label>
                  <Input
                    id="cep_atual"
                    value={dados.endereco_atual.cep}
                    onChange={(e) => handleEnderecoChange('endereco_atual', 'cep', e.target.value)}
                    placeholder="00000-000"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="logradouro_atual">Logradouro *</Label>
                  <Input
                    id="logradouro_atual"
                    value={dados.endereco_atual.logradouro}
                    onChange={(e) => handleEnderecoChange('endereco_atual', 'logradouro', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="numero_atual">Número *</Label>
                  <Input
                    id="numero_atual"
                    value={dados.endereco_atual.numero}
                    onChange={(e) => handleEnderecoChange('endereco_atual', 'numero', e.target.value)}
                    placeholder="123"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="complemento_atual">Complemento</Label>
                  <Input
                    id="complemento_atual"
                    value={dados.endereco_atual.complemento}
                    onChange={(e) => handleEnderecoChange('endereco_atual', 'complemento', e.target.value)}
                    placeholder="Apto, Casa, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="bairro_atual">Bairro *</Label>
                  <Input
                    id="bairro_atual"
                    value={dados.endereco_atual.bairro}
                    onChange={(e) => handleEnderecoChange('endereco_atual', 'bairro', e.target.value)}
                    placeholder="Nome do bairro"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cidade_atual">Cidade *</Label>
                  <Input
                    id="cidade_atual"
                    value={dados.endereco_atual.cidade}
                    onChange={(e) => handleEnderecoChange('endereco_atual', 'cidade', e.target.value)}
                    placeholder="Nome da cidade"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="uf_atual">UF *</Label>
                <Input
                  id="uf_atual"
                  value={dados.endereco_atual.uf}
                  onChange={(e) => handleEnderecoChange('endereco_atual', 'uf', e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  className="w-20"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço da Reforma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço da Reforma
              </CardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="mesmo-endereco"
                  checked={mesmoEndereco}
                  onChange={(e) => setMesmoEndereco(e.target.checked)}
                />
                <Label htmlFor="mesmo-endereco" className="text-sm">
                  Mesmo endereço atual
                </Label>
              </div>
            </CardHeader>
            {!mesmoEndereco && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cep_reforma">CEP *</Label>
                    <Input
                      id="cep_reforma"
                      value={dados.endereco_reforma.cep}
                      onChange={(e) => handleEnderecoChange('endereco_reforma', 'cep', e.target.value)}
                      placeholder="00000-000"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="logradouro_reforma">Logradouro *</Label>
                    <Input
                      id="logradouro_reforma"
                      value={dados.endereco_reforma.logradouro}
                      onChange={(e) => handleEnderecoChange('endereco_reforma', 'logradouro', e.target.value)}
                      placeholder="Rua, Avenida, etc."
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="numero_reforma">Número *</Label>
                    <Input
                      id="numero_reforma"
                      value={dados.endereco_reforma.numero}
                      onChange={(e) => handleEnderecoChange('endereco_reforma', 'numero', e.target.value)}
                      placeholder="123"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento_reforma">Complemento</Label>
                    <Input
                      id="complemento_reforma"
                      value={dados.endereco_reforma.complemento}
                      onChange={(e) => handleEnderecoChange('endereco_reforma', 'complemento', e.target.value)}
                      placeholder="Apto, Casa, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro_reforma">Bairro *</Label>
                    <Input
                      id="bairro_reforma"
                      value={dados.endereco_reforma.bairro}
                      onChange={(e) => handleEnderecoChange('endereco_reforma', 'bairro', e.target.value)}
                      placeholder="Nome do bairro"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade_reforma">Cidade *</Label>
                    <Input
                      id="cidade_reforma"
                      value={dados.endereco_reforma.cidade}
                      onChange={(e) => handleEnderecoChange('endereco_reforma', 'cidade', e.target.value)}
                      placeholder="Nome da cidade"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="uf_reforma">UF *</Label>
                  <Input
                    id="uf_reforma"
                    value={dados.endereco_reforma.uf}
                    onChange={(e) => handleEnderecoChange('endereco_reforma', 'uf', e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    className="w-20"
                    required
                  />
                </div>
              </CardContent>
            )}
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processando...' : 'Aceitar Proposta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};