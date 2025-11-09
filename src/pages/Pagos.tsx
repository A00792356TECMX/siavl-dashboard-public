import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PagoForm } from "@/components/PagoForm";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

interface Pago {
  objectId: string;
  folioExpediente: string;
  monto: number;
  metodoPago: string; // Changed from string[] to string
  moneda: string; // Changed from string[] to string
  referencia?: string;
  observaciones?: string;
  created?: number;
}

export default function Pagos() {
  const { toast } = useToast();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPago, setSelectedPago] = useState<Pago | undefined>();

  useEffect(() => {
    loadPagos();
  }, []);

  const loadPagos = async () => {
    try {
      setLoading(true);
      const data = await api.getAll<Pago>("Pagos");
      setPagos(data);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los pagos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este pago?")) return;
    try {
      await api.delete("Pagos", id);
      toast({ title: "Eliminado", description: "Pago eliminado correctamente" });
      loadPagos();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago",
        variant: "destructive",
      });
    }
  };

  const openDialog = (pago?: Pago) => {
    setSelectedPago(pago);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedPago(undefined);
  };

  const handleSuccess = () => {
    closeDialog();
    loadPagos();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pagos</h1>
          <p className="text-muted-foreground">Gestión de pagos del sistema</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pago
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay pagos registrados
                </TableCell>
              </TableRow>
            ) : (
              pagos.map((pago) => (
                <TableRow key={pago.objectId}>
                  <TableCell className="font-medium">{pago.folioExpediente}</TableCell>
                  <TableCell>${pago.monto.toFixed(2)}</TableCell>
                  <TableCell>{pago.metodoPago || "N/A"}</TableCell>
                  <TableCell>{pago.moneda || "N/A"}</TableCell>
                  <TableCell>{pago.referencia || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDialog(pago)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pago.objectId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPago ? "Editar Pago" : "Nuevo Pago"}
            </DialogTitle>
          </DialogHeader>
          <PagoForm
            pago={selectedPago}
            onSuccess={handleSuccess}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
