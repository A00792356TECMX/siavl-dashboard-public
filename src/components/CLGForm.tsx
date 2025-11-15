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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { PDFUploader } from '@/components/PDFUploader';
import { Badge } from '@/components/ui/badge';
import { 
  calcularEstadoCLG, 
  calcularAdeudo, 
  formatearMoneda, 
  calcularSiguienteVersion,
  validarFechasCLG,
  fechaATimestamp 
} from '@/utils/clgHelpers';

const clgSchema = z.object({
  folioReal: z.string().min(1, 'Folio real requerido').max(100),
  numeroEntrada: z.string().min(1, 'Número de entrada requerido').max(100),
  fechaEmision: z.string().min(1, 'Fecha de emisión requerida'),
  fechaVencimiento: z.string().min(1, 'Fecha de vencimiento requerida'),
  relacionExpedientes: z.string().min(1, 'Expediente requerido'),
  qrUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

type CLGFormData = z.infer<typeof clgSchema>;

interface Expediente {
  objectId: string;
  folioExpediente: string;
  relacionUsuarios?: string;
  lote?: string;
  cliente?: string;
}

interface Pago {
  objectId: string;
  folioExpediente: string;
  monto: number;
}

interface Lote {
  objectId: string;
  numeroLote: string;
  precio: number;
}

interface Cliente {
  objectId: string;
  nombre: string;
}

interface CLG {
  objectId: string;
  version?: number;
  relacionExpedientes?: string;
}

interface CLGFormProps {
  certificado?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CLGForm({ certificado, onSuccess, onCancel }: CLGFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [expedientesConInfo, setExpedientesConInfo] = useState<Array<{
    expediente: Expediente;
    cliente: string;
    adeudo: number;
  }>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>('');
  const [versionCalculada, setVersionCalculada] = useState<number>(1);
  const [errorCarga, setErrorCarga] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<CLGFormData>({
    resolver: zodResolver(clgSchema),
    defaultValues: {
      folioReal: certificado?.folioReal || '',
      numeroEntrada: certificado?.numeroEntrada || '',
      fechaEmision: certificado?.fechaEmision 
        ? new Date(certificado.fechaEmision).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      fechaVencimiento: certificado?.fechaVencimiento 
        ? new Date(certificado.fechaVencimiento).toISOString().split('T')[0]
        : '',
      relacionExpedientes: certificado?.relacionExpedientes?.objectId || certificado?.relacionExpedientes || '',
      qrUrl: certificado?.qrUrl || '',
    },
  });

  useEffect(() => {
    loadData();
    if (certificado?.archivo) {
      const baseUrl = 'https://knowingplant-us.backendless.app/api/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';
      setCurrentPdfUrl(`${baseUrl}/files${certificado.archivo}`);
    }
  }, []);

  // Calcular versión cuando cambia el expediente seleccionado
  useEffect(() => {
    const subscription = form.watch((value) => {
      const expedienteId = value.relacionExpedientes;
      if (expedienteId && !certificado) {
        calcularVersion(expedienteId as string);
      } else if (certificado) {
        setVersionCalculada(certificado.version || 1);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, certificado]);

  const calcularVersion = async (expedienteId: string) => {
    try {
      // Obtener todos los CLGs del expediente
      const clgsExpediente = await api.getAll<CLG>('CLG');
      const clgsFiltrados = clgsExpediente.filter(
        (clg: CLG) => clg.relacionExpedientes === expedienteId
      );
      const siguienteVersion = calcularSiguienteVersion(clgsFiltrados);
      setVersionCalculada(siguienteVersion);
    } catch (error) {
      console.error('Error al calcular versión:', error);
      setVersionCalculada(1);
    }
  };

  const loadData = async () => {
    try {
      setLoadingData(true);
      setErrorCarga('');

      const [expedientesData, pagosData, lotesData, clientesData] = await Promise.all([
        api.getAll<Expediente>('Expedientes', { 
          where: 'activo = true',
        }).catch(() => []),
        api.getAll<Pago>('Pagos').catch(() => []),
        api.getAll<Lote>('Lotes').catch(() => []),
        api.getAll<Cliente>('Usuarios').catch(() => []),
      ]);

      if (expedientesData.length === 0) {
        setErrorCarga('No hay expedientes activos disponibles');
        setExpedientesConInfo([]);
        return;
      }

      // Crear mapas para búsqueda rápida
      const lotesById = new Map<string, Lote>();
      lotesData.forEach(l => lotesById.set(l.numeroLote, l));
      
      const clientesById = new Map<string, Cliente>();
      clientesData.forEach(c => clientesById.set(c.objectId, c));

      // Procesar expedientes con información completa
      const expedientesConDatos = expedientesData.map(exp => {
        // Obtener cliente
        const cliente = exp.relacionUsuarios 
          ? clientesById.get(exp.relacionUsuarios)?.nombre || exp.cliente || 'Sin cliente'
          : exp.cliente || 'Sin cliente';

        // Obtener lote y calcular adeudo
        const lote = exp.lote ? lotesById.get(exp.lote) : null;
        const precioLote = lote?.precio || 0;

        // Calcular pagos del expediente
        const pagosExpediente = pagosData
          .filter(p => p.folioExpediente === exp.folioExpediente)
          .map(p => p.monto || 0);

        const adeudo = calcularAdeudo(precioLote, pagosExpediente);

        return {
          expediente: exp,
          cliente,
          adeudo,
        };
      });

      setExpedientes(expedientesData);
      setExpedientesConInfo(expedientesConDatos);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setErrorCarga('Error al cargar los datos necesarios');
      toast({
        title: 'Error',
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

      // Validar que hay archivo si es nuevo
      if (!certificado && !selectedFile) {
        toast({
          title: 'Error',
          description: 'Debes cargar un archivo PDF',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Validar fechas
      const validacionFechas = validarFechasCLG(data.fechaEmision, data.fechaVencimiento);
      if (!validacionFechas.valido) {
        toast({
          title: 'Error',
          description: validacionFechas.mensaje,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Obtener expediente seleccionado
      const expedienteInfo = expedientesConInfo.find(
        e => e.expediente.objectId === data.relacionExpedientes
      );

      // Calcular estado automáticamente
      const estadoCalculado = calcularEstadoCLG(data.fechaVencimiento);

      // Preparar datos base
      const payload: any = {
        folioReal: data.folioReal.trim(),
        numeroEntrada: data.numeroEntrada.trim(),
        fechaEmision: fechaATimestamp(data.fechaEmision),
        fechaVencimiento: fechaATimestamp(data.fechaVencimiento),
        estado: estadoCalculado.estado,
        relacionExpedientes: data.relacionExpedientes,
        qrUrl: data.qrUrl?.trim() || '',
        version: versionCalculada,
      };

      // Si hay archivo nuevo, subirlo primero
      if (selectedFile) {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);

          const uploadResponse = await fetch(
            'https://knowingplant-us.backendless.app/api/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5/files/clg',
            {
              method: 'POST',
              headers: {
                'user-token': localStorage.getItem('userToken') || '',
              },
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            throw new Error('Error al subir el archivo');
          }

          const uploadData = await uploadResponse.json();
          payload.archivo = uploadData.fileURL || `/clg/${selectedFile.name}`;

          toast({
            title: 'Archivo subido',
            description: 'PDF cargado exitosamente',
          });
        } catch (uploadError) {
          console.error('Error al subir archivo:', uploadError);
          toast({
            title: 'Advertencia',
            description: 'Continuando sin subir el archivo. Verifica la configuración del servidor.',
            variant: 'destructive',
          });
        }
      }

      // Guardar o actualizar CLG
      if (certificado) {
        // Si se reemplaza el PDF, incrementar versión
        if (selectedFile) {
          payload.version = (certificado.version || 1) + 1;
        }
        await api.update('CLG', certificado.objectId, payload);
        toast({
          title: 'CLG Actualizado',
          description: `CLG v${payload.version} actualizado exitosamente`,
        });
      } else {
        await api.create('CLG', payload);
        toast({
          title: 'CLG Creado',
          description: `CLG v${versionCalculada} creado exitosamente`,
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error al guardar CLG:', error);
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

  if (errorCarga) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-foreground font-medium">{errorCarga}</p>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Expediente */}
        <FormField
          control={form.control}
          name="relacionExpedientes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Expediente <span className="text-destructive">*</span>
              </FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                disabled={loadingData || isLoading || !!certificado}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un expediente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expedientesConInfo.map(({ expediente, cliente, adeudo }) => (
                    <SelectItem key={expediente.objectId} value={expediente.objectId}>
                      {expediente.folioExpediente} – {cliente} (Adeudo: {formatearMoneda(adeudo)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {certificado && (
                <FormDescription className="text-xs text-muted-foreground">
                  No se puede cambiar el expediente de un CLG existente
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Archivo PDF */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Archivo PDF <span className="text-destructive">*</span>
          </label>
          <PDFUploader
            onFileSelect={setSelectedFile}
            currentFile={selectedFile}
            previewUrl={currentPdfUrl}
            disabled={isLoading}
            required={!certificado}
          />
          {certificado && (
            <p className="text-xs text-muted-foreground mt-2">
              Subir un nuevo archivo incrementará la versión automáticamente
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Folio Real */}
          <FormField
            control={form.control}
            name="folioReal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Folio Real <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="FR-2025-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Número de Entrada */}
          <FormField
            control={form.control}
            name="numeroEntrada"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Número de Entrada <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="ENT-2025-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha Emisión */}
          <FormField
            control={form.control}
            name="fechaEmision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Fecha de Emisión <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha Vencimiento */}
          <FormField
            control={form.control}
            name="fechaVencimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Fecha de Vencimiento <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Debe ser posterior a la fecha de emisión
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* QR URL */}
        <FormField
          control={form.control}
          name="qrUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL del QR (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                URL del código QR del certificado
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Versión (Solo lectura) */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Versión del CLG</p>
              <p className="text-xs text-muted-foreground mt-1">
                {certificado 
                  ? 'Versión actual del certificado' 
                  : 'Se asignará automáticamente al guardar'
                }
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              v{versionCalculada}
            </Badge>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>{certificado ? 'Actualizar CLG' : 'Crear CLG'}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
