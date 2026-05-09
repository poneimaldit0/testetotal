import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, History } from "lucide-react";

interface SeletorAcaoMedicoesProps {
  onVerHistorico: () => void;
  onCriarNova: () => void;
}

export function SeletorAcaoMedicoes({ onVerHistorico, onCriarNova }: SeletorAcaoMedicoesProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Medições de Obra</h2>
        <p className="text-muted-foreground">
          Gerencie suas medições de obra - visualize o histórico ou crie uma nova medição
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="transition-all hover:shadow-lg cursor-pointer group" onClick={onVerHistorico}>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit group-hover:bg-blue-200 transition-colors">
              <History className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Ver Minhas Medições</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Visualize o histórico completo de todas as suas medições enviadas, 
              aprovadas e pagas. Acompanhe o status e valores de cada medição.
            </p>
            <Button className="w-full" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Visualizar Histórico
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg cursor-pointer group" onClick={onCriarNova}>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit group-hover:bg-green-200 transition-colors">
              <Plus className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl">Criar Nova Medição</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Crie uma nova medição de obra para uma das suas obras em andamento. 
              Escolha entre medição tradicional ou por itens do checklist.
            </p>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nova Medição
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          As medições são utilizadas para controle do andamento da obra e processamento de pagamentos. 
          Mantenha suas medições sempre atualizadas para um melhor acompanhamento dos projetos.
        </p>
      </div>
    </div>
  );
}