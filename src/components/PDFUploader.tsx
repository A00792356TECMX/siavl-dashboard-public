import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { validarArchivoPDF } from '@/utils/clgHelpers';
import { cn } from '@/lib/utils';

interface PDFUploaderProps {
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  previewUrl?: string;
  disabled?: boolean;
  required?: boolean;
}

export function PDFUploader({ 
  onFileSelect, 
  currentFile, 
  previewUrl,
  disabled = false,
  required = false 
}: PDFUploaderProps) {
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validacion = validarArchivoPDF(file);
    
    if (!validacion.valido) {
      setError(validacion.mensaje || 'Archivo inválido');
      onFileSelect(null);
      return;
    }

    setError('');
    onFileSelect(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    setError('');
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {!currentFile && !previewUrl ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-foreground mb-2">
            Arrastra tu archivo PDF aquí o{' '}
            <button
              type="button"
              onClick={handleButtonClick}
              disabled={disabled}
              className="text-primary hover:underline font-medium"
            >
              selecciona un archivo
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            Formato: PDF • Tamaño máximo: 10MB
          </p>
          {required && (
            <p className="text-xs text-destructive mt-2">
              * Campo obligatorio
            </p>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <File className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {currentFile?.name || 'archivo_clg.pdf'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentFile 
                    ? `${(currentFile.size / 1024).toFixed(1)} KB`
                    : 'Archivo actual'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                  disabled={disabled}
                >
                  Ver PDF
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
