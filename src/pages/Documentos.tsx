import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  FileText,
  Filter,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { DocumentoForm } from '@/components/DocumentoForm';
import { DocumentoDetailModal } from '@/components/DocumentoDetailModal';
import { TableControls } from '@/components/TableControls';
import { TableHeaderCell } from '@/components/TableHeader';
import { useTableData } from '@/hooks/useTableData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getEstadoColor, formatearTamano } from '@/utils/documentoHelpers';

interface Documento {
  objectId: string;
  nombreArchivo: string;
  nombreOriginal?: string;
  tipo: string;
  extension: string;
  tamanoKB: number;
  estadoDocumento: string;
  version: number;
  url: string;
  expedienteFolio: string;
  observaciones?: string;
  relacionExpedientes?: {
    objectId: string;
    folioExpediente: string;
    relacionUsuarios?: {
      nombre: string;
    };
  };
  relacionClientes?: {
    objectId: string;
    nombre: string;
  };
  created: string;
  updated: string;
}

const TIPOS_DOCUMENTO = [
  'Contrato',
  'Escritura',
  'Acuse',
  'CLG',
  'Identificación',
  'Comprobante',
  'Otro',
];

export default function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null);
  const [deletingDocumento, setDeletingDocumento] = useState<Documento | null>(null);
  const [viewingDocumento, setViewingDocumento] = useState<Documento | null>(null);

  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterCliente, setFilterCliente] = useState<string>('all');
  const [filterExpediente, setFilterExpediente] = useState<string>('all');
  const [filterEstado, setFilterEstado] = useState<string>('Activo');

  const { toast } = useToast();

  const clientesUnicos = Array.from(
    new Set(
      documentos
        .map(d => d.relacionExpedientes?.relacionUsuarios?.nombre)
        .filter(Boolean)
    )
  ).sort();

  const expedientesUnicos = Array.from(
    new Set(
      documentos
        .map(d => d.relacionExpedientes?.folioExpediente)
        .filter(Boolean)
    )
  ).sort();

  const documentosFiltrados = documentos.filter(doc => {
    if (filterTipo && filterTipo !== 'all' && doc.tipo !== filterTipo) return false;
    if (filterCliente && filterCliente !== 'all' && doc.relacionExpedientes?.relacionUsuarios?.nombre !== filterCliente) return false;
    if (filterExpediente && filterExpediente !== 'all' && doc.relacionExpedientes?.folioExpediente !== filterExpediente) return false;
    if (filterEstado && filterEstado !== 'all' && doc.estadoDocumento !== filterEstado) return false;
    return true;
  });

  const {
    pageData,
    totalResults,
    page,
    pageSize,
    sortField,
    sortOrder,
    search: searchTerm,
    setSearch: setSearchTerm,
    setPageSize,
    setPage,
    handleSort,
  } = useTableData<Documento>({
    data: documentosFiltrados,
    initialPageSize: 10,
    searchFields: ['nombreArchivo', 'nombreOriginal', 'tipo', 'expedienteFolio'],
  });

  useEffect(() => {
    loadDocumentos();
  }, []);

  const loadDocumentos = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Documento>('Documentos', {
        loadRelations: 'relacionExpedientes.relacionUsuarios,relacionClientes',
      });
      setDocumentos(data);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los documentos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (documento: Documento) => {
    setEditingDocumento(documento);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingDocumento) return;

    try {
      await api.update('Documentos', deletingDocumento.objectId, {
        estadoDocumento: 'Inactivo',
      });

      toast({
        title: 'Éxito',
        description: 'Documento eliminado correctamente',
      });

      setDeletingDocumento(null);
      loadDocumentos();
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive',
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingDocumento(null);
  };

  const handleSuccess = () => {
    handleDialogClose();
    loadDocumentos();
  };

  const clearFilters = () => {
    setFilterTipo('all');
    setFilterCliente('all');
    setFilterExpediente('all');
    setFilterEstado('Activo');
  };

  const hasActiveFilters =
    filterTipo !== 'all' ||
    filterCliente !== 'all' ||
    filterExpediente !== 'all' ||
    filterEstado !== 'Activo';

  // Calcular estadísticas
  const stats = {
    total: documentos.length,
    activos: documentos.filter(d => d.estadoDocumento === 'Activo').length,
    inactivos: documentos.filter(d => d.estadoDocumento === 'Inactivo').length,
    filtrados: documentosFiltrados.length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">
            Gestiona todos los documentos del sistema
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Documento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En el sistema
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Documentos disponibles
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">{stats.inactivos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Documentos inactivos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtrados</CardTitle>
            <Filter className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.filtrados}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Resultados actuales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros Avanzados
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={filterCliente} onValueChange={setFilterCliente}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clientesUnicos.map((cliente) => (
                    <SelectItem key={cliente} value={cliente}>
                      {cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Expediente</label>
              <Select value={filterExpediente} onValueChange={setFilterExpediente}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los expedientes</SelectItem>
                  {expedientesUnicos.map((exp) => (
                    <SelectItem key={exp} value={exp}>
                      {exp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listado de Documentos</CardTitle>
            <TableControls
              search={searchTerm}
              onSearchChange={setSearchTerm}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalResults={totalResults}
              currentPageResults={pageData.length}
            />
          </div>
        </CardHeader>
        <CardContent>
          {documentosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'No se encontraron documentos con los filtros aplicados'
                  : 'Comienza creando tu primer documento'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Documento
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell<Documento>
                        field="nombreArchivo"
                        label="Nombre Archivo"
                        sortable
                        currentSortField={sortField}
                        currentSortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <TableHeaderCell<Documento>
                        field="tipo"
                        label="Tipo"
                        sortable
                        currentSortField={sortField}
                        currentSortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <TableHead>Expediente</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Versión</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((doc) => (
                      <TableRow key={doc.objectId}>
                        <TableCell className="font-medium">
                          {doc.nombreOriginal || doc.nombreArchivo}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          {doc.relacionExpedientes?.folioExpediente || (
                            <span className="text-muted-foreground">Sin expediente</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.relacionExpedientes?.relacionUsuarios?.nombre || (
                            <span className="text-muted-foreground">Sin cliente</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatearTamano(doc.tamanoKB)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">v{doc.version}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEstadoColor(doc.estadoDocumento)}>
                            {doc.estadoDocumento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(doc.created).toLocaleDateString('es-MX')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewingDocumento(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(doc)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingDocumento(doc)}
                              disabled={doc.estadoDocumento === 'Inactivo'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalResults > pageSize && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {Math.ceil(totalResults / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(totalResults / pageSize)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDocumento ? 'Editar Documento' : 'Nuevo Documento'}
            </DialogTitle>
          </DialogHeader>
          <DocumentoForm
            documento={editingDocumento}
            onSuccess={handleSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      <DocumentoDetailModal
        documento={viewingDocumento}
        isOpen={!!viewingDocumento}
        onClose={() => setViewingDocumento(null)}
      />

      <AlertDialog open={!!deletingDocumento} onOpenChange={() => setDeletingDocumento(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cambiará el estado del documento a "Inactivo". El archivo
              permanecerá en el sistema pero no estará disponible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
