import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ExpedienteForm } from '@/components/ExpedienteForm';
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

interface Expediente {
  objectId: string;
  folioExpediente: string;
  cliente: string;
  lote: string;
  relacionUsuarios?: string | any[];
  relacionLotes?: string | any[];
  observaciones?: string;
  activo: boolean;
  created: string;
  updated: string;
}

export default function Expedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpediente, setEditingExpediente] = useState<Expediente | null>(null);
  const [pagosData, setPagosData] = useState<Map<string, number>>(new Map());
  const [lotesData, setLotesData] = useState<Map<string, number>>(new Map());
  const [clientesMap, setClientesMap] = useState<Map<string, any>>(new Map());
  const [lotesMap, setLotesMap] = useState<Map<string, any>>(new Map());
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
    data: expedientes,
    searchFields: ['folioExpediente', 'cliente', 'lote'],
  });

  useEffect(() => {
    loadExpedientes();
  }, []);

  const loadExpedientes = async () => {
    try {
      setIsLoading(true);
      const [expedientesData, pagosData, lotesData, clientesData] = await Promise.all([
        api.getAll<Expediente>('Expedientes', {
          sortBy: 'created desc',
          loadRelations: 'relacionLotes,relacionUsuarios',
          relationsDepth: '1',
          pageSize: '100'
        }),
        api.getAll<any>('Pagos', {
          pageSize: '100',
          loadRelations: 'relacionExpediente',
          relationsDepth: '1'
        }),
        api.getAll<any>('Lotes', {
          pageSize: '100'
        }),
        api.getAll<any>('Usuarios', {
          pageSize: '100'
        })
      ]);

      console.log('=== DEBUGGING EXPEDIENTES ===');
      console.log('Total expedientes loaded:', expedientesData.length);
      if (expedientesData.length > 0) {
        console.log('First expediente full object:', expedientesData[0]);
        console.log('relacionUsuarios type:', typeof expedientesData[0].relacionUsuarios);
        console.log('relacionUsuarios value:', expedientesData[0].relacionUsuarios);
        console.log('relacionLotes type:', typeof expedientesData[0].relacionLotes);
        console.log('relacionLotes value:', expedientesData[0].relacionLotes);
        console.log('cliente field:', expedientesData[0].cliente);
        console.log('lote field:', expedientesData[0].lote);
      }
      console.log('Sample lote from Lotes table:', lotesData[0]);
      console.log('Total pagos loaded:', pagosData.length);
      if (pagosData.length > 0) {
        console.log('First pago:', pagosData[0]);
        console.log('First pago relacionExpediente:', pagosData[0].relacionExpediente);
        console.log('First pago monto:', pagosData[0].monto);
      }

      // Calculate total paid amount per expediente
      const pagosPorExpediente = new Map<string, number>();
      pagosData.forEach((pago: any) => {
        let folioExpediente = null;

        // relacionExpediente is loaded as an object with loadRelations
        if (pago.relacionExpediente) {
          if (typeof pago.relacionExpediente === 'object' && !Array.isArray(pago.relacionExpediente)) {
            // Backendless loaded the relation as object
            folioExpediente = pago.relacionExpediente.folioExpediente;
          } else if (typeof pago.relacionExpediente === 'string') {
            // It's a string (shouldn't happen with loadRelations, but just in case)
            folioExpediente = pago.relacionExpediente;
          }
        }

        if (folioExpediente) {
          const current = pagosPorExpediente.get(folioExpediente) || 0;
          pagosPorExpediente.set(folioExpediente, current + (pago.monto || 0));
        }
      });

      console.log('Pagos por expediente Map:', Object.fromEntries(pagosPorExpediente));
      console.log('=== END DEBUGGING ===');

      // Map lotes prices by numeroLote (this is the ID column)
      const preciosPorLote = new Map<string, number>();
      lotesData.forEach((lote: any) => {
        preciosPorLote.set(lote.numeroLote, lote.precio || 0);
      });

      // Map clientes by nombre (this is the ID column for Usuarios)
      const clientesByNombre = new Map<string, any>();
      clientesData.forEach((cliente: any) => {
        clientesByNombre.set(cliente.nombre, cliente);
      });

      // Also map by objectId for backwards compatibility
      const clientesById = new Map<string, any>();
      clientesData.forEach((cliente: any) => {
        clientesById.set(cliente.objectId, cliente);
      });

      // Map lotes by objectId for backwards compatibility
      const lotesById = new Map<string, any>();
      lotesData.forEach((lote: any) => {
        lotesById.set(lote.objectId, lote);
      });

      setExpedientes(expedientesData);
      setPagosData(pagosPorExpediente);
      setLotesData(preciosPorLote);
      setClientesMap(clientesById);
      setLotesMap(lotesById);
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

  const getPrecioLote = (expediente: Expediente): number => {
    // New expedientes: relacionLotes is a relation to Lotes table
    // Backendless returns 1:1 relations as objects directly (not arrays)
    if (expediente.relacionLotes) {
      // Check if it's an object (loaded relation from Backendless)
      if (typeof expediente.relacionLotes === 'object' && !Array.isArray(expediente.relacionLotes)) {
        const loteObj = expediente.relacionLotes as any;
        return loteObj.precio || 0;
      }

      // Or a string reference to numeroLote
      if (typeof expediente.relacionLotes === 'string') {
        return lotesData.get(expediente.relacionLotes) || 0;
      }
    }

    // Old expedientes: fallback to lote field (string like "006 - Manzana B")
    if (expediente.lote) {
      // Extract just the lote number (e.g., "006" from "006 - Manzana B")
      const loteNumber = expediente.lote.split(' ')[0];
      return lotesData.get(loteNumber) || 0;
    }

    return 0;
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
              {expedientes.length === 0 ? 'No hay expedientes registrados' : 'No se encontraron resultados'}
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHeaderCell<Expediente>
                      field="folioExpediente"
                      label="Número"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Expediente>
                      field="cliente"
                      label="Cliente"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Expediente>
                      field="lote"
                      label="Lote"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Expediente>
                      field="activo"
                      label="Estado"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Expediente>
                      label="Monto Pagado"
                      className="text-right"
                    />
                    <TableHeaderCell<Expediente>
                      label="Precio Total"
                      className="text-right"
                    />
                    <TableHeaderCell<Expediente>
                      field="created"
                      label="Fecha Apertura"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Expediente>
                      label="Acciones"
                      className="text-right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((expediente) => {
                    const montoPagado = getMontoPagado(expediente.folioExpediente);
                    const precioLote = getPrecioLote(expediente);
                    
                    // Get related cliente and lote data
                    let clienteNombre = 'N/A';
                    let loteDisplay = 'Sin asignar';

                    // Handle relacionUsuarios (Backendless returns 1:1 relations as objects)
                    if (expediente.relacionUsuarios) {
                      if (typeof expediente.relacionUsuarios === 'object' && !Array.isArray(expediente.relacionUsuarios)) {
                        // Loaded relation object from Backendless
                        const usuario = expediente.relacionUsuarios as any;
                        clienteNombre = usuario.nombre || 'N/A';
                      } else if (typeof expediente.relacionUsuarios === 'string') {
                        // String reference (fallback for old data)
                        const cliente = clientesMap.get(expediente.relacionUsuarios);
                        clienteNombre = cliente?.nombre || expediente.relacionUsuarios;
                      }
                    } else if (expediente.cliente) {
                      // Legacy field (fallback for very old data)
                      clienteNombre = expediente.cliente;
                    }

                    // Handle relacionLotes (Backendless returns 1:1 relations as objects)
                    if (expediente.relacionLotes) {
                      if (typeof expediente.relacionLotes === 'object' && !Array.isArray(expediente.relacionLotes)) {
                        // Loaded relation object from Backendless
                        const lote = expediente.relacionLotes as any;
                        loteDisplay = `${lote.numeroLote} - Manzana ${lote.manzana}`;
                      } else if (typeof expediente.relacionLotes === 'string') {
                        // String reference (fallback for old data)
                        const lote = lotesMap.get(expediente.relacionLotes);
                        loteDisplay = lote ? `${lote.numeroLote} - Manzana ${lote.manzana}` : expediente.relacionLotes;
                      }
                    } else if (expediente.lote) {
                      // Legacy field (fallback for very old data)
                      loteDisplay = expediente.lote;
                    }

                    return (
                      <TableRow key={expediente.objectId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">{expediente.folioExpediente}</TableCell>
                        <TableCell>{clienteNombre}</TableCell>
                        <TableCell>{loteDisplay}</TableCell>
                        <TableCell>{expediente.activo ? '✅ Activo' : '❌ Inactivo'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ${montoPagado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          ${precioLote.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
