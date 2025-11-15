import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, File } from 'lucide-react';
import { getEstadoColor, formatearTamano } from '@/utils/documentoHelpers';

interface DocumentoDetailModalProps {
  documento: {
    objectId: string;
    nombreArchivo: string;
    nombreOriginal?: string;
    tipo: string;
    extension: string;
    tamanoKB: number;
    estadoDocumento: string;
    version: number;
    url: string;
    expedienteFolio?: string;
    observaciones?: string;
    relacionExpedientes?: {
      folioExpediente: string;
      relacionUsuarios?: {
        nombre: string;
      };
    };
    relacionClientes?: {
      nombre: string;
    };
    created: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentoDetailModal({
  documento,
  isOpen,
  onClose,
}: DocumentoDetailModalProps) {
  if (!documento) return null;

  const isPDF = documento.extension?.toLowerCase() === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
    documento.extension?.toLowerCase() || ''
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <File className="h-6 w-6 text-primary" />
            {documento.nombreOriginal || documento.nombreArchivo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Documento</p>
              <p className="font-medium">{documento.tipo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={getEstadoColor(documento.estadoDocumento)}>
                {documento.estadoDocumento}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Versión</p>
              <Badge variant="outline">v{documento.version}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tamaño</p>
              <p className="font-medium">{formatearTamano(documento.tamanoKB)}</p>
            </div>
            {documento.relacionExpedientes && (
              <div>
                <p className="text-sm text-muted-foreground">Expediente</p>
                <p className="font-medium">
                  {documento.relacionExpedientes.folioExpediente}
                </p>
              </div>
            )}
            {documento.relacionClientes && (
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{documento.relacionClientes.nombre}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Creación</p>
              <p className="font-medium">
                {new Date(documento.created).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Observaciones */}
          {documento.observaciones && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Observaciones</p>
              <p className="text-sm bg-muted p-3 rounded-md">
                {documento.observaciones}
              </p>
            </div>
          )}

          {/* Vista previa del archivo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Vista Previa</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(documento.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en nueva pestaña
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = documento.url;
                    link.download = documento.nombreOriginal || documento.nombreArchivo;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>

            {isPDF && (
              <div className="border border-border rounded-lg overflow-hidden">
                <iframe
                  src={documento.url}
                  className="w-full h-[500px]"
                  title="Vista previa del documento"
                />
              </div>
            )}

            {isImage && (
              <div className="border border-border rounded-lg overflow-hidden">
                <img
                  src={documento.url}
                  alt={documento.nombreOriginal || documento.nombreArchivo}
                  className="w-full h-auto"
                />
              </div>
            )}

            {!isPDF && !isImage && (
              <div className="border border-border rounded-lg p-8 text-center">
                <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Vista previa no disponible para este tipo de archivo
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Descarga el archivo para verlo
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
