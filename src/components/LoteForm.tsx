import { useState } from 'react';
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

const loteSchema = z.object({
  manzana: z.string().min(1, 'Manzana requerida').max(50),
  superficie: z.string().min(1, 'Superficie requerida').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: 'Debe ser una superficie válida mayor a 0' }
  ),
  precio: z.string().min(1, 'Precio requerido').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: 'Debe ser un precio válido mayor a 0' }
  ),
  activo: z.enum(['Disponibles', 'Reservados', 'Vendidos'], {
    required_error: 'Estado requerido',
  }),
  ubicacion: z.string().max(200).optional(),
  observaciones: z.string().max(1000).optional(),
});

type LoteFormData = z.infer<typeof loteSchema>;

interface LoteFormProps {
  lote?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LoteForm({ lote, onSuccess, onCancel }: LoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoteFormData>({
    resolver: zodResolver(loteSchema),
    defaultValues: {
      manzana: lote?.manzana || '',
      superficie: lote?.superficie?.toString() || '',
      precio: lote?.precio?.toString() || '',
      activo: Array.isArray(lote?.activo)
        ? lote?.activo[0]
        : lote?.activo || 'Disponibles',
      ubicacion: lote?.ubicacion || '',
      observaciones: lote?.observaciones || '',
    },
  });

  const onSubmit = async (data: LoteFormData) => {
    try {
      setIsLoading(true);

      let numeroLote = lote?.numeroLote;
      if (!lote?.objectId) {
        const existing = await api.getAll('Lotes');
        const lastNumber = existing.length > 0
          ? Math.max(...existing.map((l: any) => parseInt(l.numeroLote || 0)))
          : 0;
        numeroLote = (lastNumber + 1).toString().padStart(3, '0');
      }

      const payload = {
        numeroLote,
        manzana: data.manzana,
        superficie: parseFloat(data.superficie),
        precio: parseFloat(data.precio),
        activo: data.activo, // ✅ Always array
        ubicacion: data.ubicacion || '',
        observaciones: data.observaciones || '',
      };

      if (lote?.objectId) {
        await api.update('Lotes', lote.objectId, payload);
        toast({ title: 'Éxito', description: 'Lote actualizado correctamente' });
      } else {
        await api.create('Lotes', payload);
        toast({
          title: 'Éxito',
          description: `Lote ${numeroLote} creado correctamente`,
        });
      }

      onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Error al guardar el lote',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lote?.numeroLote && (
            <FormItem>
              <FormLabel>Número de Lote</FormLabel>
              <Input value={lote.numeroLote} disabled />
            </FormItem>
          )}

          <FormField
            control={form.control}
            name="manzana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manzana</FormLabel>
                <FormControl>
                  <Input placeholder="A, B, C..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="superficie"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Superficie (m²)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="200.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="precio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Disponibles">Disponibles</SelectItem>
                    <SelectItem value="Reservados">Reservados</SelectItem>
                    <SelectItem value="Vendidos">Vendidos</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ubicacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicación</FormLabel>
                <FormControl>
                  <Input placeholder="Zona Norte, Calle Principal..." {...field} />
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
                  placeholder="Características, servicios, accesos..."
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
            {lote ? 'Actualizar' : 'Crear'} Lote
          </Button>
        </div>
      </form>
    </Form>
  );
}
