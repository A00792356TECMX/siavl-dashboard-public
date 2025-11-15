import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, Shield, AlertCircle, Filter, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CLGForm } from '@/components/CLGForm';
import { CLGDetailModal } from '@/components/CLGDetailModal';
import { TableControls } from '@/components/TableControls';
import { TableHeaderCell } from '@/components/TableHeader';
import { useTableData } from '@/hooks/useTableData';
import { calcularEstadoCLG, formatearFecha } from '@/utils/clgHelpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Certificado {
  objectId: string;
  folioReal: string;
  numeroEntrada: string;
  estado: string;
  fechaEmision: string | number;
  fechaVencimiento: string | number;
  relacionExpedientes?: string;
  expedienteFolio?: string;
  clienteNombre?: string;
  version?: number;
  qrUrl?: string;
  archivo?: string;
  created: string | number;
  updated: string | number;
}

export default function CLG() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCertificado, setEditingCertificado] = useState<Certificado | null>(null);
  const { toast } = useToast();

  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const {
    pageData,
    totalResults,
    search,
    setSearch,
    pageSize,
    setPageSize,
    sortField,
    sortOrder,
    handleSort,
  } = useTableData({
    data: certificados.filter(cert => {
      if (filtroEstado === 'todos') return true;
      return calcularEstadoCLG(cert.fechaVencimiento).estado === filtroEstado;
    }),
    searchFields: ['folioReal', 'numeroEntrada', 'expedienteFolio', 'clienteNombre'],
  });

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



  const estadisticas = {
    total: certificados.length,
    vigentes: certificados.filter(c => calcularEstadoCLG(c.fechaVencimiento).estado === 'Vigente').length,
    vencidos: certificados.filter(c => calcularEstadoCLG(c.fechaVencimiento).estado === 'Vencido').length,
    porVencer: certificados.filter(c => calcularEstadoCLG(c.fechaVencimiento).estado === 'Por Vencer').length,
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

      {/* Estadísticas - SIEMPRE VISIBLE */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Certificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{estadisticas.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrados en el sistema</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{estadisticas.vigentes}</div>
            <p className="text-xs text-muted-foreground mt-1">Activos y válidos</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{estadisticas.vencidos}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren renovación</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{estadisticas.porVencer}</div>
            <p className="text-xs text-muted-foreground mt-1">Próximos 10 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {estadisticas.porVencer > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{estadisticas.porVencer}</span> certificado(s) próximos a vencer
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Lista de Certificados CLG
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Vigente">Vigentes</SelectItem>
                  <SelectItem value="Por Vencer">Por Vencer</SelectItem>
                  <SelectItem value="Vencido">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TableControls
            search={search}
            onSearchChange={setSearch}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalResults={totalResults}
            currentPageResults={pageData.length}
          />

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {certificados.length === 0 ? 'No hay certificados registrados' : 'No se encontraron resultados'}
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHeaderCell<Certificado>
                      field="folioReal"
                      label="Folio Real"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      field="numeroEntrada"
                      label="Número Entrada"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      field="expedienteFolio"
                      label="Expediente"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      field="clienteNombre"
                      label="Cliente"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      field="fechaEmision"
                      label="Emisión"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      field="fechaVencimiento"
                      label="Vencimiento"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      field="version"
                      label="Versión"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      field="estado"
                      label="Estado"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Certificado>
                      label="Acciones"
                      className="text-right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((certificado) => {
                    const estadoInfo = calcularEstadoCLG(certificado.fechaVencimiento);
                    
                    return (
                      <TableRow key={certificado.objectId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{certificado.folioReal || 'N/A'}</TableCell>
                        <TableCell>{certificado.numeroEntrada || 'N/A'}</TableCell>
                        <TableCell>{certificado.expedienteFolio || 'N/A'}</TableCell>
                        <TableCell>{certificado.clienteNombre || 'N/A'}</TableCell>
                        <TableCell>
                          {formatearFecha(certificado.fechaEmision)}
                        </TableCell>
                        <TableCell>
                          {formatearFecha(certificado.fechaVencimiento)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${estadoInfo.bgColor} ${estadoInfo.color} border-0`}>
                            v{certificado.version || 1}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${estadoInfo.bgColor} ${estadoInfo.color} border-0`}>
                            {estadoInfo.estado}
                          </Badge>
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
