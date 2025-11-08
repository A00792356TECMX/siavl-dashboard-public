import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, Shield, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CLGForm } from '@/components/CLGForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Certificado {
  objectId: string;
  folioCLG: string;
  estado: string;
  fechaEmision: string;
  fechaVencimiento: string;
  expedienteId?: string;
  expedienteNumero?: string;
  loteId?: string;
  loteNumero?: string;
  observaciones?: string;
  created: string;
  updated: string;
}

export default function CLG() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCertificado, setEditingCertificado] = useState<Certificado | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCertificados();
  }, []);

  const loadCertificados = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Certificado>('CLG', {
        sortBy: 'created desc',
      });
      setCertificados(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar los certificados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este certificado?')) return;

    try {
      await api.delete('CLG', id);
      toast({
        title: 'Éxito',
        description: 'Certificado eliminado correctamente',
      });
      loadCertificados();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el certificado',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (certificado: Certificado) => {
    setEditingCertificado(certificado);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingCertificado(null);
    setIsDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingCertificado(null);
    loadCertificados();
  };

  const getEstadoBadge = (estado: string, fechaVencimiento: string) => {
    const isExpired = new Date(fechaVencimiento) < new Date();
    
    if (isExpired && estado === 'activo') {
      return 'bg-red-500/10 text-red-500';
    }
    
    const colors: Record<string, string> = {
      activo: 'bg-green-500/10 text-green-500',
      'por-vencer': 'bg-yellow-500/10 text-yellow-500',
      vencido: 'bg-red-500/10 text-red-500',
      cancelado: 'bg-gray-500/10 text-gray-500',
    };
    return colors[estado] || colors.activo;
  };

  const getEstadoDisplay = (estado: string, fechaVencimiento: string) => {
    const isExpired = new Date(fechaVencimiento) < new Date();
    if (isExpired && estado === 'activo') {
      return 'vencido';
    }
    return estado;
  };

  const checkProximosVencer = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return certificados.filter(cert => {
      const vencimiento = new Date(cert.fechaVencimiento);
      return cert.estado === 'activo' && vencimiento > today && vencimiento <= thirtyDaysFromNow;
    }).length;
  };

  const estadisticas = {
    total: certificados.length,
    activos: certificados.filter(c => {
      const isExpired = new Date(c.fechaVencimiento) < new Date();
      return c.estado === 'activo' && !isExpired;
    }).length,
    vencidos: certificados.filter(c => {
      const isExpired = new Date(c.fechaVencimiento) < new Date();
      return c.estado === 'vencido' || (c.estado === 'activo' && isExpired);
    }).length,
    proximosVencer: checkProximosVencer(),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Certificados CLG</h2>
          <p className="text-muted-foreground mt-1">Administra certificados de Libertad de Gravamen</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Certificado
        </Button>
      </div>

      {/* Alertas */}
      {estadisticas.proximosVencer > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{estadisticas.proximosVencer}</span> certificado(s) próximos a vencer en los próximos 30 días
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Certificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{estadisticas.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{estadisticas.activos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{estadisticas.vencidos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{estadisticas.proximosVencer}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Lista de Certificados CLG
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : certificados.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No hay certificados registrados
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Folio CLG</TableHead>
                    <TableHead>Expediente</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Emisión</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificados.map((certificado) => (
                    <TableRow key={certificado.objectId} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{certificado.folioCLG}</TableCell>
                      <TableCell>{certificado.expedienteNumero || 'N/A'}</TableCell>
                      <TableCell>{certificado.loteNumero || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(certificado.fechaEmision).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        {new Date(certificado.fechaVencimiento).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEstadoBadge(certificado.estado, certificado.fechaVencimiento)}`}>
                          {getEstadoDisplay(certificado.estado, certificado.fechaVencimiento)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(certificado)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(certificado.objectId)}
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
              {editingCertificado ? 'Editar Certificado CLG' : 'Nuevo Certificado CLG'}
            </DialogTitle>
            <DialogDescription>
              {editingCertificado 
                ? 'Modifica la información del certificado' 
                : 'Completa el formulario para crear un nuevo certificado de Libertad de Gravamen'}
            </DialogDescription>
          </DialogHeader>
          <CLGForm
            certificado={editingCertificado}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
