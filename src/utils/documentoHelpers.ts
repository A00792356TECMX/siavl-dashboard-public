/**
 * Helpers para el módulo de Documentos
 */

export interface AdeudoInfo {
  precioLote: number;
  pagosRealizados: number;
  adeudo: number;
}

/**
 * Calcula el adeudo de un expediente
 */
export function calcularAdeudo(
  precioLote: number,
  pagosRealizados: number
): number {
  return Math.max(0, precioLote - pagosRealizados);
}

/**
 * Formatea una cantidad de dinero
 */
export function formatearMoneda(cantidad: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(cantidad);
}

/**
 * Calcula la siguiente versión de un documento
 */
export function calcularSiguienteVersion(documentosExistentes: any[], expedienteId: string): number {
  const documentosDelExpediente = documentosExistentes.filter(
    (doc) => doc.relacionExpedientes?.objectId === expedienteId
  );
  
  if (documentosDelExpediente.length === 0) return 1;
  
  const versionesExistentes = documentosDelExpediente
    .map((doc) => doc.version || 1)
    .filter((v) => !isNaN(v));
  
  return versionesExistentes.length > 0 
    ? Math.max(...versionesExistentes) + 1 
    : 1;
}

/**
 * Valida que un archivo sea válido
 */
export function validarArchivo(file: File): { valido: boolean; mensaje?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
  ];

  if (!file) {
    return { valido: false, mensaje: 'No se ha seleccionado ningún archivo' };
  }

  if (file.size > MAX_SIZE) {
    return { valido: false, mensaje: `El archivo no debe superar los 10MB (tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB)` };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valido: false, mensaje: `Tipo de archivo no permitido: ${file.type}. Solo se permiten PDF, imágenes y documentos de Word` };
  }

  return { valido: true };
}

/**
 * Obtiene un icono según el tipo de documento
 */
export function getDocumentoIcon(tipo: string): string {
  const iconMap: Record<string, string> = {
    'Contrato': 'FileText',
    'Escritura': 'FileSignature',
    'Acuse': 'FileCheck',
    'CLG': 'FileShield',
    'Identificación': 'IdCard',
    'Comprobante': 'Receipt',
    'Otro': 'File',
  };
  return iconMap[tipo] || 'File';
}

/**
 * Obtiene el color del badge según el estado
 */
export function getEstadoColor(estado: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (estado) {
    case 'Activo':
      return 'default';
    case 'Inactivo':
      return 'secondary';
    case 'Eliminado':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Formatea el tamaño del archivo
 */
export function formatearTamano(tamanoKB: number): string {
  if (tamanoKB < 1024) {
    return `${tamanoKB.toFixed(1)} KB`;
  }
  return `${(tamanoKB / 1024).toFixed(2)} MB`;
}
