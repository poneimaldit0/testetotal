import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, FileText, Target, Radio, Settings } from 'lucide-react';
import { VisaoGeralFunil } from './VisaoGeralFunil';
import { DesempenhoPorCloser } from './DesempenhoPorCloser';
import { RegistrosDiarios } from './RegistrosDiarios';
import { GestaoMetas } from './GestaoMetas';
import { DesempenhoPorCanal } from './DesempenhoPorCanal';
import { GestaoCanaisOrigem } from './GestaoCanaisOrigem';

export const FunilVendasAdmin: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Funil de Vendas — Gestão</h2>
      
      <Tabs defaultValue="visao-geral">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="visao-geral" className="flex items-center gap-1 text-xs md:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="por-closer" className="flex items-center gap-1 text-xs md:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Por Closer</span>
          </TabsTrigger>
          <TabsTrigger value="registros" className="flex items-center gap-1 text-xs md:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Registros</span>
          </TabsTrigger>
          <TabsTrigger value="metas" className="flex items-center gap-1 text-xs md:text-sm">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Metas</span>
          </TabsTrigger>
          <TabsTrigger value="por-canal" className="flex items-center gap-1 text-xs md:text-sm">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Por Canal</span>
          </TabsTrigger>
          <TabsTrigger value="canais" className="flex items-center gap-1 text-xs md:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Canais</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeralFunil />
        </TabsContent>
        <TabsContent value="por-closer">
          <DesempenhoPorCloser />
        </TabsContent>
        <TabsContent value="registros">
          <RegistrosDiarios />
        </TabsContent>
        <TabsContent value="metas">
          <GestaoMetas />
        </TabsContent>
        <TabsContent value="por-canal">
          <DesempenhoPorCanal />
        </TabsContent>
        <TabsContent value="canais">
          <GestaoCanaisOrigem />
        </TabsContent>
      </Tabs>
    </div>
  );
};
