interface LogEntry {
  accion: string;
  tabla: string;
  registroId: string;
  usuario: string;
  detalles: string;
  fecha: string;
}

const API_BASE_URL = 'https://api.backendless.com/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';

export async function logAction(
  action: 'crear' | 'editar' | 'eliminar',
  table: string,
  recordId: string,
  details: string = ''
): Promise<void> {
  try {
    const userToken = localStorage.getItem('userToken');
    const userEmail = localStorage.getItem('userEmail') || 'Usuario desconocido';
    
    const logEntry: LogEntry = {
      accion: action,
      tabla: table,
      registroId: recordId,
      usuario: userEmail,
      detalles: details,
      fecha: new Date().toISOString(),
    };

    // Don't log actions on the Logs table to avoid infinite loops
    if (table === 'Logs') {
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (userToken) {
      headers['user-token'] = userToken;
    }

    await fetch(`${API_BASE_URL}/data/Logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(logEntry),
    });
  } catch (error) {
    // Silently fail to not disrupt user operations
    console.error('Error logging action:', error);
  }
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    crear: 'Creó',
    editar: 'Editó',
    eliminar: 'Eliminó',
  };
  return labels[action] || action;
}

export function getTableLabel(table: string): string {
  const labels: Record<string, string> = {
    Users: 'Usuario',
    Expedientes: 'Expediente',
    Pagos: 'Pago',
    Lotes: 'Lote',
    Documentos: 'Documento',
    CLG: 'Certificado CLG',
  };
  return labels[table] || table;
}
