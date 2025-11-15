import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Calendar, Hash, QrCode, Package, User, Pencil, Trash2 } from 'lucide-react';
import { calcularEstadoCLG, formatearFecha } from '@/utils/clgHelpers';

interface CLGDetailModalProps {
  clg: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CLGDetailModal({ clg, isOpen, onClose, onEdit, onDelete }: CLGDetailModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    if (clg?.archivo) {
      // Construir URL del archivo en Backendless
      const baseUrl = 'https://knowingplant-us.backendless.app/api/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';
      setPdfUrl(`${baseUrl}/files${clg.archivo}`);
    }
  }, [clg]);

  if (!clg) return null;

  const estadoInfo = calcularEstadoCLG(clg.fechaVencimiento);

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Detalle del CLG</DialogTitle>
              <DialogDescription>
                Información completa del certificado de libertad de gravamen
              </DialogDescription>
            </div>
            <Badge className={`${estadoInfo.bgColor} ${estadoInfo.color} border-0`}>
              {estadoInfo.estado}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Información Principal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Folio Real
                </label>
                <p className="text-base font-semibold text-foreground mt-1">
                  {clg.folioReal || 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Número de Entrada
                </label>
                <p className="text-base font-semibold text-foreground mt-1">
                  {clg.numeroEntrada || 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Versión
                </label>
                <p className="text-base font-semibold text-foreground mt-1">
                  v{clg.version || 1}
                </p>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Emisión
                </label>
                <p className="text-base text-foreground mt-1">
                  {formatearFecha(clg.fechaEmision)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Vencimiento
                </label>
                <p className="text-base text-foreground mt-1">
                  {formatearFecha(clg.fechaVencimiento)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Expediente
                </label>
                <p className="text-base text-foreground mt-1">
                  {clg.expedienteFolio || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* QR URL */}
          {clg.qrUrl && (
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                URL del QR
              </label>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-foreground bg-muted p-2 rounded flex-1 truncate">
                  {clg.qrUrl}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(clg.qrUrl)}
                >
                  Copiar
                </Button>
              </div>
            </div>
          )}

          {/* Vista previa del PDF */}
          {pdfUrl && (
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Documento PDF
              </label>
              <div className="border border-border rounded-lg overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-[500px]"
                  title="Vista previa del CLG"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Acciones */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button onClick={onEdit} variant="outline">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {onDelete && (
                <Button onClick={onDelete} variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>
            <Button onClick={handleDownload} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
