import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface User {
  objectId: string;
  email: string;
  name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'https://api.backendless.com/5D4E4322-AD40-411D-BA2E-627770DB2B73/C2FF6422-711C-449C-BB07-646A3F037CC5';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('userToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setUserToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al iniciar sesión');
      }

      const data = await response.json();
      
      setUser(data);
      setUserToken(data['user-token']);
      localStorage.setItem('userToken', data['user-token']);
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('userEmail', data.email || email);
      
      toast.success('¡Bienvenido a SIAVL!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión');
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setUserToken(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    toast.info('Sesión cerrada');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, userToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
