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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  nombre: z.string().min(1, 'Nombre requerido').max(200),
  tipo: z.enum(['contrato', 'escritura', 'identificacion', 'comprobante', 'otro'], {
    required_error: 'Tipo de documento requerido',
  }),
  expedienteId: z.string().optional(),
  descripcion: z.string().max(1000).optional(),
});

type DocumentoFormData = z.infer<typeof documentoSchema>;

interface Expediente {
  objectId: string;
  numeroExpediente: string;
  clienteNombre?: string;
}

interface DocumentoFormProps {
  documento?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DocumentoForm({ documento, onSuccess, onCancel }: DocumentoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<DocumentoFormData>({
    resolver: zodResolver(documentoSchema),
    defaultValues: {
      nombre: documento?.nombre || '',
      tipo: documento?.tipo || 'otro',
      expedienteId: documento?.expedienteId || '',
      descripcion: documento?.descripcion || '',
    },
  });

  useEffect(() => {
    loadExpedientes();
  }, []);

  const loadExpedientes = async () => {
    try {
      setLoadingData(true);
      const data = await api.getAll<Expediente>('Expedientes').catch(() => []);
      setExpedientes(data);
    } catch (error) {
      toast({
        title: 'Advertencia',
        description: 'Error al cargar expedientes',
        variant: 'destructive',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'El archivo no debe superar los 10MB',
          variant: 'destructive',
        });
        return;
      }

      // Validate file type (PDF, DOC, DOCX, JPG, PNG)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Solo se permiten archivos PDF, DOC, DOCX, JPG o PNG',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      
      // Auto-fill nombre if empty
      if (!form.getValues('nombre')) {
        form.setValue('nombre', file.name);
      }
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const API_BASE_URL = 'https://api.backendless.com/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';
    const userToken = localStorage.getItem('userToken');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/files/documentos/${file.name}`, {
      method: 'POST',
      headers: {
        'user-token': userToken || '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al subir el archivo');
    }

    const data = await response.json();
    return data.fileURL;
  };

  const onSubmit = async (data: DocumentoFormData) => {
    try {
      setIsLoading(true);
      
      let archivoUrl = documento?.archivoUrl;
      let tamanio = documento?.tamanio;

      // Upload file if new file selected
      if (selectedFile) {
        setIsUploading(true);
        try {
          archivoUrl = await uploadFile(selectedFile);
          tamanio = selectedFile.size;
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Error al subir el archivo',
            variant: 'destructive',
          });
          setIsUploading(false);
          setIsLoading(false);
          return;
        }
        setIsUploading(false);
      }

      const payload = {
        ...data,
        archivoUrl,
        tamanio,
        fechaSubida: new Date().getTime(),
      };

      if (documento?.objectId) {
        await api.update('Documentos', documento.objectId, payload);
        toast({
          title: 'Éxito',
          description: 'Documento actualizado correctamente',
        });
      } else {
        if (!archivoUrl) {
          toast({
            title: 'Error',
            description: 'Debes seleccionar un archivo',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        
        await api.create('Documentos', payload);
        toast({
          title: 'Éxito',
          description: 'Documento subido correctamente',
        });
      }
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al guardar el documento',
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload */}
        {!documento && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Archivo *</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
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
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos permitidos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Documento</FormLabel>
                <FormControl>
                  <Input placeholder="Contrato de compraventa..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Documento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="escritura">Escritura</SelectItem>
                    <SelectItem value="identificacion">Identificación</SelectItem>
                    <SelectItem value="comprobante">Comprobante</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expedienteId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Expediente (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Asociar con un expediente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {expedientes.map((expediente) => (
                      <SelectItem key={expediente.objectId} value={expediente.objectId}>
                        {expediente.numeroExpediente}
                        {expediente.clienteNombre && ` - ${expediente.clienteNombre}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Vincula este documento con un expediente específico
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detalles adicionales sobre el documento..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isUploading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || isUploading}>
            {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Subiendo...' : documento ? 'Actualizar' : 'Subir Documento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
