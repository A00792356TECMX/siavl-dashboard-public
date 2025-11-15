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
import { Loader2, AlertCircle } from 'lucide-react';
import { PDFUploader } from '@/components/PDFUploader';
import {
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
  relacionUsuarios?: string;
  cliente?: string;
}

interface Cliente {
  objectId: string;
  nombre: string;
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
  const [expedientesConInfo, setExpedientesConInfo] = useState<Array<{
    expediente: Expediente;
    cliente: string;
  }>>([]);
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
    if (documento?.archivo) {
      const baseUrl = 'https://knowingplant-us.backendless.app/api/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';
      setExistingFileUrl(`${baseUrl}/files${documento.archivo}`);
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

      const [expedientesData, documentosData, clientesData] = await Promise.all([
        api.getAll<Expediente>('Expedientes').catch(() => []),
        api.getAll<any>('Documentos').catch(() => []),
        api.getAll<Cliente>('Usuarios').catch(() => []),
      ]);

      setAllDocumentos(documentosData);

      // Crear mapa para búsqueda rápida de clientes
      const clientesById = new Map<string, Cliente>();
      clientesData.forEach(c => clientesById.set(c.objectId, c));

      // Procesar expedientes con información completa
      const expedientesConDatos = expedientesData.map((exp: Expediente) => {
        // Obtener cliente
        const cliente = exp.relacionUsuarios
          ? clientesById.get(exp.relacionUsuarios)?.nombre || exp.cliente || 'Sin cliente'
          : exp.cliente || 'Sin cliente';

        return {
          expediente: exp,
          cliente,
        };
      });

      setExpedientesConInfo(expedientesConDatos);

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

  const uploadFile = async (file: File, expedienteFolio: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const userToken = localStorage.getItem('userToken');
    const appId = import.meta.env.VITE_BACKENDLESS_APP_ID || '5D4E4322-AD40-411D-BA2E-627770DB2B73';
    const apiKey = import.meta.env.VITE_BACKENDLESS_API_KEY || 'C2FF6422-711C-449C-BB07-646A3F037CC5';

    // Create unique filename: expediente_timestamp_originalname
    const timestamp = Date.now();
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    const baseFileName = file.name.substring(0, file.name.lastIndexOf('.'));
    const uniqueFileName = `${expedienteFolio}_${timestamp}_${baseFileName}${fileExtension}`;

    const response = await fetch(
      `https://knowingplant-us.backendless.app/api/${appId}/${apiKey}/files/documentos/${uniqueFileName}`,
      {
        method: 'POST',
        headers: {
          'user-token': userToken || '',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error al subir archivo:', errorData);
      throw new Error(errorData.message || 'Error al subir el archivo');
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

      // Obtener expediente info primero (necesario para nombre de archivo único)
      const expedienteInfo = expedientesConInfo.find(
        ({ expediente }) => expediente.objectId === data.relacionExpedientes
      );

      if (!expedienteInfo) {
        toast({
          title: 'Error',
          description: 'Expediente no encontrado',
          variant: 'destructive',
        });
        return;
      }

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

        fileUrl = await uploadFile(selectedFile, expedienteInfo.expediente.folioExpediente);
        
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

      const documentoData = {
        tipo: data.tipo,
        estadoDocumento: 'Activo',
        expedienteFolio: expedienteInfo?.expediente.folioExpediente || '',
        observaciones: data.observaciones || '',
        version: documento ? (selectedFile ? fileData.version : documento.version) : version,
        ...fileData,
      };

      if (documento) {
        await api.update('Documentos', documento.objectId, documentoData);
      } else {
        console.log('Creating document with data:', documentoData);
        const nuevoDocumento: any = await api.create('Documentos', documentoData);
        console.log('Document created:', nuevoDocumento);

        // Crear relación con expediente
        const appId = import.meta.env.VITE_BACKENDLESS_APP_ID || '5D4E4322-AD40-411D-BA2E-627770DB2B73';
        const apiKey = import.meta.env.VITE_BACKENDLESS_API_KEY || 'C2FF6422-711C-449C-BB07-646A3F037CC5';

        console.log('Creating relationship with expediente:', data.relacionExpedientes);
        const relationResponse = await fetch(
          `https://knowingplant-us.backendless.app/api/${appId}/${apiKey}/data/Documentos/${nuevoDocumento.objectId}/relacionExpedientes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'user-token': localStorage.getItem('userToken') || '',
            },
            body: JSON.stringify([data.relacionExpedientes]),
          }
        );

        if (!relationResponse.ok) {
          const errorData = await relationResponse.json().catch(() => ({}));
          console.error('Error creating relationship:', errorData);
          throw new Error('Error al crear la relación con el expediente: ' + (errorData.message || 'Error desconocido'));
        }

        console.log('Relationship created successfully');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error al guardar documento:', error);

      // Provide more specific error message
      let errorMessage = 'No se pudo guardar el documento';
      if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
        {/* Archivo con Preview */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Archivo {!documento && <span className="text-destructive">*</span>}
          </label>
          <PDFUploader
            onFileSelect={setSelectedFile}
            currentFile={selectedFile}
            previewUrl={existingFileUrl}
            disabled={isLoading}
            required={!documento}
            acceptedTypes=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            pdfOnly={false}
          />
          {documento && (
            <p className="text-xs text-muted-foreground mt-2">
              Subir un nuevo archivo incrementará la versión automáticamente
            </p>
          )}
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
                  {expedientesConInfo.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                      No hay expedientes disponibles
                    </div>
                  ) : (
                    expedientesConInfo.map(({ expediente, cliente }) => (
                      <SelectItem key={expediente.objectId} value={expediente.objectId}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{expediente.folioExpediente}</span>
                          <span className="text-muted-foreground">–</span>
                          <span>{cliente}</span>
                        </div>
                      </SelectItem>
                    ))
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
