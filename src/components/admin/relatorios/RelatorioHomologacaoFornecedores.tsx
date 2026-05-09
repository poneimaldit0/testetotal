
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { FornecedorCombobox } from '../FornecedorCombobox';
import { useDocumentosHomologacao, TIPOS_DOCUMENTO, type DocumentoHomologacao, type TipoDocumento } from '@/hooks/useDocumentosHomologacao';
import { useRelatoriosAdmin, type Fornecedor } from '@/hooks/useRelatoriosAdmin';
import { Download, FileCheck, FileX, Building2, Mail, Phone, MapPin, CreditCard, Calendar } from 'lucide-react';

const RelatorioHomologacaoFornecedores = () => {
  const [fornecedorId, setFornecedorId] = useState('');
  const [dados, setDados] = useState<any>(null);
  const [documentos, setDocumentos] = useState<DocumentoHomologacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const { buscarDadosHomologacao, buscarDocumentosHomologacao, downloadDocumento } = useDocumentosHomologacao();
  const { buscarFornecedores } = useRelatoriosAdmin();

  useEffect(() => {
    buscarFornecedores().then(setFornecedores).catch(console.error);
  }, [buscarFornecedores]);

  useEffect(() => {
    if (!fornecedorId) {
      setDados(null);
      setDocumentos([]);
      return;
    }

    const carregar = async () => {
      setLoading(true);
      const [d, docs] = await Promise.all([
        buscarDadosHomologacao(fornecedorId),
        buscarDocumentosHomologacao(fornecedorId),
      ]);
      setDados(d);
      setDocumentos(docs);
      setLoading(false);
    };

    carregar();
  }, [fornecedorId]);

  const getDocumentoPorTipo = (tipo: TipoDocumento) => {
    return documentos.find(d => d.tipo_documento === tipo);
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Label>Selecionar Fornecedor</Label>
        <FornecedorCombobox
          fornecedores={fornecedores}
          value={fornecedorId}
          onValueChange={setFornecedorId}
        />
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados de homologação...</p>
        </div>
      )}

      {!loading && fornecedorId && !dados && (
        <Card>
          <CardContent className="p-6 text-center">
            <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Este fornecedor ainda não possui dados de homologação cadastrados.</p>
          </CardContent>
        </Card>
      )}

      {!loading && dados && (
        <>
          {/* Ficha Cadastral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Building2 className="h-5 w-5 mr-2 text-primary" />
                Ficha Cadastral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Building2 className="h-4 w-4 mr-1" /> CNPJ
                  </p>
                  <p className="font-medium">{dados.cnpj}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Mail className="h-4 w-4 mr-1" /> E-mail
                  </p>
                  <p className="font-medium">{dados.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Phone className="h-4 w-4 mr-1" /> Telefone
                  </p>
                  <p className="font-medium">{dados.telefone}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="h-4 w-4 mr-1" /> Endereço Completo
                  </p>
                  <p className="font-medium">{dados.endereco_completo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-1" /> Vigência do Contrato
                  </p>
                  <p className="font-medium">{dados.vigencia_contrato}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <CreditCard className="h-4 w-4 mr-1" /> Forma de Pagamento
                  </p>
                  <p className="font-medium">{dados.forma_pagamento}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileCheck className="h-5 w-5 mr-2 text-primary" />
                Documentos de Homologação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TIPOS_DOCUMENTO.map(({ tipo, label }) => {
                  const doc = getDocumentoPorTipo(tipo);
                  return (
                    <div key={tipo} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {doc ? (
                          <Badge variant="default" className="bg-green-600">Enviado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                        <div>
                          <p className="font-medium text-sm">{label}</p>
                          {doc && (
                            <p className="text-xs text-muted-foreground">{doc.nome_arquivo}</p>
                          )}
                        </div>
                      </div>
                      {doc && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocumento(doc.caminho_storage)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioHomologacaoFornecedores;
