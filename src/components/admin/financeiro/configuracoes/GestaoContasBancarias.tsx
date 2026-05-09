import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { ContaBancaria, CreateContaBancariaInput } from '@/types/financeiro';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Building2, CreditCard, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function GestaoContasBancarias() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [contaEditando, setContaEditando] = useState<ContaBancaria | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalSaldoAberto, setModalSaldoAberto] = useState(false);
  const [contaSaldoEditando, setContaSaldoEditando] = useState<ContaBancaria | null>(null);
  const [formData, setFormData] = useState<CreateContaBancariaInput>({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    saldo_atual: 0,
    observacoes: ''
  });
  const [saldoData, setSaldoData] = useState({
    novo_saldo: 0,
    observacao: ''
  });

  const { buscarContasBancarias, criarContaBancaria, editarContaBancaria, atualizarSaldoBancario, loading } = useFinanceiro();
  const { toast } = useToast();

  const carregarContas = async () => {
    const contasData = await buscarContasBancarias();
    setContas(contasData);
  };

  useEffect(() => {
    carregarContas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let sucesso = false;
    if (contaEditando) {
      sucesso = await editarContaBancaria(contaEditando.id, formData);
    } else {
      sucesso = await criarContaBancaria(formData);
    }

    if (sucesso) {
      await carregarContas();
      setModalAberto(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      banco: '',
      agencia: '',
      conta: '',
      saldo_atual: 0,
      observacoes: ''
    });
    setContaEditando(null);
  };

  const abrirEdicao = (conta: ContaBancaria) => {
    setContaEditando(conta);
    setFormData({
      nome: conta.nome,
      banco: conta.banco,
      agencia: conta.agencia || '',
      conta: conta.conta,
      saldo_atual: conta.saldo_atual,
      observacoes: conta.observacoes || ''
    });
    setModalAberto(true);
  };

  const alternarStatus = async (conta: ContaBancaria) => {
    const sucesso = await editarContaBancaria(conta.id, { ativa: !conta.ativa });
    if (sucesso) {
      await carregarContas();
    }
  };

  const abrirModalSaldo = (conta: ContaBancaria) => {
    setContaSaldoEditando(conta);
    setSaldoData({
      novo_saldo: conta.saldo_atual,
      observacao: ''
    });
    setModalSaldoAberto(true);
  };

  const handleSubmitSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaSaldoEditando) return;

    const sucesso = await atualizarSaldoBancario(contaSaldoEditando.id, saldoData);
    if (sucesso) {
      await carregarContas();
      setModalSaldoAberto(false);
      setContaSaldoEditando(null);
      setSaldoData({ novo_saldo: 0, observacao: '' });
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Contas Bancárias</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie suas contas bancárias e saldos
          </p>
        </div>
        
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {contaEditando ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome da Conta *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Conta Corrente Principal"
                  required
                />
              </div>

              <div>
                <Label htmlFor="banco">Banco *</Label>
                <Input
                  id="banco"
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Ex: Banco do Brasil"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="Ex: 1234-5"
                  />
                </div>

                <div>
                  <Label htmlFor="conta">Conta *</Label>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="Ex: 12345-6"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="saldo_atual">Saldo Atual</Label>
                <Input
                  id="saldo_atual"
                  type="number"
                  step="0.01"
                  value={formData.saldo_atual}
                  onChange={(e) => setFormData({ ...formData, saldo_atual: Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais sobre a conta"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalAberto(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {contas.map((conta) => (
          <Card key={conta.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{conta.nome}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{conta.banco}</span>
                    {conta.agencia && (
                      <>
                        <span>•</span>
                        <span>Ag: {conta.agencia}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Conta: {conta.conta}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-medium text-foreground">
                    {formatarValor(conta.saldo_atual)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={conta.ativa ? 'default' : 'secondary'}>
                      {conta.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={conta.ativa}
                    onCheckedChange={() => alternarStatus(conta)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirModalSaldo(conta)}
                    title="Atualizar Saldo"
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEdicao(conta)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {conta.observacoes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-muted-foreground">{conta.observacoes}</p>
              </div>
            )}
          </Card>
        ))}

        {contas.length === 0 && (
          <Card className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma conta bancária cadastrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Cadastre suas contas bancárias para começar o controle financeiro
            </p>
            <Button onClick={() => { resetForm(); setModalAberto(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeira Conta
            </Button>
          </Card>
        )}
      </div>

      {/* Modal para Atualizar Saldo */}
      <Dialog open={modalSaldoAberto} onOpenChange={setModalSaldoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Saldo da Conta</DialogTitle>
          </DialogHeader>
          
          {contaSaldoEditando && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{contaSaldoEditando.nome}</p>
                <p className="text-sm text-muted-foreground">{contaSaldoEditando.banco}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo atual: {formatarValor(contaSaldoEditando.saldo_atual)}
                </p>
              </div>

              <form onSubmit={handleSubmitSaldo} className="space-y-4">
                <div>
                  <Label htmlFor="novo_saldo">Novo Saldo *</Label>
                  <Input
                    id="novo_saldo"
                    type="number"
                    step="0.01"
                    value={saldoData.novo_saldo}
                    onChange={(e) => setSaldoData({ ...saldoData, novo_saldo: Number(e.target.value) })}
                    placeholder="0,00"
                    required
                  />
                  {saldoData.novo_saldo !== contaSaldoEditando.saldo_atual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Diferença: {formatarValor(saldoData.novo_saldo - contaSaldoEditando.saldo_atual)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="observacao">Motivo da Alteração *</Label>
                  <Textarea
                    id="observacao"
                    value={saldoData.observacao}
                    onChange={(e) => setSaldoData({ ...saldoData, observacao: e.target.value })}
                    placeholder="Ex: Ajuste por erro de lançamento, reconciliação bancária..."
                    required
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalSaldoAberto(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Atualizando...' : 'Atualizar Saldo'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}