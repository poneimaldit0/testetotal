
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  label: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onFilesChange,
  accept = { 'image/*': [], 'application/pdf': [], 'application/msword': [] },
  maxFiles = 10,
  label
}) => {
  const { toast } = useToast();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validar tamanho máximo (100MB para vídeos, 20MB para outros)
    const maxSize = label.includes('Vídeo') ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o tamanho máximo permitido (${maxSize / (1024 * 1024)}MB)`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    
    const newFiles = [...files, ...validFiles].slice(0, maxFiles);
    onFilesChange(newFiles);
  }, [files, onFilesChange, maxFiles, label, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - files.length,
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive ? 'Solte os arquivos aqui...' : `Clique ou arraste ${label.toLowerCase()} aqui`}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Máximo {maxFiles} arquivos. {
            label.includes('Vídeo') 
              ? 'MP4, WebM, MOV, AVI (até 100MB cada)' 
              : label.includes('Foto') 
                ? 'JPG, PNG, GIF (até 20MB cada)'
                : 'PDF, DOC, imagens (até 20MB cada)'
          }
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{label} ({files.length})</h4>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
              <span className="text-sm truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
