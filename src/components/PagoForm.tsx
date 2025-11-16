import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ✅ Schema aligned with Backendless
const pagoSchema = z.object({
  relacionExpediente: z.string().min(1, "Expediente requerido"),
  monto: z
    .string()
    .min(1, "Monto requerido")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Debe ser un monto válido mayor a 0"
    ),
  metodoPago: z.string().nonempty("Método de pago requerido"),
  moneda: z.string().nonempty("Moneda requerida"),
  observaciones: z.string().optional(),
});

type PagoFormData = z.infer<typeof pagoSchema>;

interface Expediente {
  objectId: string;
  folioExpediente: string;
  cliente: string;
  lote: string;
  relacionUsuarios?: {
    nombre: string;
  } | string;
  relacionLotes?: {
    numeroLote: string;
    manzana: string;
    precio: number;
  } | string;
}

interface PagoFormProps {
  pago?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PagoForm({ pago, onSuccess, onCancel }: PagoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [adeudoMap, setAdeudoMap] = useState<Map<string, number>>(new Map());

  const form = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      relacionExpediente: pago?.relacionExpediente || "",
      monto: pago?.monto?.toString() || "",
      metodoPago: pago?.metodoPago || "",
      moneda: pago?.moneda || "",
      observaciones: pago?.observaciones || "",
    },
  });

  useEffect(() => {
    loadExpedientes();
  }, []);

  const loadExpedientes = async () => {
    try {
      setLoadingData(true);

      // Load all necessary data in parallel
      const [expedientesData, pagosData] = await Promise.all([
        api.getAll<Expediente>("Expedientes", {
          loadRelations: "relacionUsuarios,relacionLotes",
          relationsDepth: "1",
          pageSize: "100", // Load up to 100 expedientes
          sortBy: "created desc"
        }),
        api.getAll<any>("Pagos", {
          pageSize: "100"
        })
      ]);

      console.log('=== DEBUGGING PAGO FORM ===');
      console.log('Total expedientes loaded:', expedientesData.length);
      console.log('Expedientes folios:', expedientesData.map(e => e.folioExpediente));
      console.log('Total pagos loaded:', pagosData.length);
      console.log('=== END DEBUGGING ===');

      // Calculate total paid per expediente (using folioExpediente)
      const pagosPorFolio = new Map<string, number>();
      pagosData.forEach((p: any) => {
        // Exclude current pago if editing
        if (pago?.objectId && p.objectId === pago.objectId) return;

        // relacionExpediente contains the folioExpediente value
        if (p.relacionExpediente) {
          const current = pagosPorFolio.get(p.relacionExpediente) || 0;
          pagosPorFolio.set(p.relacionExpediente, current + (p.monto || 0));
        }
      });

      // Calculate adeudo for each expediente
      const adeudoPorFolio = new Map<string, number>();
      expedientesData.forEach((exp: Expediente) => {
        // Get precio from relacionLotes (Backendless returns 1:1 as object)
        let precioLote = 0;
        if ((exp as any).relacionLotes && typeof (exp as any).relacionLotes === 'object' && !Array.isArray((exp as any).relacionLotes)) {
          const loteObj = (exp as any).relacionLotes;
          precioLote = loteObj.precio || 0;
        }

        const montoPagado = pagosPorFolio.get(exp.folioExpediente) || 0;
        const adeudo = precioLote - montoPagado;
        adeudoPorFolio.set(exp.folioExpediente, adeudo);

        // Debug first expediente
        if (exp === expedientesData[0]) {
          console.log('First expediente adeudo calculation:');
          console.log('  folioExpediente:', exp.folioExpediente);
          console.log('  relacionLotes:', (exp as any).relacionLotes);
          console.log('  precioLote:', precioLote);
          console.log('  montoPagado:', montoPagado);
          console.log('  adeudo:', adeudo);
        }
      });

      // Show all expedientes (not just those with pending debt)
      setExpedientes(expedientesData);
      setAdeudoMap(adeudoPorFolio);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los expedientes",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const generateReferencia = async (): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get all pagos to find the highest number for this month
    const allPagos = await api.getAll<any>("Pagos");
    const prefix = `PAG-${year}-${month}-`;
    
    const numbersThisMonth = allPagos
      .filter((p: any) => p.referencia?.startsWith(prefix))
      .map((p: any) => {
        const parts = p.referencia.split('-');
        return parseInt(parts[3] || '0');
      })
      .filter((n: number) => !isNaN(n));
    
    const maxNumber = numbersThisMonth.length > 0 ? Math.max(...numbersThisMonth) : 0;
    const nextNumber = String(maxNumber + 1).padStart(5, '0');
    
    return `${prefix}${nextNumber}`;
  };

  const onSubmit = async (data: PagoFormData) => {
    try {
      setIsLoading(true);

      // Find the expediente data by folioExpediente
      const expediente = expedientes.find((exp: Expediente) => exp.folioExpediente === data.relacionExpediente);

      if (!expediente) {
        toast({
          title: "Error",
          description: "Expediente no encontrado",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get the adeudo for this expediente using folioExpediente
      const adeudo = adeudoMap.get(expediente.folioExpediente) || 0;
      
      // Validate amount against debt
      const nuevoMonto = parseFloat(data.monto);
      if (nuevoMonto > adeudo) {
        toast({
          title: "Error",
          description: `El monto excede el adeudo. Adeudo pendiente: $${adeudo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Generate referencia only for new pagos
      const referencia = pago?.objectId ? pago.referencia : await generateReferencia();

      const payload = {
        monto: nuevoMonto,
        metodoPago: data.metodoPago,
        moneda: data.moneda,
        referencia: referencia,
        observaciones: data.observaciones || "",
      };

      if (pago?.objectId) {
        // Update existing pago
        await api.update("Pagos", pago.objectId, payload);
      } else {
        // Create new pago first
        const newPago: any = await api.create("Pagos", payload);

        // Then create relationship with expediente
        // Need to use the expediente's objectId, not folioExpediente
        const appId = import.meta.env.VITE_BACKENDLESS_APP_ID || '5D4E4322-AD40-411D-BA2E-627770DB2B73';
        const apiKey = import.meta.env.VITE_BACKENDLESS_API_KEY || 'C2FF6422-711C-449C-BB07-646A3F037CC5';
        const userToken = localStorage.getItem('userToken');

        console.log('Creating relationship relacionExpediente with expediente objectId:', expediente.objectId);

        // Use :1 for 1:1 relationship, pass objectId not folioExpediente
        const relationResponse = await fetch(
          `https://knowingplant-us.backendless.app/api/${appId}/${apiKey}/data/Pagos/${newPago.objectId}/relacionExpediente:Expedientes:1`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'user-token': userToken || '',
            },
            body: JSON.stringify([expediente.objectId]),
          }
        );

        if (!relationResponse.ok) {
          const errorData = await relationResponse.json().catch(() => ({}));
          console.error('Error creating relationship:', errorData);
          throw new Error('Error al crear la relación con el expediente: ' + (errorData.message || 'Error desconocido'));
        }

        console.log('Relationship relacionExpediente created successfully');
      }

      // Toast is already shown by api.create/api.update in api.ts
      onSuccess();
    } catch (err: any) {
      console.error("❌ Error guardando pago:", err);
      toast({
        title: "Error",
        description: err.message || "No se pudo registrar el pago",
        variant: "destructive",
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
        <div className="grid grid-cols-1 gap-4">
          {/* Expediente Selector */}
          <FormField
            control={form.control}
            name="relacionExpediente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expediente</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!!pago?.objectId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un expediente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {expedientes.length === 0 ? (
                      <SelectItem value="no-disponible" disabled>
                        No hay expedientes con adeudo
                      </SelectItem>
                    ) : (
                      expedientes.map((exp: Expediente) => {
                        const clienteNombre = exp.relacionUsuarios?.nombre || exp.cliente || "Sin cliente";
                        const adeudo = adeudoMap.get(exp.folioExpediente) || 0;

                        return (
                          <SelectItem key={exp.objectId} value={exp.folioExpediente}>
                            {exp.folioExpediente} – {clienteNombre} (Adeudo: ${adeudo.toLocaleString('es-MX', { minimumFractionDigits: 2 })})
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Monto */}
          <FormField
            control={form.control}
            name="monto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Método de Pago */}
          <FormField
            control={form.control}
            name="metodoPago"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pago</FormLabel>
                <Select
                  onValueChange={(value) => {
                    console.log("🔵 Método de Pago seleccionado:", value);
                    field.onChange(value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un método" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DEBITO">Débito</SelectItem>
                    <SelectItem value="CREDITO">Crédito</SelectItem>
                    <SelectItem value="EFECTIVO EN VENTANILLA">
                      Efectivo en Ventanilla
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Moneda */}
          <FormField
            control={form.control}
            name="moneda"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <Select
                  onValueChange={(value) => {
                    console.log("💰 Moneda seleccionada:", value);
                    field.onChange(value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MXN">MXN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EU">EU</SelectItem>
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
                  placeholder="Notas adicionales..."
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
            {pago ? "Actualizar" : "Registrar"} Pago
          </Button>
        </div>
      </form>
    </Form>
  );
}
