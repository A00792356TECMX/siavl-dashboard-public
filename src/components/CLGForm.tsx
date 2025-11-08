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
  FormDescription,
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

const clgSchema = z.object({
  folioCLG: z.string().min(1, 'Folio CLG requerido').max(100),
  estado: z.enum(['activo', 'por-vencer', 'vencido', 'cancelado'], {
    required_error: 'Estado requerido',
  }),
  fechaEmision: z.string().min(1, 'Fecha de emisión requerida'),
  fechaVencimiento: z.string().min(1, 'Fecha de vencimiento requerida'),
  expedienteId: z.string().optional(),
  loteId: z.string().optional(),
  observaciones: z.string().max(1000).optional(),
});

type CLGFormData = z.infer<typeof clgSchema>;

interface Expediente {
  objectId: string;
  numeroExpediente: string;
  clienteNombre?: string;
}

interface Lote {
  objectId: string;
  numeroLote: string;
  manzana?: string;
}

interface CLGFormProps {
  certificado?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CLGForm({ certificado, onSuccess, onCancel }: CLGFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { toast } = useToast();

  const form = useForm<CLGFormData>({
    resolver: zodResolver(clgSchema),
    defaultValues: {
      folioCLG: certificado?.folioCLG || '',
      estado: certificado?.estado || 'activo',
      fechaEmision: certificado?.fechaEmision 
        ? new Date(certificado.fechaEmision).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      fechaVencimiento: certificado?.fechaVencimiento 
        ? new Date(certificado.fechaVencimiento).toISOString().split('T')[0]
        : '',
      expedienteId: certificado?.expedienteId || '',
      loteId: certificado?.loteId || '',
      observaciones: certificado?.observaciones || '',
    },
  });

  useEffect(() => {
    loadRelatedData();
  }, []);

  const loadRelatedData = async () => {
    try {
      setLoadingData(true);
      const [expedientesData, lotesData] = await Promise.all([
        api.getAll<Expediente>('Expedientes').catch(() => []),
        api.getAll<Lote>('Lotes').catch(() => []),
      ]);
      setExpedientes(expedientesData);
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

  const onSubmit = async (data: CLGFormData) => {
    try {
      setIsLoading(true);
      
      // Validate fechaVencimiento is after fechaEmision
      if (new Date(data.fechaVencimiento) <= new Date(data.fechaEmision)) {
        toast({
          title: 'Error',
          description: 'La fecha de vencimiento debe ser posterior a la fecha de emisión',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const payload = {
        ...data,
        fechaEmision: new Date(data.fechaEmision).getTime(),
        fechaVencimiento: new Date(data.fechaVencimiento).getTime(),
      };

      if (certificado?.objectId) {
        await api.update('CLG', certificado.objectId, payload);
        toast({
          title: 'Éxito',
          description: 'Certificado CLG actualizado correctamente',
        });
      } else {
        await api.create('CLG', payload);
        toast({
          title: 'Éxito',
          description: 'Certificado CLG creado correctamente',
        });
      }
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al guardar el certificado CLG',
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
            name="folioCLG"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folio CLG</FormLabel>
                <FormControl>
                  <Input placeholder="CLG-2024-001" {...field} />
                </FormControl>
                <FormDescription>
                  Número único del certificado
                </FormDescription>
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
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="por-vencer">Por Vencer</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fechaEmision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Emisión</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fechaVencimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Vencimiento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>
                  Debe ser posterior a la emisión
                </FormDescription>
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
                      <SelectValue placeholder="Asociar con expediente" />
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
            name="loteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lote (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Asociar con lote" />
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
        </div>

        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones (Opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detalles adicionales sobre el certificado..."
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
            {certificado ? 'Actualizar' : 'Crear'} Certificado
          </Button>
        </div>
      </form>
    </Form>
  );
}
