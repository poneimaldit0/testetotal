import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UploadLogoProps {
  currentLogoUrl?: string;
  onLogoUpload: (url: string) => void;
  onLogoSaved?: () => void;
  fornecedorId: string;
}

export const UploadLogo: React.FC<UploadLogoProps> = ({ 
  currentLogoUrl, 
  onLogoUpload,
  onLogoSaved,
  fornecedorId 
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem PNG, JPG ou SVG.",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 2MB.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fornecedorId) return;

    if (!validateFile(file)) return;

    setUploading(true);
    try {
      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${fornecedorId}/logo-${Date.now()}.${fileExt}`;

      // Remover logo anterior se existir
      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('fornecedor-perfis')
            .remove([`${fornecedorId}/${oldPath}`]);
        }
      }

      // Upload do novo arquivo
      const { error: uploadError } = await supabase.storage
        .from('fornecedor-perfis')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data } = supabase.storage
        .from('fornecedor-perfis')
        .getPublicUrl(fileName);

      const logoUrl = data.publicUrl;
      setPreviewUrl(logoUrl);
      onLogoUpload(logoUrl);

      // Salvar automaticamente no banco de dados
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: logoUrl })
        .eq('id', fornecedorId);

      if (updateError) throw updateError;

      // Notificar que foi salvo
      if (onLogoSaved) {
        onLogoSaved();
      }

      toast({
        title: "Logo salvo com sucesso!",
        description: "Seu logo foi atualizado automaticamente.",
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload do logo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Limpar input
      event.target.value = '';
    }
  };

  const removeLogo = async () => {
    if (!currentLogoUrl || !fornecedorId) return;

    setUploading(true);
    try {
      // Extrair nome do arquivo da URL
      const fileName = currentLogoUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('fornecedor-perfis')
          .remove([`${fornecedorId}/${fileName}`]);
      }

      setPreviewUrl(null);
      onLogoUpload('');

      // Remover do banco de dados
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_url: null })
        .eq('id', fornecedorId);

      if (updateError) throw updateError;

      // Notificar que foi removido
      if (onLogoSaved) {
        onLogoSaved();
      }

      toast({
        title: "Logo removido",
        description: "O logo foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o logo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-start space-y-4">
      <div className="flex items-center space-x-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={previewUrl || undefined} alt="Logo da empresa" />
          <AvatarFallback className="text-lg">
            {fornecedorId?.charAt(0)?.toUpperCase() || 'L'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <Button asChild variant="outline" disabled={uploading}>
              <label className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? 'Enviando...' : 'Carregar Logo'}
                <input 
                  type="file" 
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </Button>
            
            {previewUrl && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={removeLogo}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            PNG, JPG ou SVG até 2MB
          </p>
        </div>
      </div>
    </div>
  );
};