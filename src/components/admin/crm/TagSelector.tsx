import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tag, Plus, Globe, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTags } from '@/hooks/useTags';
import { useTagsMarcenaria } from '@/hooks/useTagsMarcenaria';
import { useOrcamentoTags } from '@/hooks/useOrcamentoTags';
import { useLeadMarcenariaTags } from '@/hooks/useLeadMarcenariaTags';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface TagSelectorProps {
  orcamentoId: string;
  tagsAtuais: Array<{ id: string; nome: string; cor: string }>;
  tipo?: 'orcamento' | 'marcenaria';
}

const CORES_PREDEFINIDAS = [
  { nome: 'Azul', valor: '#3b82f6' },
  { nome: 'Verde', valor: '#22c55e' },
  { nome: 'Roxo', valor: '#8b5cf6' },
  { nome: 'Laranja', valor: '#f59e0b' },
  { nome: 'Vermelho', valor: '#ef4444' },
  { nome: 'Rosa', valor: '#ec4899' },
  { nome: 'Amarelo', valor: '#eab308' },
  { nome: 'Cinza', valor: '#64748b' }
];

export function TagSelector({ orcamentoId, tagsAtuais, tipo = 'orcamento' }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [criandoNova, setCriandoNova] = useState(false);
  const [nomeNovaTag, setNomeNovaTag] = useState('');
  const [corNovaTag, setCorNovaTag] = useState('#3b82f6');
  const [tagGlobal, setTagGlobal] = useState(false);
  
  const { profile } = useAuth();
  const isAdmin = ['admin', 'master'].includes(profile?.tipo_usuario || '');
  
  // Usar o hook correto baseado no tipo
  const tagsHookCRM = useTags();
  const tagsHookMarcenaria = useTagsMarcenaria();
  const { tags, criarTag, isCriando } = tipo === 'marcenaria' ? tagsHookMarcenaria : tagsHookCRM;
  
  const orcamentoTagsHook = useOrcamentoTags(orcamentoId);
  const marcenariaTagsHook = useLeadMarcenariaTags(orcamentoId);
  
  // Usar o hook de associação apropriado baseado no tipo
  const { adicionarTag, removerTag } = tipo === 'marcenaria' ? marcenariaTagsHook : orcamentoTagsHook;
  const { toast } = useToast();
  
  const handleToggleTag = (tagId: string) => {
    console.log('🏷️ [TagSelector] handleToggleTag:', { 
      tagId, 
      orcamentoId,
      tipo,
      tagsAtuais: tagsAtuais.map(t => ({ id: t.id, nome: t.nome }))
    });
    
    const jaTem = tagsAtuais.some(t => t.id === tagId);
    console.log('🏷️ [TagSelector] Tag já existe?', jaTem);
    
    if (jaTem) {
      console.log('🏷️ [TagSelector] Removendo tag...');
      removerTag(tagId);
    } else {
      console.log('🏷️ [TagSelector] Adicionando tag...');
      adicionarTag(tagId);
    }
  };
  
  const handleCriarTag = () => {
    console.log('🏷️ [TagSelector] handleCriarTag:', { 
      nomeNovaTag, 
      corNovaTag,
      tipo,
      orcamentoId
    });
    
    if (!nomeNovaTag.trim()) {
      toast({
        title: 'Digite um nome para a tag',
        variant: 'destructive'
      });
      return;
    }
    
    console.log('🏷️ [TagSelector] Criando tag...', { global: tagGlobal });
    criarTag(
      { nome: nomeNovaTag, cor: corNovaTag, global: tagGlobal },
      {
        onSuccess: (novaTag: any) => {
          console.log('✅ [TagSelector] Tag criada, adicionando ao lead/orçamento:', novaTag);
          adicionarTag(novaTag.id);
          setNomeNovaTag('');
          setTagGlobal(false);
          setCriandoNova(false);
        }
      }
    );
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 gap-2">
          <Tag className="h-3 w-3" />
          {tagsAtuais.length > 0 ? `${tagsAtuais.length} tags` : 'Adicionar tag'}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">
              {tipo === 'marcenaria' ? 'Tags do Lead' : 'Tags do Orçamento'}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCriandoNova(!criandoNova)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Criar nova tag */}
          {criandoNova && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
              <Input
                placeholder="Nome da nova tag"
                value={nomeNovaTag}
                onChange={(e) => setNomeNovaTag(e.target.value)}
              />
              
              <div className="flex gap-1 flex-wrap">
                {CORES_PREDEFINIDAS.map((cor) => (
                  <button
                    key={cor.valor}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      corNovaTag === cor.valor
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: cor.valor }}
                    onClick={() => setCorNovaTag(cor.valor)}
                    title={cor.nome}
                  />
                ))}
              </div>
              
              {/* Checkbox para tag global (apenas admins) */}
              {isAdmin && (
                <div className="flex items-center gap-2 px-1">
                  <Checkbox 
                    id="tag-global"
                    checked={tagGlobal} 
                    onCheckedChange={(c) => setTagGlobal(!!c)} 
                  />
                  <label 
                    htmlFor="tag-global"
                    className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    Visível para todos
                  </label>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCriarTag}
                  disabled={isCriando}
                  className="flex-1"
                >
                  {isCriando ? 'Criando...' : 'Criar Tag'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCriandoNova(false);
                    setNomeNovaTag('');
                    setTagGlobal(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          
          {/* Lista de tags disponíveis */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {tags.map((tag) => {
                const selecionado = tagsAtuais.some(t => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors",
                      selecionado && "bg-accent"
                    )}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    <Checkbox checked={selecionado} />
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: tag.cor }}
                    />
                    <span className="text-sm flex-1 text-left">{tag.nome}</span>
                    
                    {/* Badge indicador */}
                    {tag.visivel_para_todos ? (
                      <Badge variant="outline" className="ml-auto text-[10px] h-5 px-1.5 gap-1 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <Globe className="w-3 h-3" />
                        Global
                      </Badge>
                    ) : tag.criado_por_id === profile?.id && (
                      <Badge variant="outline" className="ml-auto text-[10px] h-5 px-1.5 gap-1 bg-muted">
                        <User className="w-3 h-3" />
                        Minha
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
