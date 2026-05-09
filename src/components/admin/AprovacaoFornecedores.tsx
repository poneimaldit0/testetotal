
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAprovacaoFornecedor } from '@/hooks/useAprovacaoFornecedor';
import { useDocumentosHomologacao, TIPOS_DOCUMENTO, type TipoDocumento, type DadosHomologacao } from '@/hooks/useDocumentosHomologacao';
import { Clock, RefreshCw, Upload, FileCheck, AlertCircle } from 'lucide-react';
import TabelaCadastrosPendentes from './TabelaCadastrosPendentes';
import { FormularioContasReceber, ContaReceberFormData } from './financeiro/FormularioContasReceber';

const AprovacaoFornecedores = () => {
  const { 
    cadastrosPendentes, 
    loading, 
    buscarCadastrosPendentes, 
    aprovarFornecedor, 
    rejeitarFornecedor 
  } = useAprovacaoFornecedor();
  const { uploadDocumento, salvarDadosHomologacao } = useDocumentosHomologacao();

  const [modalAprovar, setModalAprovar] = useState<string | null>(null);
  const [modalRejeitar, setModalRejeitar] = useState<string | null>(null);
  const [formAprovacao, setFormAprovacao] = useState({
    dataTerminoContrato: '',
    limiteAcessosDiarios: 10,
    limiteAcessosMensais: 100,
    observacoes: ''
  });
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processando, setProcessando] = useState<string | null>(null);
  
  // Estados para contas a receber
  const [criarContasReceber, setCriarContasReceber] = useState(false);
  const [contasReceber, setContasReceber] = useState<ContaReceberFormData[]>([]);

  // Estados para dados cadastrais de homologação
  const [dadosHomologacao, setDadosHomologacao] = useState<DadosHomologacao>({
    cnpj: '',
    endereco_completo: '',
    email: '',
    telefone: '',
    vigencia_contrato: '',
    forma_pagamento: '',
  });

  // Estados para uploads de documentos
  const [arquivosDocumentos, setArquivosDocumentos] = useState<Record<TipoDocumento, File | null>>({
    rg_cnh: null,
    comprovante_endereco_pf: null,
    cartao_cnpj: null,
    contrato_social: null,
    comprovante_endereco_pj: null,
    contrato_homologacao: null,
  });

  useEffect(() => {
    buscarCadastrosPendentes();
  }, []);

  const todosDocumentosAnexados = Object.values(arquivosDocumentos).every(f => f !== null);
  const todosDadosPreenchidos = dadosHomologacao.cnpj && dadosHomologacao.endereco_completo && 
    dadosHomologacao.email && dadosHomologacao.telefone && dadosHomologacao.vigencia_contrato && 
    dadosHomologacao.forma_pagamento;

  const handleAprovar = async () => {
    if (!modalAprovar || !formAprovacao.dataTerminoContrato || !todosDocumentosAnexados || !todosDadosPreenchidos) return;

    setProcessando(modalAprovar);
    
    // 1. Salvar dados de homologação
    const dadosSalvos = await salvarDadosHomologacao(modalAprovar, dadosHomologacao);
    if (!dadosSalvos) {
      setProcessando(null);
      return;
    }

    // 2. Upload dos documentos
    for (const [tipo, arquivo] of Object.entries(arquivosDocumentos)) {
      if (arquivo) {
        const ok = await uploadDocumento(modalAprovar, tipo as TipoDocumento, arquivo);
        if (!ok) {
          setProcessando(null);
          return;
        }
      }
    }

    // 3. Aprovar fornecedor
    const sucesso = await aprovarFornecedor({
      userId: modalAprovar,
      dataTerminoContrato: formAprovacao.dataTerminoContrato,
      limiteAcessosDiarios: formAprovacao.limiteAcessosDiarios,
      limiteAcessosMensais: formAprovacao.limiteAcessosMensais,
      observacoes: formAprovacao.observacoes,
      contasReceber: criarContasReceber ? contasReceber : undefined,
      clienteNome: cadastroSelecionado?.nome,
      clienteEmail: cadastroSelecionado?.email
    });

    if (sucesso) {
      setModalAprovar(null);
      setFormAprovacao({
        dataTerminoContrato: '',
        limiteAcessosDiarios: 10,
        limiteAcessosMensais: 100,
        observacoes: ''
      });
      setCriarContasReceber(false);
      setContasReceber([]);
      setDadosHomologacao({ cnpj: '', endereco_completo: '', email: '', telefone: '', vigencia_contrato: '', forma_pagamento: '' });
      setArquivosDocumentos({ rg_cnh: null, comprovante_endereco_pf: null, cartao_cnpj: null, contrato_social: null, comprovante_endereco_pj: null, contrato_homologacao: null });
    }
    
    setProcessando(null);
  };

  const handleRejeitar = async () => {
    if (!modalRejeitar) return;

    setProcessando(modalRejeitar);
    
    const sucesso = await rejeitarFornecedor(modalRejeitar, motivoRejeicao);

    if (sucesso) {
      setModalRejeitar(null);
      setMotivoRejeicao('');
    }
    
    setProcessando(null);
  };

  const abrirModalAprovacao = (userId: string) => {
    setModalAprovar(userId);
  };

  const abrirModalRejeicao = (userId: string) => {
    setModalRejeitar(userId);
  };

  const cadastroSelecionado = cadastrosPendentes.find(c => 
    c.id === modalAprovar || c.id === modalRejeitar
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando cadastros pendentes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Cadastros Pendentes</h2>
          {cadastrosPendentes.length > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {cadastrosPendentes.length}
            </Badge>
          )}
        </div>
        <Button
          onClick={buscarCadastrosPendentes}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <TabelaCadastrosPendentes 
        cadastros={cadastrosPendentes}
        onAprovar={abrirModalAprovacao}
        onRejeitar={abrirModalRejeicao}
        processando={processando}
      />

      {/* Modal de Aprovação */}
      <Dialog open={modalAprovar !== null} onOpenChange={(open) => !open && setModalAprovar(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cadastroSelecionado && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-800">{cadastroSelecionado.nome}</p>
                <p className="text-sm text-blue-600">{cadastroSelecionado.email}</p>
                <p className="text-sm text-blue-600">{cadastroSelecionado.empresa}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="dataTermino">Data de Término do Contrato *</Label>
              <Input
                id="dataTermino"
                type="date"
                value={formAprovacao.dataTerminoContrato}
                onChange={(e) => setFormAprovacao({
                  ...formAprovacao,
                  dataTerminoContrato: e.target.value
                })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="limiteDiario">Limite Diário</Label>
                <Input
                  id="limiteDiario"
                  type="number"
                  min="1"
                  value={formAprovacao.limiteAcessosDiarios}
                  onChange={(e) => setFormAprovacao({
                    ...formAprovacao,
                    limiteAcessosDiarios: parseInt(e.target.value) || 1
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limiteMensal">Limite Mensal</Label>
                <Input
                  id="limiteMensal"
                  type="number"
                  min="1"
                  value={formAprovacao.limiteAcessosMensais}
                  onChange={(e) => setFormAprovacao({
                    ...formAprovacao,
                    limiteAcessosMensais: parseInt(e.target.value) || 1
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Adicione observações sobre a aprovação..."
                value={formAprovacao.observacoes}
                onChange={(e) => setFormAprovacao({
                  ...formAprovacao,
                  observacoes: e.target.value
                })}
              />
            </div>

            {/* Seção de Dados Cadastrais de Homologação */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Dados Cadastrais (Obrigatório)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" value={dadosHomologacao.cnpj}
                    onChange={(e) => setDadosHomologacao({ ...dadosHomologacao, cnpj: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hom-email">E-mail *</Label>
                  <Input id="hom-email" type="email" placeholder="email@empresa.com" value={dadosHomologacao.email}
                    onChange={(e) => setDadosHomologacao({ ...dadosHomologacao, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hom-telefone">Telefone *</Label>
                  <Input id="hom-telefone" placeholder="(00) 00000-0000" value={dadosHomologacao.telefone}
                    onChange={(e) => setDadosHomologacao({ ...dadosHomologacao, telefone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hom-vigencia">Vigência do Contrato *</Label>
                  <Input id="hom-vigencia" placeholder="Ex: 12 meses" value={dadosHomologacao.vigencia_contrato}
                    onChange={(e) => setDadosHomologacao({ ...dadosHomologacao, vigencia_contrato: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hom-endereco">Endereço Completo *</Label>
                  <Input id="hom-endereco" placeholder="Rua, nº, bairro, cidade - UF, CEP" value={dadosHomologacao.endereco_completo}
                    onChange={(e) => setDadosHomologacao({ ...dadosHomologacao, endereco_completo: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hom-pagamento">Forma de Pagamento *</Label>
                  <Input id="hom-pagamento" placeholder="Ex: Boleto mensal, PIX, etc." value={dadosHomologacao.forma_pagamento}
                    onChange={(e) => setDadosHomologacao({ ...dadosHomologacao, forma_pagamento: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Seção de Upload de Documentos */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Documentos Obrigatórios ({Object.values(arquivosDocumentos).filter(f => f !== null).length}/6)
              </h3>
              <div className="space-y-3">
                {TIPOS_DOCUMENTO.map(({ tipo, label }) => (
                  <div key={tipo} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {arquivosDocumentos[tipo] ? (
                        <Badge variant="default" className="bg-green-600 text-white">✓</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        {arquivosDocumentos[tipo] && (
                          <p className="text-xs text-muted-foreground">{arquivosDocumentos[tipo]!.name}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="max-w-[200px] text-xs"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setArquivosDocumentos(prev => ({ ...prev, [tipo]: file }));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {!todosDocumentosAnexados && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Todos os 6 documentos são obrigatórios para aprovar
                </p>
              )}
            </div>

            {/* Seção de Contas a Receber */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={criarContasReceber}
                  onCheckedChange={(checked) => {
                    setCriarContasReceber(checked as boolean);
                    if (!checked) {
                      setContasReceber([]);
                    }
                  }}
                />
                <Label>Cadastrar Contas a Receber</Label>
              </div>
              
              {criarContasReceber && cadastroSelecionado && (
                <FormularioContasReceber
                  clienteNome={cadastroSelecionado.nome}
                  clienteEmail={cadastroSelecionado.email}
                  onContasChange={setContasReceber}
                  disabled={false}
                />
              )}
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleAprovar}
                disabled={processando !== null || !formAprovacao.dataTerminoContrato || !todosDocumentosAnexados || !todosDadosPreenchidos}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {processando === modalAprovar ? 'Aprovando...' : 'Confirmar Aprovação'}
              </Button>
              <Button
                onClick={() => setModalAprovar(null)}
                variant="outline"
                disabled={processando !== null}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição */}
      <Dialog open={modalRejeitar !== null} onOpenChange={(open) => !open && setModalRejeitar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cadastroSelecionado && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-red-800">{cadastroSelecionado.nome}</p>
                <p className="text-sm text-red-600">{cadastroSelecionado.email}</p>
                <p className="text-sm text-red-600">{cadastroSelecionado.empresa}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da Rejeição (opcional)</Label>
              <Textarea
                id="motivo"
                placeholder="Explique o motivo da rejeição..."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Esta ação irá remover permanentemente o usuário do sistema.
              </p>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleRejeitar}
                disabled={processando !== null}
                variant="destructive"
                className="flex-1"
              >
                {processando === modalRejeitar ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
              <Button
                onClick={() => setModalRejeitar(null)}
                variant="outline"
                disabled={processando !== null}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AprovacaoFornecedores;
