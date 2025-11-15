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
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const expedienteSchema = z.object({
  folioExpediente: z.string().optional(),
  cliente: z.string().min(1, 'Cliente requerido'),
  lote: z.string().min(1, 'Lote requerido'),
  relacionUsuarios: z.string().optional(),
  relacionLotes: z.string().optional(),
  observaciones: z.string().max(1000).optional(),
  activo: z.boolean().default(true),
});

type ExpedienteFormData = z.infer<typeof expedienteSchema>;

interface Cliente {
  objectId: string;
  nombre: string;
  email: string;
}

interface Lote {
  objectId: string;
  numeroLote: string;
  manzana: string;
  activo: string;
}

interface ExpedienteFormProps {
  expediente?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpedienteForm({ expediente, onSuccess, onCancel }: ExpedienteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [availableLotes, setAvailableLotes] = useState<Lote[]>([]);
  const { toast } = useToast();

  const form = useForm<ExpedienteFormData>({
    resolver: zodResolver(expedienteSchema),
    defaultValues: {
      folioExpediente: expediente?.folioExpediente || '',
      cliente: expediente?.cliente || '',
      lote: expediente?.lote || '',
      relacionUsuarios: expediente?.relacionUsuarios || '',
      relacionLotes: expediente?.relacionLotes || '',
      observaciones: expediente?.observaciones || '',
      activo: expediente?.activo ?? true,
    },
  });

  useEffect(() => {
    loadClientes();
    loadAvailableLotes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
      const clientesData = await api.getAll<Cliente>('Usuarios');
      setClientes(clientesData);
    } catch (error) {
      console.error('Error loading clientes:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los clientes',
        variant: 'destructive',
      });
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadAvailableLotes = async () => {
    try {
      setLoadingLotes(true);
      const [allLotes, allExpedientes] = await Promise.all([
        api.getAll<Lote>('Lotes'),
        api.getAll('Expedientes')
      ]);

      // Get lotes already assigned via relacionLotes (excluding current expediente if editing)
      const assignedLoteIds = allExpedientes
        .filter((exp: any) => 
          exp.relacionLotes && 
          exp.objectId !== expediente?.objectId
        )
        .map((exp: any) => exp.relacionLotes);

      // Filter: only active lots and not assigned
      const available = allLotes.filter((lote: Lote) => 
        lote.activo === 'Disponibles' && 
        !assignedLoteIds.includes(lote.objectId)
      );

      // If editing, include current lot even if occupied
      if (expediente?.relacionLotes) {
        const currentLote = allLotes.find((l: Lote) => l.objectId === expediente.relacionLotes);
        if (currentLote && !available.find((l: Lote) => l.objectId === currentLote.objectId)) {
          available.unshift(currentLote);
        }
      }

      setAvailableLotes(available);
    } catch (error) {
      console.error('Error loading lotes:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los lotes disponibles',
        variant: 'destructive',
      });
    } finally {
      setLoadingLotes(false);
    }
  };

  const generateFolio = async () => {
    const data = await api.getAll('Expedientes');
    const next = data.length + 1;
    return `EXP-${next.toString().padStart(4, '0')}`;
  };

  const onSubmit = async (data: ExpedienteFormData) => {
    try {
      setIsLoading(true);

      // Validate that relacionLotes is not assigned to another expediente
      if (data.relacionLotes) {
        const allExpedientes = await api.getAll('Expedientes');
        const loteAlreadyAssigned = allExpedientes.find(
          (exp: any) =>
            exp.relacionLotes === data.relacionLotes &&
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
      }

      let payload: any = {
        cliente: data.cliente,
        lote: data.lote,
        observaciones: data.observaciones,
        activo: data.activo,
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

          {/* Cliente Select */}
          <FormField
            control={form.control}
            name="relacionUsuarios"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selecciona un Cliente</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    const selectedCliente = clientes.find(c => c.objectId === value);
                    if (selectedCliente) {
                      form.setValue('cliente', selectedCliente.nombre);
                    }
                  }} 
                  value={field.value}
                  disabled={loadingClientes}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingClientes ? "Cargando clientes..." : "Seleccionar cliente"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.objectId} value={cliente.objectId}>
                        {cliente.nombre} - {cliente.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Lote Select */}
          <FormField
            control={form.control}
            name="relacionLotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selecciona un Lote Disponible</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    const selectedLote = availableLotes.find(l => l.objectId === value);
                    if (selectedLote) {
                      form.setValue('lote', `${selectedLote.numeroLote} - Manzana ${selectedLote.manzana}`);
                    }
                  }} 
                  value={field.value}
                  disabled={loadingLotes}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingLotes ? "Cargando lotes..." : "Seleccionar lote disponible"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableLotes.length === 0 ? (
                      <SelectItem value="no-disponible" disabled>
                        No hay lotes disponibles
                      </SelectItem>
                    ) : (
                      availableLotes.map((lote) => (
                        <SelectItem key={lote.objectId} value={lote.objectId}>
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
