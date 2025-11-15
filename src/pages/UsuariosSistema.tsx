import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { UserCog, Plus, Edit, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { TableControls } from '@/components/TableControls';
import { TableHeaderCell } from '@/components/TableHeader';
import { useTableData } from '@/hooks/useTableData';

interface SystemUser {
  objectId: string;
  name: string;
  email: string;
  role?: string;
  status?: string;
  lastLogin?: number;
  created?: number;
}

export default function UsuariosSistema() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Viewer',
    status: 'Active',
  });

  // Check if user is Admin
  useEffect(() => {
    if (user?.role !== 'Admin') {
      toast({
        title: 'Acceso denegado',
        description: 'No tienes permisos para acceder a este módulo',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [user, navigate, toast]);

  // Table data management
  const {
    pageData,
    page,
    pageSize,
    totalPages,
    totalResults,
    search,
    sortField,
    sortOrder,
    setPage,
    setPageSize: handlePageSizeChange,
    setSearch: handleSearchChange,
    handleSort,
  } = useTableData({
    data: usuarios,
    searchFields: ['name', 'email', 'role'],
    initialPageSize: 10,
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<SystemUser>('Users');
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios del sistema:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios del sistema',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (usuario?: SystemUser) => {
    if (usuario) {
      setEditingUser(usuario);
      setFormData({
        name: usuario.name || '',
        email: usuario.email || '',
        password: '',
        role: usuario.role || 'Viewer',
        status: usuario.status || 'Active',
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'Viewer',
        status: 'Active',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Viewer',
      status: 'Active',
    });
  };

  const handleSave = async () => {
    try {
      // Validaciones
      if (!formData.name || !formData.email) {
        toast({
          title: 'Error',
          description: 'Nombre y email son obligatorios',
          variant: 'destructive',
        });
        return;
      }

      if (!editingUser && (!formData.password || formData.password.length < 8)) {
        toast({
          title: 'Error',
          description: 'La contraseña debe tener al menos 8 caracteres',
          variant: 'destructive',
        });
        return;
      }

      if (editingUser) {
        // Editar usuario existente
        await api.update('Users', editingUser.objectId, {
          name: formData.name,
          role: formData.role,
          status: formData.status,
        });
        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente',
        });
      } else {
        // Crear nuevo usuario
        await api.create('Users', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          status: formData.status,
        });
        toast({
          title: 'Éxito',
          description: 'Usuario creado correctamente',
        });
      }

      handleCloseDialog();
      loadUsuarios();
    } catch (error: any) {
      console.error('Error al guardar usuario:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el usuario',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async (usuario: SystemUser) => {
    try {
      await api.update('Users', usuario.objectId, {
        status: 'Inactive',
      });
      toast({
        title: 'Usuario desactivado',
        description: 'El usuario ha sido desactivado correctamente',
        variant: 'destructive',
      });
      loadUsuarios();
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desactivar el usuario',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-blue-500 text-white';
      case 'Editor':
        return 'bg-yellow-500 text-white';
      case 'Viewer':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    return status === 'Active'
      ? 'bg-green-500 text-white'
      : 'bg-red-500 text-white';
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (user?.role !== 'Admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Usuarios del Sistema</h1>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Table Card */}
      <Card className="p-6">
        <TableControls
          search={search}
          onSearchChange={handleSearchChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalResults={totalResults}
          currentPageResults={pageData.length}
        />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando usuarios del sistema...
          </div>
        ) : pageData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron resultados
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell
                    field="name"
                    label="Nombre"
                    sortable
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHeaderCell
                    field="email"
                    label="Email"
                    sortable
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHeaderCell
                    field="role"
                    label="Rol"
                    sortable
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHeaderCell
                    field="status"
                    label="Estado"
                    sortable
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHeaderCell
                    field="lastLogin"
                    label="Último acceso"
                    sortable
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHeaderCell
                    field="created"
                    label="Creado"
                    sortable
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((usuario) => (
                  <TableRow key={usuario.objectId} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{usuario.name}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(usuario.role)}>
                        {usuario.role || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(usuario.status)}>
                        {usuario.status || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(usuario.lastLogin)}</TableCell>
                    <TableCell>{formatDate(usuario.created)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(usuario)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {usuario.status === 'Active' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeactivate(usuario)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink
                          onClick={() => setPage(i + 1)}
                          isActive={page === i + 1}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario del Sistema' : 'Nuevo Usuario del Sistema'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifica los datos del usuario del sistema'
                : 'Completa los datos para crear un nuevo usuario del sistema'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
                disabled={!!editingUser}
                readOnly={!!editingUser}
              />
            </div>

            {!editingUser && (
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="role">Rol del Usuario</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Editor">Editor</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Activo</SelectItem>
                  <SelectItem value="Inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
