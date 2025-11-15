import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  FileText,
  Download,
  Eye,
  File,
  FileImage,
  Filter,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { DocumentoForm } from '@/components/DocumentoForm';
import { TableControls } from '@/components/TableControls';
import { TableHeaderCell } from '@/components/TableHeader';
import { useTableData } from '@/hooks/useTableData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface Documento {
  objectId: string;
  nombreArchivo: string;
  nombreOriginal: string;
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
  relacionUsers?: {
    email: string;
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

const ESTADOS_DOCUMENTO = ['Activo', 'Reemplazado', 'Eliminado'];

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
        .map(d => d.relacionClientes?.nombre)
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
    if (filterCliente && filterCliente !== 'all' && doc.relacionClientes?.nombre !== filterCliente) return false;
    if (filterExpediente && filterExpediente !== 'all' && doc.relacionExpedientes?.folioExpediente !== filterExpediente) return false;
    if (filterEstado && filterEstado !== 'all' && doc.estadoDocumento !== filterEstado) return false;
    return true;
  });

  const {
    pageData,
    totalResults,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    search,
    setSearch,
    sortField,
    sortOrder,
    handleSort,
  } = useTableData({
    data: documentosFiltrados,
    searchFields: ['nombreArchivo', 'nombreOriginal', 'tipo', 'expedienteFolio'],
  });

  useEffect(() => {
    loadDocumentos();
  }, []);

  const loadDocumentos = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Documento>('Documentos', {
        sortBy: 'created desc',
        loadRelations: 'relacionExpedientes,relacionExpedientes.relacionUsuarios,relacionClientes,relacionUsers',
      });
      setDocumentos(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar los documentos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDocumento) return;

    try {
      await api.update('Documentos', deletingDocumento.objectId, {
        estadoDocumento: 'Eliminado',
      });

      toast({
        title: 'Documento eliminado',
        description: 'El documento ha sido marcado como eliminado',
      });

      setDeletingDocumento(null);
      loadDocumentos();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el documento',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (documento: Documento) => {
    setEditingDocumento(documento);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingDocumento(null);
    setIsDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingDocumento(null);
    loadDocumentos();
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      Contrato: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      Escritura: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      Acuse: 'bg-green-500/10 text-green-500 border-green-500/20',
      CLG: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      Identificación: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      Comprobante: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      Otro: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return colors[tipo] || colors.Otro;
  };

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      Activo: 'bg-green-500/10 text-green-500 border-green-500/20',
      Reemplazado: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      Eliminado: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[estado] || colors.Activo;
  };

  const getFileIcon = (extension: string) => {
    if (extension === 'pdf') return <FileText className="h-4 w-4" />;
    if (['jpg', 'jpeg', 'png'].includes(extension)) return <FileImage className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleView = (documento: Documento) => {
    setViewingDocumento(documento);
  };

  const handleDownload = (documento: Documento) => {
    if (documento.url) {
      window.open(documento.url, '_blank');
    }
  };

  const clearFilters = () => {
    setFilterTipo('all');
    setFilterCliente('all');
    setFilterExpediente('all');
    setFilterEstado('Activo');
  };

  const hasActiveFilters = filterTipo !== 'all' || filterCliente !== 'all' || filterExpediente !== 'all' || filterEstado !== 'Activo';

  const estadisticas = {
    total: documentosFiltrados.length,
    contratos: documentosFiltrados.filter(d => d.tipo === 'Contrato').length,
    escrituras: documentosFiltrados.filter(d => d.tipo === 'Escritura').length,
    clg: documentosFiltrados.filter(d => d.tipo === 'CLG').length,
    otros: documentosFiltrados.filter(d => !['Contrato', 'Escritura', 'CLG'].includes(d.tipo)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Gestión documental del proyecto inmobiliario
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Subir documento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{estadisticas.contratos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Escrituras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{estadisticas.escrituras}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CLG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{estadisticas.clg}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Otros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{estadisticas.otros}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-base">Filtros Avanzados</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {TIPOS_DOCUMENTO.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Select value={filterCliente} onValueChange={setFilterCliente}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {clientesUnicos.map(cliente => (
                    <SelectItem key={cliente} value={cliente}>
                      {cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Expediente</label>
              <Select value={filterExpediente} onValueChange={setFilterExpediente}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los expedientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los expedientes</SelectItem>
                  {expedientesUnicos.map(exp => (
                    <SelectItem key={exp} value={exp}>
                      {exp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS_DOCUMENTO.map(estado => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos registrados</CardTitle>
          <CardDescription>
            {totalResults} documento{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TableControls
            search={search}
            onSearchChange={setSearch}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalResults={totalResults}
            currentPageResults={pageData.length}
          />

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pageData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || hasActiveFilters
                ? 'No se encontraron documentos con los criterios de búsqueda'
                : 'No hay documentos registrados'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHeaderCell
                      field="nombreOriginal"
                      label="Nombre"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell
                      field="tipo"
                      label="Tipo"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHead>Cliente</TableHead>
                    <TableHead>Expediente</TableHead>
                    <TableHeaderCell
                      field="tamanoKB"
                      label="Tamaño"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell
                      field="created"
                      label="Fecha"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHead>Estado</TableHead>
                    <TableHead>Versión</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((doc) => (
                    <TableRow key={doc.objectId}>
                      <TableCell>
                        {getFileIcon(doc.extension)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {doc.nombreOriginal}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTipoBadge(doc.tipo)}>
                          {doc.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.relacionClientes?.nombre || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {doc.relacionExpedientes?.folioExpediente || doc.expedienteFolio || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatFileSize(doc.tamanoKB)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(doc.created).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getEstadoBadge(doc.estadoDocumento)}>
                          {doc.estadoDocumento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        v{doc.version}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(doc)}
                            title="Ver documento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {doc.estadoDocumento === 'Activo' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(doc)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingDocumento(doc)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDocumento ? 'Editar documento' : 'Subir nuevo documento'}
            </DialogTitle>
            <DialogDescription>
              {editingDocumento
                ? 'Modifique los datos del documento o reemplace el archivo para crear una nueva versión'
                : 'Complete los datos y seleccione el archivo a subir'}
            </DialogDescription>
          </DialogHeader>
          <DocumentoForm
            documento={editingDocumento}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDocumento} onOpenChange={() => setDeletingDocumento(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              El documento será marcado como "Eliminado" pero se mantendrá en el sistema para
              auditoría. Esta acción no puede deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewingDocumento} onOpenChange={() => setViewingDocumento(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocumento?.nombreOriginal}</DialogTitle>
            <DialogDescription>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <span className="font-medium">Tipo:</span> {viewingDocumento?.tipo}
                </div>
                <div>
                  <span className="font-medium">Cliente:</span>{' '}
                  {viewingDocumento?.relacionClientes?.nombre || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Expediente:</span>{' '}
                  {viewingDocumento?.relacionExpedientes?.folioExpediente || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Tamaño:</span>{' '}
                  {viewingDocumento ? formatFileSize(viewingDocumento.tamanoKB) : ''}
                </div>
                <div>
                  <span className="font-medium">Versión:</span> v{viewingDocumento?.version}
                </div>
                <div>
                  <span className="font-medium">Estado:</span> {viewingDocumento?.estadoDocumento}
                </div>
                <div>
                  <span className="font-medium">Fecha de creación:</span>{' '}
                  {viewingDocumento ? new Date(viewingDocumento.created).toLocaleString('es-MX') : ''}
                </div>
                <div>
                  <span className="font-medium">Última modificación:</span>{' '}
                  {viewingDocumento ? new Date(viewingDocumento.updated).toLocaleString('es-MX') : ''}
                </div>
                {viewingDocumento?.relacionUsers?.email && (
                  <div className="col-span-2">
                    <span className="font-medium">Cargado por:</span>{' '}
                    {viewingDocumento.relacionUsers.email}
                  </div>
                )}
                {viewingDocumento?.observaciones && (
                  <div className="col-span-2">
                    <span className="font-medium">Observaciones:</span>{' '}
                    {viewingDocumento.observaciones}
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {viewingDocumento?.extension === 'pdf' ? (
              <iframe
                src={viewingDocumento.url}
                className="w-full h-[60vh] border rounded"
                title="Vista previa PDF"
              />
            ) : ['jpg', 'jpeg', 'png'].includes(viewingDocumento?.extension || '') ? (
              <img
                src={viewingDocumento?.url}
                alt={viewingDocumento?.nombreOriginal}
                className="w-full h-auto max-h-[60vh] object-contain border rounded"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-2" />
                <p>Vista previa no disponible para este tipo de archivo</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => viewingDocumento && handleDownload(viewingDocumento)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar archivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
