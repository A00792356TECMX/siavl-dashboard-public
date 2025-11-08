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
  numeroLote: z.string().min(1, 'Número de lote requerido').max(50),
  manzana: z.string().min(1, 'Manzana requerida').max(50),
  superficie: z.string().min(1, 'Superficie requerida').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Debe ser una superficie válida mayor a 0',
  }),
  precio: z.string().min(1, 'Precio requerido').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Debe ser un precio válido mayor a 0',
  }),
  estado: z.enum(['disponible', 'reservado', 'vendido', 'no-disponible'], {
    required_error: 'Estado requerido',
  }),
  ubicacion: z.string().max(200).optional(),
  descripcion: z.string().max(1000).optional(),
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
      numeroLote: lote?.numeroLote || '',
      manzana: lote?.manzana || '',
      superficie: lote?.superficie?.toString() || '',
      precio: lote?.precio?.toString() || '',
      estado: lote?.estado || 'disponible',
      ubicacion: lote?.ubicacion || '',
      descripcion: lote?.descripcion || '',
    },
  });

  const onSubmit = async (data: LoteFormData) => {
    try {
      setIsLoading(true);
      
      const payload = {
        ...data,
        superficie: parseFloat(data.superficie),
        precio: parseFloat(data.precio),
      };

      if (lote?.objectId) {
        await api.update('Lotes', lote.objectId, payload);
        toast({
          title: 'Éxito',
          description: 'Lote actualizado correctamente',
        });
      } else {
        await api.create('Lotes', payload);
        toast({
          title: 'Éxito',
          description: 'Lote creado correctamente',
        });
      }
      
      onSuccess();
    } catch (error) {
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
          <FormField
            control={form.control}
            name="numeroLote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Lote</FormLabel>
                <FormControl>
                  <Input placeholder="001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="200.00" 
                    {...field} 
                  />
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
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="reservado">Reservado</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="no-disponible">No Disponible</SelectItem>
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
                <FormLabel>Ubicación (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Sector Norte, Calle Principal..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Características del lote, servicios disponibles, accesos..."
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
