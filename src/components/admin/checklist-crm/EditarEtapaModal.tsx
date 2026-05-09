import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { SeletorCorEtapa } from './SeletorCorEtapa';
import { SeletorIconeEtapa } from './SeletorIconeEtapa';
import type { EtapaConfig } from '@/hooks/useEtapasConfig';
import { Card } from '@/components/ui/card';

interface EditarEtapaModalProps {
  etapa: EtapaConfig;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, dados: { titulo: string; descricao: string | null; cor: string; icone: string; dias_limite: number | null; cor_atraso: string | null }) => void;
}

export function EditarEtapaModal({ etapa, open, onClose, onSave }: EditarEtapaModalProps) {
  const [titulo, setTitulo] = useState(etapa.titulo);
  const [descricao, setDescricao] = useState(etapa.descricao || '');
  const [cor, setCor] = useState(etapa.cor);
  const [icone, setIcone] = useState(etapa.icone);
  const [diasLimite, setDiasLimite] = useState<string>(etapa.dias_limite?.toString() || '');
  const [semLimite, setSemLimite] = useState(!etapa.dias_limite);
  const [corAtraso, setCorAtraso] = useState(etapa.cor_atraso || 'bg-red-100 border-red-500');

  const handleSalvar = () => {
    onSave(etapa.id, {
      titulo,
      descricao: descricao.trim() || null,
      cor,
      icone,
      dias_limite: semLimite ? null : (parseInt(diasLimite) || null),
      cor_atraso: semLimite ? null : corAtraso
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Etapa: {etapa.valor}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview da Etapa */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div 
                className={`w-12 h-12 rounded-lg ${cor} flex items-center justify-center text-2xl`}
              >
                {icone}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{titulo || 'Título da Etapa'}</h4>
                <p className="text-sm text-muted-foreground">
                  {descricao || 'Descrição da etapa'}
                </p>
              </div>
            </div>
          </Card>

          {/* Campo Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Etapa</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Orçamento Postado"
            />
          </div>

          {/* Campo Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o objetivo desta etapa..."
              rows={3}
            />
          </div>

          {/* Seletor de Cor */}
          <SeletorCorEtapa corAtual={cor} onChange={setCor} />

          {/* Seletor de Ícone */}
          <SeletorIconeEtapa iconeAtual={icone} onChange={setIcone} />

          {/* Configuração de Lead Time */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">⏱️ Configuração de Lead Time</Label>
            <p className="text-xs text-muted-foreground">
              Defina quantos dias um lead pode permanecer nesta etapa antes de ser considerado em atraso
            </p>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sem-limite"
                checked={semLimite}
                onChange={(e) => {
                  setSemLimite(e.target.checked);
                  if (e.target.checked) setDiasLimite('');
                }}
                className="rounded border-gray-300"
              />
              <Label htmlFor="sem-limite" className="text-sm font-normal cursor-pointer">
                Sem limite de tempo
              </Label>
            </div>

            {!semLimite && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dias-limite">Limite de dias na etapa</Label>
                  <Input
                    id="dias-limite"
                    type="number"
                    min="1"
                    value={diasLimite}
                    onChange={(e) => setDiasLimite(e.target.value)}
                    placeholder="Ex: 3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Após {diasLimite || 'X'} dias, o card será destacado visualmente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cor de alerta quando em atraso</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { nome: 'Vermelho Claro', classe: 'bg-red-100 border-red-500' },
                      { nome: 'Laranja Claro', classe: 'bg-orange-100 border-orange-500' },
                      { nome: 'Amarelo', classe: 'bg-yellow-100 border-yellow-600' },
                      { nome: 'Rosa', classe: 'bg-pink-100 border-pink-500' },
                    ].map((opcao) => (
                      <button
                        key={opcao.classe}
                        type="button"
                        onClick={() => setCorAtraso(opcao.classe)}
                        className={`h-12 rounded-lg border-2 transition-all ${opcao.classe} ${
                          corAtraso === opcao.classe ? 'ring-2 ring-offset-2 ring-foreground scale-105' : ''
                        }`}
                        title={opcao.nome}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview de card em atraso */}
                <div className="space-y-2">
                  <Label>Preview do alerta:</Label>
                  <Card className={`p-3 ${corAtraso}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg ${cor} flex items-center justify-center text-xl`}>
                        {icone}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{titulo || 'Card em Atraso'}</p>
                        <p className="text-xs text-muted-foreground">
                          {diasLimite ? `Há ${parseInt(diasLimite) + 2} dias nesta etapa` : 'Lead time excedido'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Nota:</strong> O campo "valor" ({etapa.valor}) não pode ser alterado para manter a integridade dos dados.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}