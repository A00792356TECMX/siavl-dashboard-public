import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { PagoForm } from '@/components/PagoForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Pago {
  objectId: string;
  folioPago: string;
  monto: number;
  fechaPago: string;
  metodoPago: string;
  estado: string;
  clienteId: string;
  clienteNombre?: string;
  expedienteId?: string;
  expedienteNumero?: string;
  referencia?: string;
  observaciones?: string;
  created: string;
  updated: string;
}

export default function Pagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPagos();
  }, []);

  const loadPagos = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Pago>('Pagos', {
        sortBy: 'created desc',
      });
      setPagos(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar los pagos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este pago?')) return;

    try {
      await api.delete('Pagos', id);
      toast({
        title: 'Éxito',
        description: 'Pago eliminado correctamente',
      });
      loadPagos();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el pago',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (pago: Pago) => {
    setEditingPago(pago);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPago(null);
    setIsDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingPago(null);
    loadPagos();
  };

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      completado: 'bg-green-500/10 text-green-500',
      pendiente: 'bg-yellow-500/10 text-yellow-500',
      rechazado: 'bg-red-500/10 text-red-500',
      cancelado: 'bg-gray-500/10 text-gray-500',
    };
    return colors[estado] || colors.pendiente;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Pagos</h2>
          <p className="text-muted-foreground mt-1">Administra los pagos y transacciones</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pago
        </Button>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Lista de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pagos.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No hay pagos registrados
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Expediente</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago) => (
                    <TableRow key={pago.objectId} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{pago.folioPago}</TableCell>
                      <TableCell>{pago.clienteNombre || 'N/A'}</TableCell>
                      <TableCell>{pago.expedienteNumero || 'N/A'}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(pago.monto)}</TableCell>
                      <TableCell className="capitalize">{pago.metodoPago}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEstadoBadge(pago.estado)}`}>
                          {pago.estado}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(pago.fechaPago).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(pago)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(pago.objectId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPago ? 'Editar Pago' : 'Nuevo Pago'}
            </DialogTitle>
            <DialogDescription>
              {editingPago 
                ? 'Modifica la información del pago' 
                : 'Completa el formulario para registrar un nuevo pago'}
            </DialogDescription>
          </DialogHeader>
          <PagoForm
            pago={editingPago}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
