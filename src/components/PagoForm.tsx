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
  relacionExpedientes: z.string().min(1, "Expediente requerido"),
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
  };
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
      relacionExpedientes: pago?.relacionExpedientes?.objectId || pago?.relacionExpedientes || "",
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
      const [expedientesData, pagosData, lotesData] = await Promise.all([
        api.getAll<Expediente>("Expedientes", { loadRelations: "relacionUsuarios" }),
        api.getAll<any>("Pagos"),
        api.getAll<any>("Lotes")
      ]);

      // Calculate total paid per expediente
      const pagosPorExpediente = new Map<string, number>();
      pagosData.forEach((p: any) => {
        // Exclude current pago if editing
        if (pago?.objectId && p.objectId === pago.objectId) return;
        
        const current = pagosPorExpediente.get(p.folioExpediente) || 0;
        pagosPorExpediente.set(p.folioExpediente, current + (p.monto || 0));
      });

      // Map lote prices by numeroLote
      const preciosPorLote = new Map<string, number>();
      lotesData.forEach((lote: any) => {
        preciosPorLote.set(lote.numeroLote, lote.precio || 0);
      });

      // Calculate adeudo for each expediente
      const adeudoPorExpediente = new Map<string, number>();
      expedientesData.forEach((exp: Expediente) => {
        const precioLote = preciosPorLote.get(exp.lote) || 0;
        const montoPagado = pagosPorExpediente.get(exp.folioExpediente) || 0;
        const adeudo = precioLote - montoPagado;
        adeudoPorExpediente.set(exp.objectId, adeudo);
      });

      // Filter expedientes with pending debt OR the current one being edited
      const expedientesConAdeudo = expedientesData.filter((exp: Expediente) => {
        const adeudo = adeudoPorExpediente.get(exp.objectId) || 0;
        return adeudo > 0 || (pago?.relacionExpedientes?.objectId === exp.objectId);
      });

      setExpedientes(expedientesConAdeudo);
      setAdeudoMap(adeudoPorExpediente);
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

      // Find the expediente data
      const expediente = expedientes.find((exp: Expediente) => exp.objectId === data.relacionExpedientes);

      if (!expediente) {
        toast({
          title: "Error",
          description: "Expediente no encontrado",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get the adeudo for this expediente
      const adeudo = adeudoMap.get(expediente.objectId) || 0;
      
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
        folioExpediente: expediente.folioExpediente,
        monto: nuevoMonto,
        metodoPago: data.metodoPago,
        moneda: data.moneda,
        referencia: referencia,
        relacionExpedientes: data.relacionExpedientes,
        observaciones: data.observaciones || "",
      };

      if (pago?.objectId) {
        await api.update("Pagos", pago.objectId, payload);
      } else {
        await api.create("Pagos", payload);
      }

      toast({
        title: "Éxito",
        description: "Pago registrado correctamente",
        className: "bg-green-50 border-green-200",
      });

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
            name="relacionExpedientes"
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
                        const adeudo = adeudoMap.get(exp.objectId) || 0;

                        return (
                          <SelectItem key={exp.objectId} value={exp.objectId}>
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
