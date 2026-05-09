import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StatusContratoSelectorProps {
  status: string;
  contratoId: string;
  onStatusChange: (contratoId: string, status: 'aguardando_assinatura' | 'assinado') => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export const StatusContratoSelector: React.FC<StatusContratoSelectorProps> = ({
  status,
  contratoId,
  onStatusChange,
  disabled = false,
  isLoading = false
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const { toast } = useToast();
  
  const statusOptions = [
    { value: 'aguardando_assinatura', label: 'Aguardando Assinatura', color: 'text-yellow-600' },
    { value: 'assinado', label: 'Aprovado para Início', color: 'text-green-600' }
  ];
  
  // Mapeamento para status inconsistentes do banco
  const normalizeStatus = (s: string) => {
    if (s === 'aguardando_emissao' || s === 'aguardando') return 'aguardando_assinatura';
    return s;
  };
  
  // Validar se o status é válido
  const isValidStatus = (s: string) => statusOptions.some(opt => opt.value === s);
  
  // Sincronizar status local com prop quando ela mudar e verificar localStorage
  React.useEffect(() => {
    // Verificar se há um status salvo no localStorage para este contrato
    const storageKey = `contrato_status_${contratoId}`;
    const savedStatusData = localStorage.getItem(storageKey);
    
    if (savedStatusData) {
      try {
        const parsed = JSON.parse(savedStatusData);
        if (parsed.saved && parsed.status && isValidStatus(parsed.status)) {
          console.log('🔄 StatusContratoSelector - Recuperando status do localStorage:', {
            contratoId,
            savedStatus: parsed.status,
            timestamp: parsed.timestamp
          });
          setLocalStatus(parsed.status);
          return; // Use o status do localStorage em vez do prop
        }
      } catch (error) {
        console.error('Erro ao recuperar status do localStorage:', error);
        localStorage.removeItem(storageKey);
      }
    }
    
    // Caso não haja status salvo, usar o status da prop normalizado
    const normalizedStatus = normalizeStatus(status);
    if (normalizedStatus !== localStatus) {
      console.log('📝 StatusContratoSelector - Sincronizando status do servidor:', { 
        contratoId, 
        originalStatus: status,
        normalizedStatus,
        oldLocalStatus: localStatus 
      });
      setLocalStatus(normalizedStatus);
      setPendingStatus(null);
    }
  }, [status, contratoId, localStatus]);
  
  // Status efetivo - sempre garantir um valor válido
  const effectiveStatus = isValidStatus(localStatus) ? localStatus : statusOptions[0].value;
  
  // Status atual considerando mudanças pendentes
  const currentDisplayStatus = pendingStatus || effectiveStatus;
  
  // Verificar se há mudanças não salvas
  const hasUnsavedChanges = pendingStatus !== null && pendingStatus !== effectiveStatus;

  const handleValueChange = (newStatus: string) => {
    if (newStatus === effectiveStatus) {
      setPendingStatus(null); // Limpar se voltou ao status original
      return;
    }
    
    console.log('🔄 StatusContratoSelector - Mudança pendente:', { 
      contratoId, 
      currentStatus: effectiveStatus, 
      pendingStatus: newStatus
    });
    
    setPendingStatus(newStatus);
  };

  const handleSave = async () => {
    if (!pendingStatus || pendingStatus === effectiveStatus || isUpdating) {
      return;
    }

    console.log('💾 StatusContratoSelector - Salvando mudança:', { 
      contratoId, 
      oldStatus: effectiveStatus, 
      newStatus: pendingStatus,
      timestamp: new Date().toISOString()
    });
    
    // Salvar imediatamente no localStorage para persistência entre abas
    const storageKey = `contrato_status_${contratoId}`;
    localStorage.setItem(storageKey, JSON.stringify({
      status: pendingStatus,
      timestamp: new Date().toISOString(),
      saved: true
    }));
    
    // Atualizar estado local imediatamente
    setLocalStatus(pendingStatus);
    setPendingStatus(null);
    setIsUpdating(true);
    
    try {
      await onStatusChange(contratoId, pendingStatus as 'aguardando_assinatura' | 'assinado');
      console.log('✅ StatusContratoSelector - Status salvo com sucesso no servidor');
      toast({
        title: "Status atualizado",
        description: "O status do contrato foi atualizado com sucesso.",
      });
      
      // Marcar como sincronizado no localStorage
      localStorage.setItem(storageKey, JSON.stringify({
        status: pendingStatus,
        timestamp: new Date().toISOString(),
        saved: true,
        synced: true
      }));
      
    } catch (error) {
      console.error('❌ StatusContratoSelector - Erro ao salvar status no servidor:', error);
      
      // Marcar como não sincronizado mas manter salvo localmente
      localStorage.setItem(storageKey, JSON.stringify({
        status: pendingStatus,
        timestamp: new Date().toISOString(),
        saved: true,
        synced: false,
        error: true
      }));
      
      toast({
        title: "Erro ao sincronizar",
        description: "Status salvo localmente. Tentaremos sincronizar automaticamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    console.log('❌ StatusContratoSelector - Cancelando mudanças:', { contratoId, pendingStatus });
    setPendingStatus(null);
    toast({
      title: "Alterações canceladas",
      description: "As mudanças no status foram canceladas.",
    });
  };

  const currentOption = statusOptions.find(opt => opt.value === currentDisplayStatus) || statusOptions[0];
  const isDisabled = disabled || isLoading;

  console.log('🔍 StatusContratoSelector - Estado atual:', { 
    status, 
    localStatus, 
    effectiveStatus,
    pendingStatus,
    currentDisplayStatus,
    hasUnsavedChanges,
    currentOption: currentOption.label,
    isUpdating,
    isLoading
  });

  // Não renderizar se estiver carregando e não temos um status válido
  if (isLoading && !isValidStatus(effectiveStatus)) {
    return (
      <div className="w-full h-10 bg-muted animate-pulse rounded-md flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select 
          value={currentDisplayStatus} 
          onValueChange={handleValueChange} 
          disabled={isDisabled}
        >
          <SelectTrigger className={`w-[200px] ${currentOption.color} ${isUpdating ? 'opacity-75' : ''} ${hasUnsavedChanges ? 'border-orange-500 bg-orange-50' : ''}`}>
            <div className="flex items-center gap-2">
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasUnsavedChanges && !isUpdating && <AlertCircle className="h-4 w-4 text-orange-500" />}
              <SelectValue placeholder="Selecione o status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                className={option.color}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Botões de ação quando há mudanças pendentes */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
              className="h-8 px-2"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isUpdating}
              className="h-8 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Indicadores de status */}
      {hasUnsavedChanges && (
        <div className="text-xs text-orange-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Alteração não salva - clique em salvar para confirmar
        </div>
      )}
      {isUpdating && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Salvando alteração...
        </div>
      )}
    </div>
  );
};