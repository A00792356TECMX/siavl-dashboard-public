import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ExpedienteForm } from '@/components/ExpedienteForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Expediente {
  objectId: string;
  folioExpediente: string;
  cliente: string;
  lote: string;
  observaciones?: string;
  activo: boolean;
  created: string;  // Fecha apertura
  updated: string;
}

export default function Expedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpediente, setEditingExpediente] = useState<Expediente | null>(null);
  const [pagosData, setPagosData] = useState<Map<string, number>>(new Map());
  const [lotesData, setLotesData] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    loadExpedientes();
  }, []);

  const loadExpedientes = async () => {
    try {
      setIsLoading(true);
      const [expedientesData, pagosData, lotesData] = await Promise.all([
        api.getAll<Expediente>('Expedientes', { sortBy: 'created desc' }),
        api.getAll<any>('Pagos'),
        api.getAll<any>('Lotes')
      ]);

      // Calculate total paid amount per expediente (grouped by folioExpediente)
      const pagosPorExpediente = new Map<string, number>();
      pagosData.forEach((pago: any) => {
        const current = pagosPorExpediente.get(pago.folioExpediente) || 0;
        pagosPorExpediente.set(pago.folioExpediente, current + (pago.monto || 0));
      });

      // Map lotes prices by numeroLote
      const preciosPorLote = new Map<string, number>();
      lotesData.forEach((lote: any) => {
        preciosPorLote.set(lote.numeroLote, lote.precio || 0);
      });

      setExpedientes(expedientesData);
      setPagosData(pagosPorExpediente);
      setLotesData(preciosPorLote);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar los expedientes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMontoPagado = (folioExpediente: string): number => {
    return pagosData.get(folioExpediente) || 0;
  };

  const getMontoPorPagar = (folioExpediente: string, lote: string): number => {
    const precioLote = lotesData.get(lote) || 0;
    const montoPagado = getMontoPagado(folioExpediente);
    return precioLote - montoPagado;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este expediente?')) return;

    try {
      await api.delete('Expedientes', id);
      // Success toast already shown in apiRequest
      loadExpedientes();
    } catch (error) {
      // Error toast already shown in apiRequest
    }
  };

  const handleEdit = (expediente: Expediente) => {
    setEditingExpediente(expediente);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingExpediente(null);
    setIsDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingExpediente(null);
    loadExpedientes();
  };

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      abierto: 'bg-green-500/10 text-green-500',
      'en-proceso': 'bg-yellow-500/10 text-yellow-500',
      cerrado: 'bg-gray-500/10 text-gray-500',
      cancelado: 'bg-red-500/10 text-red-500',
    };
    return colors[estado] || colors.abierto;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Expedientes</h2>
          <p className="text-muted-foreground mt-1">Gestiona los expedientes de clientes y lotes</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Expediente
        </Button>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lista de Expedientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : expedientes.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No hay expedientes registrados
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto Pagado</TableHead>
                    <TableHead className="text-right">Monto por Pagar</TableHead>
                    <TableHead>Fecha Apertura</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expedientes.map((expediente) => {
                    const montoPagado = getMontoPagado(expediente.folioExpediente);
                    const montoPorPagar = getMontoPorPagar(expediente.folioExpediente, expediente.lote);

                    return (
                      <TableRow key={expediente.objectId} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{expediente.folioExpediente}</TableCell>
                        <TableCell>{expediente.cliente || 'N/A'}</TableCell>
                        <TableCell>{expediente.lote || 'Sin asignar'}</TableCell>
                        <TableCell>{expediente.activo ? '✅ Activo' : '❌ Inactivo'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ${montoPagado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          ${montoPorPagar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {expediente.created
                            ? new Date(expediente.created).toLocaleDateString('es-MX')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(expediente)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(expediente.objectId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
              {editingExpediente ? 'Editar Expediente' : 'Nuevo Expediente'}
            </DialogTitle>
            <DialogDescription>
              {editingExpediente 
                ? 'Modifica la información del expediente' 
                : 'Completa el formulario para crear un nuevo expediente'}
            </DialogDescription>
          </DialogHeader>
          <ExpedienteForm
            expediente={editingExpediente}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
