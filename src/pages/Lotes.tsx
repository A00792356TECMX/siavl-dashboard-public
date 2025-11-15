import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LoteForm } from '@/components/LoteForm';
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

interface Lote {
  objectId: string;
  numeroLote: string;
  manzana: string;
  superficie: number;
  precio: number;
  activo: 'Disponibles' | 'Reservados' | 'Vendidos' | string;
  ubicacion?: string;
  observaciones?: string;
  created: string;
  updated: string;
}

export default function Lotes() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
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
    data: lotes,
    searchFields: ['numeroLote', 'manzana', 'ubicacion'],
  });

  useEffect(() => {
    loadLotes();
  }, []);

  // 🧠 Load all Lotes from Backendless
  const loadLotes = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Lote>('Lotes', { sortBy: 'created desc' });
      setLotes(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar los lotes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🗑️ Delete Lote
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este lote?')) return;

    try {
      await api.delete('Lotes', id);
      toast({
        title: 'Éxito',
        description: 'Lote eliminado correctamente',
      });
      loadLotes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar el lote',
        variant: 'destructive',
      });
    }
  };

  // ✏️ Edit Lote
  const handleEdit = (lote: Lote) => {
    setEditingLote(lote);
    setIsDialogOpen(true);
  };

  // ➕ New Lote
  const handleNew = () => {
    setEditingLote(null);
    setIsDialogOpen(true);
  };

  // ✅ After create/update
  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingLote(null);
    loadLotes();
  };

  // 🔍 Handle Multiple Choice arrays or single strings
  const getActivo = (l: any): string => {
    if (!l || !l.activo) return '';
    return Array.isArray(l.activo) ? (l.activo[0] ?? '') : l.activo;
  };

  // 🎨 Badge colors
  const getEstadoBadge = (activo: string) => {
    const colors: Record<string, string> = {
      Disponibles: 'bg-green-500/10 text-green-500',
      Reservados: 'bg-yellow-500/10 text-yellow-500',
      Vendidos: 'bg-blue-500/10 text-blue-500',
    };
    return colors[activo] || 'bg-gray-400/10 text-gray-500';
  };

  // 💰 Currency formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // 📊 Stats from activo
  const estadisticas = {
    total: lotes.length,
    disponibles: lotes.filter((l) => getActivo(l) === 'Disponibles').length,
    reservados: lotes.filter((l) => getActivo(l) === 'Reservados').length,
    vendidos: lotes.filter((l) => getActivo(l) === 'Vendidos').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Lotes</h2>
          <p className="text-muted-foreground mt-1">Gestiona los terrenos y su disponibilidad</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Lotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{estadisticas.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {estadisticas.disponibles}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {estadisticas.reservados}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {estadisticas.vendidos}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Lotes */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Lista de Lotes
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
              {lotes.length === 0 ? 'No hay lotes registrados' : 'No se encontraron resultados'}
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHeaderCell<Lote>
                      field="numeroLote"
                      label="Número"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Lote>
                      field="manzana"
                      label="Manzana"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Lote>
                      field="superficie"
                      label="Superficie"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Lote>
                      field="precio"
                      label="Precio"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Lote>
                      field="ubicacion"
                      label="Ubicación"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Lote>
                      field="activo"
                      label="Estado"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Lote>
                      label="Acciones"
                      className="text-right"
                    />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageData.map((lote) => {
                    const estado = getActivo(lote);
                    return (
                      <TableRow key={lote.objectId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{lote.numeroLote}</TableCell>
                        <TableCell>{lote.manzana}</TableCell>
                        <TableCell>{lote.superficie} m²</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(lote.precio)}
                        </TableCell>
                        <TableCell>{lote.ubicacion || 'N/A'}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEstadoBadge(estado)}`}
                          >
                            {estado || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(lote)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(lote.objectId)}
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

      {/* Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLote ? 'Editar Lote' : 'Nuevo Lote'}</DialogTitle>
            <DialogDescription>
              {editingLote
                ? 'Modifica la información del lote'
                : 'Completa el formulario para registrar un nuevo lote'}
            </DialogDescription>
          </DialogHeader>
          <LoteForm
            lote={editingLote}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
