const API_BASE_URL = 'https://api.backendless.com/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la solicitud' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
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
    
    // Log the action
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
    
    // Log the action
    const { logAction } = await import('./logger');
    await logAction('editar', table, id, JSON.stringify(data));
    
    return result;
  },

  // Delete a record
  delete: async (table: string, id: string) => {
    const result = await apiRequest(`/data/${table}/${id}`, {
      method: 'DELETE',
    });
    
    // Log the action
    const { logAction } = await import('./logger');
    await logAction('eliminar', table, id);
    
    return result;
  },
};
