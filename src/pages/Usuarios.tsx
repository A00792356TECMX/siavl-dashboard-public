import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Usuario {
  objectId: string;
  email: string;
  name?: string;
  created?: number;
  updated?: number;
  [key: string]: any;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUser, setNewUser] = useState({
  email: '',
  name: '',
  telefono: '',
  rol: '',
  activo: true,
});
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [isEditing, setIsEditing] = useState(false);



  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Usuario>('Usuarios');
      setUsuarios(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await api.delete('Usuarios', id);
      toast.success('Usuario eliminado correctamente');
      loadUsuarios();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuario');
    }
  };
  const handleSave = async () => {
  if (!newUser.email) {
    toast.error('El campo Email es obligatorio');
    return;
  }

  try {
    setIsCreating(true);

    if (isEditing && selectedUser) {
      // 🔄 Update existing user
      await api.update('Usuarios', selectedUser.objectId, {
        email: newUser.email,
        nombre: newUser.name || null,
        telefono: newUser.telefono || '',
        rol: newUser.rol || '',
        activo: newUser.activo,
      });
      toast.success('Usuario actualizado correctamente');
    } else {
      // 🆕 Create new user - Validate email doesn't exist
      const existingUser = usuarios.find(
        (u) => u.email.toLowerCase() === newUser.email.toLowerCase()
      );

      if (existingUser) {
        toast.error('Ya existe un usuario con este correo electrónico');
        setIsCreating(false);
        return;
      }

      await api.create('Usuarios', {
        email: newUser.email,
        nombre: newUser.name || null,
        telefono: newUser.telefono || '',
        rol: newUser.rol || '',
        activo: newUser.activo,
      });
      toast.success('Usuario creado correctamente');
    }

    // Reload the users list before closing the dialog
    await loadUsuarios();

    // Reset form and close dialog
    setNewUser({
      email: '',
      name: '',
      telefono: '',
      rol: '',
      activo: true,
    });
    setSelectedUser(null);
    setIsEditing(false);
    setIsDialogOpen(false);
  } catch (error) {
    console.error('Error guardando usuario:', error);
    toast.error('Error al guardar usuario');
  } finally {
    setIsCreating(false);
  }
};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Usuarios</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogTrigger asChild>
    <Button
      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
      onClick={() => {
        setIsEditing(false);
        setSelectedUser(null);
        setNewUser({
          email: '',
          name: '',
          telefono: '',
          rol: '',
          activo: true,
        });
      }}
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuevo Usuario
    </Button>
  </DialogTrigger>


  <DialogContent>
    <DialogHeader>
      <DialogTitle>{isEditing ? 'Editar usuario' : 'Registrar nuevo usuario'}</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          placeholder="usuario@correo.com"
          value={newUser.email}
          disabled={isEditing} 
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        />
      </div>
      <div>
        <Label>Nombre</Label>
        <Input
          placeholder="Nombre completo"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
        />
      </div>
      <div>
        <Label>Teléfono</Label>
        <Input
          placeholder="555-123-4567"
          value={newUser.telefono}
          onChange={(e) => setNewUser({ ...newUser, telefono: e.target.value })}
        />
      </div>
      <div>
        <Label>Rol</Label>
        <Select
          value={newUser.rol}
          onValueChange={(value) => setNewUser({ ...newUser, rol: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={newUser.activo}
          onChange={(e) => setNewUser({ ...newUser, activo: e.target.checked })}
        />
        <Label>Activo</Label>
      </div>

      <Button
        onClick={handleSave}
        disabled={isCreating}
        className="w-full mt-2 bg-primary text-white"
      >
        {isCreating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          isEditing ? 'Guardar Cambios' : 'Crear Usuario'
        )}
      </Button>
    </div>
  </DialogContent>
</Dialog>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.objectId} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{usuario.email}</TableCell>
                      <TableCell>{usuario.name || usuario.nombre}</TableCell>
                      <TableCell>
                        {usuario.created 
                          ? new Date(usuario.created).toLocaleDateString('es-MX')
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
                              setSelectedUser(usuario);
                              setNewUser({
                                email: usuario.email || '',
                                name: usuario.nombre || usuario.name || '',
                                telefono: usuario.telefono || '',
                                rol: usuario.rol || '',
                                activo: usuario.activo ?? true,
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
                            onClick={() => handleDelete(usuario.objectId)}
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
