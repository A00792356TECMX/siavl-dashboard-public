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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// ✅ New schema
const expedienteSchema = z.object({
  folioExpediente: z.string().optional(),
  cliente: z.string().min(1, 'Cliente requerido'),
  lote: z.string().min(1, 'Lote requerido'),
  observaciones: z.string().max(1000).optional(),
  activo: z.boolean().default(true),
});

type ExpedienteFormData = z.infer<typeof expedienteSchema>;

interface ExpedienteFormProps {
  expediente?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpedienteForm({ expediente, onSuccess, onCancel }: ExpedienteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableLotes, setAvailableLotes] = useState<Array<{ numeroLote: string; manzana: string }>>([]);
  const { toast } = useToast();

  const form = useForm<ExpedienteFormData>({
    resolver: zodResolver(expedienteSchema),
    defaultValues: {
      folioExpediente: expediente?.folioExpediente || '',
      cliente: expediente?.cliente || '',
      lote: expediente?.lote || '',
      observaciones: expediente?.observaciones || '',
      activo: expediente?.activo ?? true,
    },
  });

  // Load available lotes (not assigned to any expediente)
  useEffect(() => {
    loadAvailableLotes();
  }, []);

  const loadAvailableLotes = async () => {
    try {
      // Get all lotes and expedientes
      const [allLotes, allExpedientes] = await Promise.all([
        api.getAll('Lotes'),
        api.getAll('Expedientes')
      ]);

      // Get lotes already assigned (excluding the current expediente if editing)
      const assignedLotes = allExpedientes
        .filter((exp: any) => exp.objectId !== expediente?.objectId)
        .map((exp: any) => exp.lote);

      // Filter available lotes
      const available = allLotes
        .filter((lote: any) => !assignedLotes.includes(lote.numeroLote))
        .map((lote: any) => ({
          numeroLote: lote.numeroLote,
          manzana: lote.manzana || 'Sin manzana'
        }));

      setAvailableLotes(available);
    } catch (error) {
      console.error('Error loading lotes:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los lotes disponibles',
        variant: 'destructive',
      });
    }
  };

  // ✅ Generate sequential folio when creating new expediente
  const generateFolio = async () => {
    const data = await api.getAll('Expedientes');
    const next = data.length + 1;
    return `EXP-${next.toString().padStart(4, '0')}`;
  };

  const onSubmit = async (data: ExpedienteFormData) => {
    try {
      setIsLoading(true);

      // Validate that lote is not assigned to another expediente
      const allExpedientes = await api.getAll('Expedientes');
      const loteAlreadyAssigned = allExpedientes.find(
        (exp: any) =>
          exp.lote === data.lote &&
          exp.objectId !== expediente?.objectId
      );

      if (loteAlreadyAssigned) {
        toast({
          title: 'Error',
          description: 'Este lote ya está asignado a otro expediente',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      let payload = {
        ...data,
        folioExpediente: expediente?.folioExpediente || (await generateFolio()),
      };

      if (expediente?.objectId) {
        // 🔄 Update
        await api.update('Expedientes', expediente.objectId, payload);
        // Success toast already shown in apiRequest
      } else {
        // 🆕 Create
        await api.create('Expedientes', payload);
        // Success toast already shown in apiRequest
      }

      onSuccess();
    } catch (error) {
      console.error(error);
      // Error toast already shown in apiRequest
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Folio Expediente (auto-generated, disabled on edit) */}
          <FormField
            control={form.control}
            name="folioExpediente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folio de Expediente</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Generado automáticamente"
                    disabled
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Cliente */}
          <FormField
            control={form.control}
            name="cliente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Lote */}
          <FormField
            control={form.control}
            name="lote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lote</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar lote disponible" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableLotes.length === 0 ? (
                      <SelectItem value="no-disponible" disabled>
                        No hay lotes disponibles
                      </SelectItem>
                    ) : (
                      availableLotes.map((lote) => (
                        <SelectItem key={lote.numeroLote} value={lote.numeroLote}>
                          {lote.numeroLote} - Manzana {lote.manzana}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Observaciones */}
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

        {/* Activo Checkbox */}
        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              </FormControl>
              <FormLabel>Activo</FormLabel>
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
