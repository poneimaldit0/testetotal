import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { GestaoCategoriasFinanceiras } from './configuracoes/GestaoCategoriasFinanceiras';
import { GestaoSubcategoriasFinanceiras } from './configuracoes/GestaoSubcategoriasFinanceiras';
import { GestaoFornecedoresClientes } from './configuracoes/GestaoFornecedoresClientes';
import { GestaoContasBancarias } from './configuracoes/GestaoContasBancarias';
import { ApropriacaoSubcategoriasMassa } from './configuracoes/ApropriacaoSubcategoriasMassa';
import { ApropriacaoAutomaticaReview } from './configuracoes/ApropriacaoAutomaticaReview';
import { GestaoMotivosPerda } from './configuracoes/GestaoMotivosPerda';

export function ConfiguracoesFinanceiras() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações Financeiras</h2>
          <p className="text-muted-foreground">
            Gerencie categorias, fornecedores e configurações do sistema financeiro
          </p>
        </div>
      </div>

      <Tabs defaultValue="categorias" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="subcategorias">Subcategorias</TabsTrigger>
          <TabsTrigger value="apropriacao-massa">Apropriação Manual</TabsTrigger>
          <TabsTrigger value="apropriacao-auto">Apropriação Auto</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores/Clientes</TabsTrigger>
          <TabsTrigger value="contas-bancarias">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="motivos-perda">Motivos de Perda</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Categorias</CardTitle>
              <CardDescription>
                Cadastre e gerencie categorias para organizar suas receitas e despesas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GestaoCategoriasFinanceiras />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcategorias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Subcategorias</CardTitle>
              <CardDescription>
                Cadastre subcategorias para organizar melhor suas receitas e despesas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GestaoSubcategoriasFinanceiras />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apropriacao-massa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Apropriação Manual em Massa de Subcategorias</CardTitle>
              <CardDescription>
                Atribua subcategorias para múltiplas contas a pagar e receber de uma só vez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApropriacaoSubcategoriasMassa />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apropriacao-auto" className="space-y-6">
          <ApropriacaoAutomaticaReview />
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Fornecedores e Clientes</CardTitle>
              <CardDescription>
                Cadastre fornecedores e clientes para facilitar a criação de contas a pagar e receber
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GestaoFornecedoresClientes />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contas-bancarias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Contas Bancárias</CardTitle>
              <CardDescription>
                Cadastre e gerencie suas contas bancárias para controle de saldos e conciliação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GestaoContasBancarias />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motivos-perda" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Motivos de Perda</CardTitle>
              <CardDescription>
                Configure os motivos que podem ser selecionados ao marcar uma conta a receber como perda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GestaoMotivosPerda />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}