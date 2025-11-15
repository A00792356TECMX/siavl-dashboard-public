/**
 * CLG Helper Functions
 * Funciones auxiliares para el módulo de Certificados de Libertad de Gravamen
 */

export interface EstadoCLG {
  estado: 'Vigente' | 'Por Vencer' | 'Vencido' | 'Error';
  color: string;
  bgColor: string;
}

/**
 * Calcula el estado de un CLG basado en la fecha de vencimiento
 */
export function calcularEstadoCLG(fechaVencimiento: string | number): EstadoCLG {
  if (!fechaVencimiento) {
    return {
      estado: 'Error',
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaVenc = new Date(typeof fechaVencimiento === 'number' ? fechaVencimiento : fechaVencimiento);
  fechaVenc.setHours(0, 0, 0, 0);

  const diasRestantes = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  // Vencido
  if (diasRestantes < 0) {
    return {
      estado: 'Vencido',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    };
  }

  // Por vencer (≤ 10 días)
  if (diasRestantes <= 10) {
    return {
      estado: 'Por Vencer',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    };
  }

  // Vigente
  return {
    estado: 'Vigente',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  };
}

/**
 * Calcula el adeudo de un expediente
 * @param precioLote - Precio total del lote
 * @param pagosRealizados - Array de pagos realizados
 */
export function calcularAdeudo(precioLote: number, pagosRealizados: number[]): number {
  const totalPagado = pagosRealizados.reduce((sum, pago) => sum + pago, 0);
  const adeudo = precioLote - totalPagado;
  return Math.max(0, adeudo); // No puede ser negativo
}

/**
 * Formatea un número como moneda mexicana
 */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

/**
 * Calcula la próxima versión para un CLG de un expediente
 * @param clgsDelExpediente - Array de CLGs existentes del mismo expediente
 */
export function calcularSiguienteVersion(clgsDelExpediente: Array<{ version?: number }>): number {
  if (!clgsDelExpediente || clgsDelExpediente.length === 0) {
    return 1;
  }

  const versionesExistentes = clgsDelExpediente
    .map(clg => clg.version || 0)
    .filter(v => v > 0);

  if (versionesExistentes.length === 0) {
    return 1;
  }

  return Math.max(...versionesExistentes) + 1;
}

/**
 * Valida que las fechas de un CLG sean correctas
 */
export function validarFechasCLG(fechaEmision: string | Date, fechaVencimiento: string | Date): {
  valido: boolean;
  mensaje?: string;
} {
  const emision = new Date(fechaEmision);
  const vencimiento = new Date(fechaVencimiento);
  const hoy = new Date();

  // Validar que las fechas sean válidas
  if (isNaN(emision.getTime()) || isNaN(vencimiento.getTime())) {
    return {
      valido: false,
      mensaje: 'Las fechas ingresadas no son válidas',
    };
  }

  // Validar que emisión sea antes de vencimiento
  if (emision >= vencimiento) {
    return {
      valido: false,
      mensaje: 'La fecha de emisión debe ser anterior a la fecha de vencimiento',
    };
  }

  // Validar que el vencimiento no sea más de 1 año en el pasado
  const unAñoAtras = new Date();
  unAñoAtras.setFullYear(unAñoAtras.getFullYear() - 1);

  if (vencimiento < unAñoAtras) {
    return {
      valido: false,
      mensaje: 'La fecha de vencimiento no puede ser anterior a más de 1 año',
    };
  }

  return { valido: true };
}

/**
 * Formatea una fecha para mostrar
 */
export function formatearFecha(fecha: string | number | Date): string {
  if (!fecha) return 'N/A';
  
  const date = new Date(typeof fecha === 'number' ? fecha : fecha);
  
  if (isNaN(date.getTime())) return 'N/A';
  
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Convierte una fecha a timestamp de Backendless
 */
export function fechaATimestamp(fecha: string | Date): number {
  return new Date(fecha).getTime();
}

/**
 * Valida el formato del archivo PDF
 */
export function validarArchivoPDF(file: File): { valido: boolean; mensaje?: string } {
  // Validar tipo de archivo
  if (file.type !== 'application/pdf') {
    return {
      valido: false,
      mensaje: 'Solo se permiten archivos PDF',
    };
  }

  // Validar tamaño (máximo 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valido: false,
      mensaje: 'El archivo no debe superar los 10MB',
    };
  }

  return { valido: true };
}
