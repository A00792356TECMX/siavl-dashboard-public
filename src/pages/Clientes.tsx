import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { TableControls } from '@/components/TableControls';
import { TableHeaderCell } from '@/components/TableHeader';
import { useTableData } from '@/hooks/useTableData';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface Cliente {
  objectId: string;
  email: string;
  nombre?: string;
  telefono?: string;
  activo?: boolean;
  created?: number;
  updated?: number;
  [key: string]: any;
}

export default function Clientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
    data: clientes,
    searchFields: ['nombre', 'email', 'telefono'],
  });
  
  const [newCliente, setNewCliente] = useState({
    email: '',
    nombre: '',
    telefono: '',
    activo: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Control de acceso: solo Admin y Editor
  if (user?.role !== 'Admin' && user?.role !== 'Editor') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Cliente>('Usuarios', {
        pageSize: '100',
        sortBy: 'created desc'
      });
      setClientes(data);
    } catch (error) {
      console.error('Error loading clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      await api.delete('Usuarios', id);
      loadClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateTelefono = (telefono: string): boolean => {
    const telefonoRegex = /^[0-9+\-\s()]{7,20}$/;
    return telefonoRegex.test(telefono);
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/data/Usuarios?where=email='${email}'`, {
        headers: {
          'user-token': localStorage.getItem('userToken') || '',
        },
      });
      const data = await response.json();
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const handleSave = async () => {
    setEmailError('');
    
    // Validaciones
    if (!newCliente.nombre || !newCliente.nombre.trim()) {
      toast.error('El campo Nombre es obligatorio');
      return;
    }

    if (!newCliente.email || !newCliente.email.trim()) {
      toast.error('El campo Email es obligatorio');
      return;
    }

    if (!validateEmail(newCliente.email)) {
      toast.error('Formato de email inválido');
      setEmailError('Formato de email inválido');
      return;
    }

    if (newCliente.telefono && !validateTelefono(newCliente.telefono)) {
      toast.error('Formato de teléfono inválido. Use solo números, espacios, guiones y paréntesis');
      return;
    }

    try {
      setIsCreating(true);

      if (isEditing && selectedCliente) {
        // 🔄 Update existing cliente
        await api.update('Usuarios', selectedCliente.objectId, {
          nombre: newCliente.nombre,
          telefono: newCliente.telefono || '',
          activo: newCliente.activo,
        });
        // Toast is already shown by api.update in api.ts
      } else {
        // 🆕 Create new cliente - Validate email doesn't exist
        const emailExists = await checkEmailExists(newCliente.email);

        if (emailExists) {
          toast.error('El correo ya existe');
          setEmailError('El correo ya existe');
          setIsCreating(false);
          return;
        }

        await api.create('Usuarios', {
          email: newCliente.email,
          nombre: newCliente.nombre,
          telefono: newCliente.telefono || '',
          activo: newCliente.activo,
        });
        // Toast is already shown by api.create in api.ts
      }

      await loadClientes();

      // Reset form and close dialog
      setNewCliente({
        email: '',
        nombre: '',
        telefono: '',
        activo: true,
      });
      setSelectedCliente(null);
      setIsEditing(false);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      toast.error('Error al guardar el cliente');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Administra los clientes registrados en SIAVL
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={() => {
                setIsEditing(false);
                setSelectedCliente(null);
                setEmailError('');
                setNewCliente({
                  email: '',
                  nombre: '',
                  telefono: '',
                  activo: true,
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar cliente' : 'Registrar nuevo cliente'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  placeholder="Nombre completo"
                  value={newCliente.nombre}
                  onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="cliente@correo.com"
                  value={newCliente.email}
                  readOnly={isEditing}
                  disabled={isEditing}
                  onChange={(e) => {
                    setNewCliente({ ...newCliente, email: e.target.value });
                    setEmailError('');
                  }}
                  className={emailError ? 'border-red-500' : ''}
                />
                {emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
              </div>
              
              <div>
                <Label>Teléfono</Label>
                <Input
                  placeholder="555-123-4567"
                  value={newCliente.telefono}
                  onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato: números, espacios, guiones y paréntesis
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={newCliente.activo}
                  onChange={(e) => setNewCliente({ ...newCliente, activo: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="activo">Cliente Activo</Label>
              </div>

              <Button
                onClick={handleSave}
                disabled={isCreating}
                className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  isEditing ? 'Guardar Cambios' : 'Crear Cliente'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
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
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totalResults === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg font-medium">
                {clientes.length === 0 ? 'No hay clientes registrados' : 'No se encontraron clientes'}
              </p>
              {clientes.length > 0 && (
                <p className="text-sm mt-2">Intenta con otros términos de búsqueda</p>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHeaderCell<Cliente>
                      field="nombre"
                      label="Nombre"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Cliente>
                      field="email"
                      label="Email"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Cliente>
                      field="telefono"
                      label="Teléfono"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Cliente>
                      field="activo"
                      label="Estado"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Cliente>
                      field="created"
                      label="Fecha de Registro"
                      sortable
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <TableHeaderCell<Cliente>
                      label="Acciones"
                      className="text-right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((cliente) => (
                    <TableRow key={cliente.objectId} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{cliente.nombre || '-'}</TableCell>
                      <TableCell>{cliente.email}</TableCell>
                      <TableCell>{cliente.telefono || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={cliente.activo ? 'default' : 'destructive'}
                          className={cliente.activo ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {cliente.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cliente.created 
                          ? new Date(cliente.created).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setNewCliente({
                                email: cliente.email || '',
                                nombre: cliente.nombre || '',
                                telefono: cliente.telefono || '',
                                activo: cliente.activo ?? true,
                              });
                              setIsEditing(true);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cliente.objectId)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
