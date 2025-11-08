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

const pagoSchema = z.object({
  folioPago: z.string().min(1, 'Folio de pago requerido').max(50),
  monto: z.string().min(1, 'Monto requerido').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Debe ser un monto válido mayor a 0',
  }),
  fechaPago: z.string().min(1, 'Fecha de pago requerida'),
  metodoPago: z.enum(['efectivo', 'transferencia', 'cheque', 'tarjeta'], {
    required_error: 'Método de pago requerido',
  }),
  estado: z.enum(['completado', 'pendiente', 'rechazado', 'cancelado']),
  clienteId: z.string().min(1, 'Cliente requerido'),
  expedienteId: z.string().optional(),
  referencia: z.string().max(100).optional(),
  observaciones: z.string().max(1000).optional(),
});

type PagoFormData = z.infer<typeof pagoSchema>;

interface Usuario {
  objectId: string;
  name: string;
  email: string;
}

interface Expediente {
  objectId: string;
  numeroExpediente: string;
  clienteNombre?: string;
}

interface PagoFormProps {
  pago?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PagoForm({ pago, onSuccess, onCancel }: PagoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();

  const form = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      folioPago: pago?.folioPago || '',
      monto: pago?.monto?.toString() || '',
      fechaPago: pago?.fechaPago 
        ? new Date(pago.fechaPago).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      metodoPago: pago?.metodoPago || 'transferencia',
      estado: pago?.estado || 'completado',
      clienteId: pago?.clienteId || '',
      expedienteId: pago?.expedienteId || '',
      referencia: pago?.referencia || '',
      observaciones: pago?.observaciones || '',
    },
  });

  useEffect(() => {
    loadRelatedData();
  }, []);

  const loadRelatedData = async () => {
    try {
      setLoadingData(true);
      const [usuariosData, expedientesData] = await Promise.all([
        api.getAll<Usuario>('Users').catch(() => []),
        api.getAll<Expediente>('Expedientes').catch(() => []),
      ]);
      setUsuarios(usuariosData);
      setExpedientes(expedientesData);
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

  const onSubmit = async (data: PagoFormData) => {
    try {
      setIsLoading(true);
      
      const payload = {
        ...data,
        monto: parseFloat(data.monto),
        fechaPago: new Date(data.fechaPago).getTime(),
      };

      if (pago?.objectId) {
        await api.update('Pagos', pago.objectId, payload);
        toast({
          title: 'Éxito',
          description: 'Pago actualizado correctamente',
        });
      } else {
        await api.create('Pagos', payload);
        toast({
          title: 'Éxito',
          description: 'Pago registrado correctamente',
        });
      }
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al guardar el pago',
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
            name="folioPago"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folio de Pago</FormLabel>
                <FormControl>
                  <Input placeholder="PAG-2024-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    {...field} 
                  />
                </FormControl>
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
            name="expedienteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expediente (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un expediente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {expedientes.map((expediente) => (
                      <SelectItem key={expediente.objectId} value={expediente.objectId}>
                        {expediente.numeroExpediente}
                        {expediente.clienteNombre && ` - ${expediente.clienteNombre}`}
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
            name="metodoPago"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pago</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fechaPago"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Pago</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Número de referencia o transacción" {...field} />
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
                  placeholder="Notas adicionales sobre el pago..."
                  className="resize-none"
                  rows={3}
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
            {pago ? 'Actualizar' : 'Registrar'} Pago
          </Button>
        </div>
      </form>
    </Form>
  );
}
