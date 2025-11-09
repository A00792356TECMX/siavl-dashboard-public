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
  folioExpediente: z.string().min(1, "Folio requerido"),
  monto: z
    .string()
    .min(1, "Monto requerido")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Debe ser un monto válido mayor a 0"
    ),
  metodoPago: z.string().nonempty("Método de pago requerido"),
  moneda: z.string().nonempty("Moneda requerida"),
  referencia: z.string().optional(),
  relacionExpedientes: z.string().optional(),
  observaciones: z.string().optional(),
});

type PagoFormData = z.infer<typeof pagoSchema>;

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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expedientes, setExpedientes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expedientesPagos, setExpedientesPagos] = useState<Map<string, number>>(new Map());
  const [lotesPrecios, setLotesPrecios] = useState<Map<string, number>>(new Map());

  const form = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      folioExpediente: pago?.folioExpediente || "",
      monto: pago?.monto?.toString() || "",
      metodoPago: pago?.metodoPago || "",
      moneda: pago?.moneda || "",
      referencia: pago?.referencia || "",
      relacionExpedientes:
        pago?.relacionExpedientes?.objectId ||
        pago?.relacionExpedientes ||
        "none",
      observaciones: pago?.observaciones || "",
    },
  });

  useEffect(() => {
    loadExpedientes();
  }, []);

  const loadExpedientes = async () => {
    try {
      setLoadingData(true);

      // Load all data in parallel
      const [expedientesData, pagosData, lotesData] = await Promise.all([
        api.getAll<any>("Expedientes"),
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

      // Map lote prices
      const preciosPorLote = new Map<string, number>();
      lotesData.forEach((l: any) => {
        preciosPorLote.set(l.numeroLote, l.precio || 0);
      });

      // Filter expedientes with pending debt
      const expedientesConAdeudo = expedientesData.filter((exp: any) => {
        const precioLote = preciosPorLote.get(exp.lote) || 0;
        const montoPagado = pagosPorExpediente.get(exp.folioExpediente) || 0;
        const adeudo = precioLote - montoPagado;

        // Include if has debt OR is the current expediente (when editing)
        return adeudo > 0 || (pago?.folioExpediente === exp.folioExpediente);
      });

      setExpedientes(expedientesConAdeudo);
      setExpedientesPagos(pagosPorExpediente);
      setLotesPrecios(preciosPorLote);
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

  const onSubmit = async (data: PagoFormData) => {
    try {
      setIsLoading(true);

      console.log("📋 Form data received:", data);

      // Find the expediente data
      const expediente = expedientes.find((exp: any) => exp.folioExpediente === data.folioExpediente);

      if (!expediente) {
        toast({
          title: "Error",
          description: "Expediente no encontrado",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Calculate current debt and validate amount
      const precioLote = lotesPrecios.get(expediente.lote) || 0;
      const montoPagado = expedientesPagos.get(data.folioExpediente) || 0;
      const adeudoActual = precioLote - montoPagado;
      const nuevoMonto = parseFloat(data.monto);

      if (nuevoMonto > adeudoActual) {
        toast({
          title: "Error",
          description: `El monto excede el adeudo. Adeudo pendiente: $${adeudoActual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const payload = {
        folioExpediente: data.folioExpediente,
        monto: nuevoMonto,
        metodoPago: data.metodoPago, // Send as string, not array
        moneda: data.moneda, // Send as string, not array
        referencia: data.referencia || "",
        relacionExpedientes:
          data.relacionExpedientes === "none"
            ? null
            : data.relacionExpedientes,
        observaciones: data.observaciones || "",
      };

      console.log("✅ Payload final enviado:", payload);

      if (pago?.objectId) {
        await api.update("Pagos", pago.objectId, payload);
        // Success toast already shown in apiRequest
      } else {
        await api.create("Pagos", payload);
        // Success toast already shown in apiRequest
      }

      onSuccess();
    } catch (err) {
      console.error("❌ Error guardando pago:", err);
      // Error toast already shown in apiRequest
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
          {/* Folio Expediente */}
          <FormField
            control={form.control}
            name="folioExpediente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expediente</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar expediente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {expedientes.length === 0 ? (
                      <SelectItem value="no-disponible" disabled>
                        No hay expedientes con adeudo
                      </SelectItem>
                    ) : (
                      expedientes.map((exp: any) => {
                        const precioLote = lotesPrecios.get(exp.lote) || 0;
                        const montoPagado = expedientesPagos.get(exp.folioExpediente) || 0;
                        const adeudo = precioLote - montoPagado;

                        return (
                          <SelectItem key={exp.objectId} value={exp.folioExpediente}>
                            {exp.folioExpediente} - {exp.cliente} (Adeudo: ${adeudo.toLocaleString('es-MX', { minimumFractionDigits: 2 })})
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

          {/* Expediente Asociado - Hidden to avoid confusion */}
          <FormField
            control={form.control}
            name="relacionExpedientes"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormLabel>Expediente Asociado</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un expediente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {expedientes.map((exp) => (
                      <SelectItem key={exp.objectId} value={exp.objectId}>
                        {exp.numeroExpediente}
                        {exp.clienteNombre && ` - ${exp.clienteNombre}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Referencia */}
          <FormField
            control={form.control}
            name="referencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Número de referencia o transacción"
                    {...field}
                  />
                </FormControl>
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
