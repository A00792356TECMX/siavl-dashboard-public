import { toast } from 'sonner';

const API_BASE_URL = 'https://knowingplant-us.backendless.app/api/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const userToken = localStorage.getItem('userToken');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (userToken) {
    headers['user-token'] = userToken;
  }

  const body = options.body ? JSON.stringify(options.body) : undefined;

  // Debug logging for POST/PUT requests
  if (body && (options.method === 'POST' || options.method === 'PUT')) {
    console.log('🌐 API Request:', {
      endpoint,
      method: options.method,
      body: options.body,
      bodyString: body
    });
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body,
  });

  // Handle different HTTP status codes
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
    const errorMessage = error.message || `Error HTTP: ${response.status}`;

    // Handle specific status codes
    switch (response.status) {
      case 401:
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.', {
          position: 'bottom-right',
        });
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        break;

      case 403:
        toast.error('No tienes permisos para realizar esta acción.', {
          position: 'bottom-right',
        });
        break;

      case 404:
        toast.error('Recurso no encontrado.', {
          position: 'bottom-right',
        });
        break;

      case 500:
        toast.error('Error interno del servidor. Por favor, intenta más tarde.', {
          position: 'bottom-right',
        });
        break;

      default:
        toast.error(errorMessage, {
          position: 'bottom-right',
        });
    }

    throw new Error(errorMessage);
  }

  const responseData = await response.json();

  // Show success notification for POST/PUT/DELETE operations
  if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
    const successMessages: Record<string, string> = {
      'POST': 'Registro creado exitosamente',
      'PUT': 'Registro actualizado exitosamente',
      'DELETE': 'Registro eliminado exitosamente',
    };

    toast.success(successMessages[options.method] || 'Operación exitosa', {
      position: 'bottom-right',
    });
  }

  // Debug logging for POST/PUT responses
  if (body && (options.method === 'POST' || options.method === 'PUT')) {
    console.log('✅ API Response:', responseData);
  }

  return responseData;
}

// CRUD operations for any table
export const api = {
  // Get all records from a table
  getAll: <T>(table: string, params?: Record<string, any>) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<T[]>(`/data/${table}${queryString}`);
  },

  // Get a single record by ID
  getById: <T>(table: string, id: string) => {
    return apiRequest<T>(`/data/${table}/${id}`);
  },

  // Create a new record
  create: async <T>(table: string, data: any) => {
    const result = await apiRequest<T>(`/data/${table}`, {
      method: 'POST',
      body: data,
    });

    // Log the action (toast notification already shown in apiRequest)
    const { logAction } = await import('./logger');
    const recordId = (result as any)?.objectId || 'unknown';
    await logAction('crear', table, recordId, JSON.stringify(data));

    return result;
  },

  // Update a record
  update: async <T>(table: string, id: string, data: any) => {
    const result = await apiRequest<T>(`/data/${table}/${id}`, {
      method: 'PUT',
      body: data,
    });

    // Log the action (toast notification already shown in apiRequest)
    const { logAction } = await import('./logger');
    await logAction('editar', table, id, JSON.stringify(data));

    return result;
  },

  // Delete a record
  delete: async (table: string, id: string) => {
    const result = await apiRequest(`/data/${table}/${id}`, {
      method: 'DELETE',
    });

    // Log the action (toast notification already shown in apiRequest)
    const { logAction } = await import('./logger');
    await logAction('eliminar', table, id);

    return result;
  },
};
