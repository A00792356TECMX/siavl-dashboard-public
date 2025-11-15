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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Upload } from 'lucide-react';
import { 
  calcularAdeudo, 
  formatearMoneda, 
  calcularSiguienteVersion,
  validarArchivo 
} from '@/utils/documentoHelpers';

const documentoSchema = z.object({
  tipo: z.string().min(1, 'Tipo de documento requerido'),
  relacionExpedientes: z.string().min(1, 'Expediente requerido'),
  observaciones: z.string().optional(),
});

type DocumentoFormData = z.infer<typeof documentoSchema>;

interface Expediente {
  objectId: string;
  folioExpediente: string;
  relacionUsuarios?: {
    objectId: string;
    nombre: string;
  };
  relacionLotes?: {
    precio: number;
  };
}

interface Pago {
  monto: number;
  relacionExpedientes?: {
    objectId: string;
  };
}

interface DocumentoFormProps {
  documento?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const TIPOS_DOCUMENTO = [
  'Contrato',
  'Escritura',
  'Acuse',
  'CLG',
  'Identificación',
  'Comprobante',
  'Otro',
];

export function DocumentoForm({ documento, onSuccess, onCancel }: DocumentoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [adeudosMap, setAdeudosMap] = useState<Map<string, number>>(new Map());
  const [loadingData, setLoadingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string>('');
  const [version, setVersion] = useState<number>(1);
  const [allDocumentos, setAllDocumentos] = useState<any[]>([]);
  
  const { toast } = useToast();

  const form = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      tipo: documento?.tipo || '',
      relacionExpedientes: documento?.relacionExpedientes?.objectId || '',
      observaciones: documento?.observaciones || '',
    },
  });

  const selectedExpedienteId = form.watch('relacionExpedientes');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (documento?.url) {
      setExistingFileUrl(documento.url);
      setVersion(documento.version || 1);
    }
  }, [documento]);

  useEffect(() => {
    if (selectedExpedienteId && allDocumentos.length > 0) {
      const nextVersion = calcularSiguienteVersion(allDocumentos, selectedExpedienteId);
      setVersion(nextVersion);
    }
  }, [selectedExpedienteId, allDocumentos]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      const [expedientesData, pagosData, documentosData] = await Promise.all([
        api.getAll<Expediente>('Expedientes', {
          loadRelations: 'relacionUsuarios,relacionLotes'
        }).catch(() => []),
        api.getAll<Pago>('Pagos', {
          loadRelations: 'relacionExpedientes'
        }).catch(() => []),
        api.getAll<any>('Documentos').catch(() => []),
      ]);

      setAllDocumentos(documentosData);

      // Calcular adeudo para cada expediente
      const adeudos = new Map<string, number>();
      expedientesData.forEach(exp => {
        const precioLote = exp.relacionLotes?.precio || 0;
        const pagosFiltrados = pagosData.filter(
          p => p.relacionExpedientes?.objectId === exp.objectId
        );
        const montoPagado = pagosFiltrados.reduce((sum, p) => sum + (p.monto || 0), 0);
        const adeudo = calcularAdeudo(precioLote, montoPagado);
        adeudos.set(exp.objectId, adeudo);
      });

      setExpedientes(expedientesData);
      setAdeudosMap(adeudos);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos necesarios',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const userToken = localStorage.getItem('user-token');
    const appId = import.meta.env.VITE_BACKENDLESS_APP_ID;
    const apiKey = import.meta.env.VITE_BACKENDLESS_API_KEY;

    const response = await fetch(
      `https://api.backendless.com/${appId}/${apiKey}/files/documentos/${file.name}`,
      {
        method: 'POST',
        headers: {
          'user-token': userToken || '',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Error al subir el archivo');
    }

    const data = await response.json();
    return data.fileURL;
  };

  const onSubmit = async (data: DocumentoFormData) => {
    try {
      setIsLoading(true);

      // Validar archivo solo si es creación o si se cambió el archivo
      if (!documento && !selectedFile) {
        toast({
          title: 'Error',
          description: 'Debes seleccionar un archivo',
          variant: 'destructive',
        });
        return;
      }

      let fileUrl = existingFileUrl;
      let fileData: any = {};

      // Subir archivo solo si hay uno nuevo
      if (selectedFile) {
        const validacion = validarArchivo(selectedFile);
        if (!validacion.valido) {
          toast({
            title: 'Error',
            description: validacion.mensaje,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Subiendo archivo...',
          description: 'Por favor espera',
        });

        fileUrl = await uploadFile(selectedFile);
        
        fileData = {
          archivo: fileUrl,
          nombreArchivo: selectedFile.name,
          nombreOriginal: selectedFile.name,
          extension: selectedFile.name.split('.').pop() || '',
          tamanoKB: Math.round(selectedFile.size / 1024),
          url: fileUrl,
        };

        // Si es edición y se cambió el archivo, incrementar versión
        if (documento) {
          fileData.version = (documento.version || 1) + 1;
        }
      }

      const expedienteSeleccionado = expedientes.find(
        exp => exp.objectId === data.relacionExpedientes
      );

      const documentoData = {
        tipo: data.tipo,
        estadoDocumento: 'Activo',
        expedienteFolio: expedienteSeleccionado?.folioExpediente || '',
        observaciones: data.observaciones || '',
        version: documento ? (selectedFile ? fileData.version : documento.version) : version,
        ...fileData,
      };

      if (documento) {
        await api.update('Documentos', documento.objectId, documentoData);
        toast({
          title: 'Éxito',
          description: 'Documento actualizado correctamente',
        });
      } else {
        const nuevoDocumento: any = await api.create('Documentos', documentoData);
        
        // Crear relación con expediente
        await fetch(
          `https://api.backendless.com/${import.meta.env.VITE_BACKENDLESS_APP_ID}/${import.meta.env.VITE_BACKENDLESS_API_KEY}/data/Documentos/${nuevoDocumento.objectId}/relacionExpedientes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'user-token': localStorage.getItem('user-token') || '',
            },
            body: JSON.stringify([data.relacionExpedientes]),
          }
        );

        toast({
          title: 'Éxito',
          description: 'Documento creado correctamente',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el documento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validacion = validarArchivo(file);
      if (!validacion.valido) {
        toast({
          title: 'Error',
          description: validacion.mensaje,
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Archivo */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Archivo {!documento && <span className="text-destructive">*</span>}
          </label>
          <div className="border-2 border-dashed rounded-lg p-4">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="w-full"
              disabled={isLoading}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Archivo seleccionado: {selectedFile.name}
              </p>
            )}
            {existingFileUrl && !selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Archivo actual: <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver archivo</a>
              </p>
            )}
          </div>
        </div>

        {/* Tipo de Documento */}
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Documento *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
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
              <FormLabel>Expediente *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading || !!documento}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un expediente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expedientes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                      No hay expedientes disponibles
                    </div>
                  ) : (
                    expedientes.map((exp) => {
                      const adeudo = adeudosMap.get(exp.objectId) || 0;
                      return (
                        <SelectItem key={exp.objectId} value={exp.objectId}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{exp.folioExpediente}</span>
                            <span className="text-muted-foreground">–</span>
                            <span>{exp.relacionUsuarios?.nombre || 'Sin cliente'}</span>
                            <Badge variant={adeudo > 0 ? 'destructive' : 'default'} className="ml-2">
                              Adeudo: {formatearMoneda(adeudo)}
                            </Badge>
                          </div>
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

        {/* Versión (solo lectura) */}
        {selectedExpedienteId && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Versión</label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-base px-4 py-2">
                Versión {version}
              </Badge>
              {version > 1 && (
                <span className="text-sm text-muted-foreground">
                  (Este expediente ya tiene {version - 1} documento(s) previo(s))
                </span>
              )}
            </div>
          </div>
        )}

        {/* Observaciones */}
        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Notas adicionales sobre el documento..."
                  className="min-h-[100px] resize-none"
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botones */}
        <div className="flex justify-end gap-3">
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
              <>{documento ? 'Actualizar' : 'Crear'} Documento</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
