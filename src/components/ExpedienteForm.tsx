import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const expedienteSchema = z.object({
  numeroExpediente: z.string().min(1, 'Número de expediente requerido').max(50),
  clienteId: z.string().min(1, 'Cliente requerido'),
  loteId: z.string().optional(),
  estado: z.enum(['abierto', 'en-proceso', 'cerrado', 'cancelado']),
  fechaApertura: z.string().min(1, 'Fecha de apertura requerida'),
  fechaCierre: z.string().optional(),
  observaciones: z.string().max(1000).optional(),
});

type ExpedienteFormData = z.infer<typeof expedienteSchema>;

interface Usuario {
  objectId: string;
  name: string;
  email: string;
}

interface Lote {
  objectId: string;
  numeroLote: string;
  manzana?: string;
}

interface ExpedienteFormProps {
  expediente?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpedienteForm({ expediente, onSuccess, onCancel }: ExpedienteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();

  const form = useForm<ExpedienteFormData>({
    resolver: zodResolver(expedienteSchema),
    defaultValues: {
      numeroExpediente: expediente?.numeroExpediente || '',
      clienteId: expediente?.clienteId || '',
      loteId: expediente?.loteId || '',
      estado: expediente?.estado || 'abierto',
      fechaApertura: expediente?.fechaApertura 
        ? new Date(expediente.fechaApertura).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      fechaCierre: expediente?.fechaCierre 
        ? new Date(expediente.fechaCierre).toISOString().split('T')[0]
        : '',
      observaciones: expediente?.observaciones || '',
    },
  });

  useEffect(() => {
    loadRelatedData();
  }, []);

  const loadRelatedData = async () => {
    try {
      setLoadingData(true);
      const [usuariosData, lotesData] = await Promise.all([
        api.getAll<Usuario>('Users').catch(() => []),
        api.getAll<Lote>('Lotes').catch(() => []),
      ]);
      setUsuarios(usuariosData);
      setLotes(lotesData);
    } catch (error) {
      toast({
        title: 'Advertencia',
        description: 'Error al cargar datos relacionados',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: ExpedienteFormData) => {
    try {
      setIsLoading(true);
      
      const payload = {
        ...data,
        fechaApertura: new Date(data.fechaApertura).getTime(),
        fechaCierre: data.fechaCierre ? new Date(data.fechaCierre).getTime() : null,
      };

      if (expediente?.objectId) {
        await api.update('Expedientes', expediente.objectId, payload);
        toast({
          title: 'Éxito',
          description: 'Expediente actualizado correctamente',
        });
      } else {
        await api.create('Expedientes', payload);
        toast({
          title: 'Éxito',
          description: 'Expediente creado correctamente',
        });
      }
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al guardar el expediente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="numeroExpediente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Expediente</FormLabel>
                <FormControl>
                  <Input placeholder="EXP-2024-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="en-proceso">En Proceso</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clienteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {usuarios.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No hay clientes disponibles
                      </SelectItem>
                    ) : (
                      usuarios.map((usuario) => (
                        <SelectItem key={usuario.objectId} value={usuario.objectId}>
                          {usuario.name} - {usuario.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lote (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un lote" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {lotes.map((lote) => (
                      <SelectItem key={lote.objectId} value={lote.objectId}>
                        Lote {lote.numeroLote} {lote.manzana ? `- Mz. ${lote.manzana}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fechaApertura"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Apertura</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fechaCierre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Cierre (Opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Notas adicionales sobre el expediente..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expediente ? 'Actualizar' : 'Crear'} Expediente
          </Button>
        </div>
      </form>
    </Form>
  );
}
