import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, FileText, Download, Eye } from 'lucide-react';
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

interface Documento {
  objectId: string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  expedienteId?: string;
  expedienteNumero?: string;
  archivoUrl?: string;
  tamanio?: number;
  fechaSubida: string;
  created: string;
  updated: string;
}

export default function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null);
  const { toast } = useToast();

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
    data: documentos,
    searchFields: ['nombre', 'tipo', 'expedienteNumero'],
  });

  useEffect(() => {
    loadDocumentos();
  }, []);

  const loadDocumentos = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Documento>('Documentos', {
        sortBy: 'created desc',
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      await api.delete('Documentos', id);
      toast({
        title: 'Éxito',
        description: 'Documento eliminado correctamente',
      });
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
      contrato: 'bg-blue-500/10 text-blue-500',
      escritura: 'bg-purple-500/10 text-purple-500',
      identificacion: 'bg-green-500/10 text-green-500',
      comprobante: 'bg-yellow-500/10 text-yellow-500',
      otro: 'bg-gray-500/10 text-gray-500',
    };
    return colors[tipo] || colors.otro;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const handleDownload = (documento: Documento) => {
    if (documento.archivoUrl) {
      window.open(documento.archivoUrl, '_blank');
    } else {
      toast({
        title: 'Error',
        description: 'URL del archivo no disponible',
        variant: 'destructive',
      });
    }
  };

  const estadisticas = {
    total: documentos.length,
    contratos: documentos.filter(d => d.tipo === 'contrato').length,
    escrituras: documentos.filter(d => d.tipo === 'escritura').length,
    otros: documentos.filter(d => !['contrato', 'escritura'].includes(d.tipo)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Documentos</h2>
          <p className="text-muted-foreground mt-1">Gestiona la documentación del sistema</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Subir Documento
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{estadisticas.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{estadisticas.contratos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escrituras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{estadisticas.escrituras}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Otros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{estadisticas.otros}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lista de Documentos
          </CardTitle>
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
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {documentos.length === 0 ? 'No hay documentos registrados' : 'No se encontraron resultados'}
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHeaderCell<Documento>
                      field="nombre"
                      label="Nombre"
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
                    <TableHeaderCell<Documento>
                      field="expedienteNumero"
                      label="Expediente"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Documento>
                      field="tamanio"
                      label="Tamaño"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Documento>
                      field="fechaSubida"
                      label="Fecha"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Documento>
                      label="Acciones"
                      className="text-right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((documento) => (
                    <TableRow key={documento.objectId} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {documento.nombre}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getTipoBadge(documento.tipo)}`}>
                          {documento.tipo}
                        </span>
                      </TableCell>
                      <TableCell>{documento.expedienteNumero || 'Sin asignar'}</TableCell>
                      <TableCell>{formatFileSize(documento.tamanio)}</TableCell>
                      <TableCell>
                        {new Date(documento.fechaSubida || documento.created).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {documento.archivoUrl && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(documento)}
                                title="Ver/Descargar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(documento)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(documento.objectId)}
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
              {editingDocumento ? 'Editar Documento' : 'Subir Documento'}
            </DialogTitle>
            <DialogDescription>
              {editingDocumento 
                ? 'Modifica la información del documento' 
                : 'Completa el formulario y selecciona el archivo a subir'}
            </DialogDescription>
          </DialogHeader>
          <DocumentoForm
            documento={editingDocumento}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
