import { useEffect, useState, useRef } from 'react';
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
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, File } from 'lucide-react';

const documentoSchema = z.object({
  tipo: z.string().min(1, 'Tipo de documento requerido'),
  relacionExpedientes: z.string().min(1, 'Expediente requerido'),
  relacionClientes: z.string().min(1, 'Cliente requerido'),
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
  montoPorPagar?: number;
}

interface Cliente {
  objectId: string;
  nombre: string;
}

interface Lote {
  objectId: string;
  numeroLote: string;
  precio: number;
}

interface Pago {
  monto: number;
  relacionExpedientes: {
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

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

export function DocumentoForm({ documento, onSuccess, onCancel }: DocumentoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      tipo: documento?.tipo || '',
      relacionExpedientes: documento?.relacionExpedientes?.objectId || '',
      relacionClientes: documento?.relacionClientes?.objectId || '',
      observaciones: documento?.observaciones || '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      const [expedientesData, pagosData, lotesData, clientesData] = await Promise.all([
        api.getAll<Expediente>('Expedientes', {
          loadRelations: 'relacionUsuarios',
        }).catch(() => []),
        api.getAll<Pago>('Pagos').catch(() => []),
        api.getAll<Lote>('Lotes').catch(() => []),
        api.getAll<Cliente>('Usuarios').catch(() => []),
      ]);

      const expedientesConAdeudo = expedientesData.map(exp => {
        const pagosFiltrados = pagosData.filter(
          p => p.relacionExpedientes?.objectId === exp.objectId
        );
        const montoPagado = pagosFiltrados.reduce((sum, p) => sum + (p.monto || 0), 0);
        const loteAsociado = lotesData.find(l => l.numeroLote === exp.folioExpediente?.split('-')[1]);
        const precioLote = loteAsociado?.precio || 0;
        const adeudo = precioLote - montoPagado;

        return {
          ...exp,
          montoPorPagar: adeudo,
        };
      });

      setExpedientes(expedientesConAdeudo);
      setClientes(clientesData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar datos',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > MAX_FILE_SIZE_MB) {
      toast({
        title: 'Error',
        description: `El archivo no debe superar los ${MAX_FILE_SIZE_MB}MB`,
        variant: 'destructive',
      });
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      toast({
        title: 'Error',
        description: `Solo se permiten archivos: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/files`,
        {
          method: 'POST',
          headers: {
            'user-token': localStorage.getItem('user-token') || '',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Error al subir archivo');
      }

      const data = await response.json();
      return data.fileURL;
    } catch (error) {
      throw new Error('Error al subir el archivo');
    }
  };

  const onSubmit = async (data: DocumentoFormData) => {
    if (!documento && !selectedFile) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un archivo',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      let fileUrl = documento?.url;
      let nombreOriginal = documento?.nombreOriginal;
      let nombreArchivo = documento?.nombreArchivo;
      let extension = documento?.extension;
      let tamanoKB = documento?.tamanoKB;
      let version = documento?.version || 1;

      if (selectedFile) {
        setIsUploading(true);
        fileUrl = await uploadFile(selectedFile);
        setIsUploading(false);

        nombreOriginal = selectedFile.name;
        extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
        tamanoKB = Math.round(selectedFile.size / 1024);
        
        if (documento) {
          version = (documento.version || 1) + 1;
          
          await api.update('Documentos', documento.objectId, {
            estadoDocumento: 'Reemplazado',
          });
        }
      }

      const expedienteSeleccionado = expedientes.find(
        e => e.objectId === data.relacionExpedientes
      );

      if (!nombreArchivo || selectedFile) {
        const timestamp = new Date().getTime();
        nombreArchivo = `${data.tipo}_${expedienteSeleccionado?.folioExpediente || 'DOC'}_${timestamp}`;
      }

      const documentoData = {
        nombreArchivo,
        nombreOriginal,
        tipo: data.tipo,
        extension,
        tamanoKB,
        estadoDocumento: documento && selectedFile ? 'Activo' : (documento?.estadoDocumento || 'Activo'),
        version,
        url: fileUrl,
        expedienteFolio: expedienteSeleccionado?.folioExpediente || '',
        observaciones: data.observaciones || '',
        relacionExpedientes: data.relacionExpedientes,
        relacionClientes: data.relacionClientes,
      };

      if (documento && !selectedFile) {
        await api.update('Documentos', documento.objectId, documentoData);
        toast({
          title: 'Éxito',
          description: 'Documento actualizado correctamente',
        });
      } else {
        await api.create('Documentos', documentoData);
        toast({
          title: 'Éxito',
          description: selectedFile && documento 
            ? 'Nueva versión creada correctamente' 
            : 'Documento subido correctamente',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al guardar el documento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!documento && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Archivo <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? selectedFile.name : 'Seleccionar archivo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>
                  {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos permitidos: PDF, JPG, PNG (máx. {MAX_FILE_SIZE_MB}MB)
            </p>
          </div>
        )}

        {documento && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Reemplazar archivo (opcional)
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? selectedFile.name : 'Seleccionar nuevo archivo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>
                  {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Si selecciona un archivo nuevo, se creará una nueva versión
            </p>
          </div>
        )}

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
                disabled={loadingData || isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un expediente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expedientes.map((exp) => (
                    <SelectItem key={exp.objectId} value={exp.objectId}>
                      {exp.folioExpediente} – {exp.relacionUsuarios?.nombre || 'Sin cliente'}{' '}
                      (Adeudo: ${(exp.montoPorPagar || 0).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="relacionClientes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Cliente <span className="text-destructive">*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={loadingData || isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.objectId} value={cliente.objectId}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Tipo de documento <span className="text-destructive">*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo" />
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

        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre el documento..."
                  className="resize-none"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading || isUploading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || isUploading}>
            {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Subiendo archivo...' : documento ? 'Guardar cambios' : 'Subir documento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
