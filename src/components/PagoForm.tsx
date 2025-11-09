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
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      folioExpediente: pago?.folioExpediente || "",
      monto: pago?.monto?.toString() || "",
      metodoPago: Array.isArray(pago?.metodoPago)
        ? pago.metodoPago[0]
        : pago?.metodoPago || "",
      moneda: Array.isArray(pago?.moneda)
        ? pago.moneda[0]
        : pago?.moneda || "",
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
      const data = await api.getAll<Expediente>("Expedientes");
      setExpedientes(data);
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

      const payload = {
        folioExpediente: data.folioExpediente,
        monto: parseFloat(data.monto),
        metodoPago: [data.metodoPago],
        moneda: [data.moneda],
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
        toast({
          title: "Actualizado",
          description: "Pago actualizado correctamente",
        });
      } else {
        await api.create("Pagos", payload);
        toast({
          title: "Creado",
          description: "Pago registrado correctamente",
        });
      }

      onSuccess();
    } catch (err) {
      console.error("❌ Error guardando pago:", err);
      toast({
        title: "Error",
        description: "No se pudo guardar el pago",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Folio */}
          <FormField
            control={form.control}
            name="folioExpediente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folio</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. 001" {...field} />
                </FormControl>
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
                  onValueChange={(val) => field.onChange(val)}
                  value={field.value || ""}
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
                  onValueChange={(val) => field.onChange(val)}
                  value={field.value || ""}
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

          {/* Expediente */}
          <FormField
            control={form.control}
            name="relacionExpedientes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expediente Asociado</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(val)}
                  value={field.value || "none"}
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
