import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Activity, RefreshCw, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getActionLabel, getTableLabel } from '@/lib/logger';
import { TableControls } from '@/components/TableControls';
import { TableHeaderCell } from '@/components/TableHeader';
import { useTableData } from '@/hooks/useTableData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Log {
  objectId: string;
  accion: string;
  tabla: string;
  registroId: string;
  usuario: string;
  detalles?: string;
  fecha: number;
  created: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroTabla, setFiltroTabla] = useState<string>('todas');
  const [filtroAccion, setFiltroAccion] = useState<string>('todas');
  const { toast } = useToast();

  const logsFilterados = logs.filter(log => {
    if (filtroTabla !== 'todas' && log.tabla !== filtroTabla) return false;
    if (filtroAccion !== 'todas' && log.accion !== filtroAccion) return false;
    return true;
  });

  const {
    pageData,
    totalResults,
    search,
    setSearch,
    pageSize,
    setPageSize,
    sortField,
    sortOrder,
    handleSort,
  } = useTableData({
    data: logsFilterados,
    searchFields: ['usuario', 'tabla', 'accion', 'detalles'],
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAll<Log>('Logs', {
        sortBy: 'created desc',
        pageSize: 100,
      });
      setLogs(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al cargar los logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAccionBadge = (accion: string) => {
    const colors: Record<string, string> = {
      crear: 'bg-green-500/10 text-green-500',
      editar: 'bg-blue-500/10 text-blue-500',
      eliminar: 'bg-red-500/10 text-red-500',
    };
    return colors[accion] || 'bg-gray-500/10 text-gray-500';
  };

  const estadisticas = {
    total: logs.length,
    crear: logs.filter(l => l.accion === 'crear').length,
    editar: logs.filter(l => l.accion === 'editar').length,
    eliminar: logs.filter(l => l.accion === 'eliminar').length,
  };

  const tablasUnicas = Array.from(new Set(logs.map(l => l.tabla)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Logs del Sistema</h2>
          <p className="text-muted-foreground mt-1">Historial de actividad y auditoría</p>
        </div>
        <Button onClick={loadLogs} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{estadisticas.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Creaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{estadisticas.crear}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ediciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{estadisticas.editar}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eliminaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{estadisticas.eliminar}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tabla</label>
              <Select value={filtroTabla} onValueChange={setFiltroTabla}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las tablas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las tablas</SelectItem>
                  {tablasUnicas.map((tabla) => (
                    <SelectItem key={tabla} value={tabla}>
                      {getTableLabel(tabla)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Acción</label>
              <Select value={filtroAccion} onValueChange={setFiltroAccion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las acciones</SelectItem>
                  <SelectItem value="crear">Crear</SelectItem>
                  <SelectItem value="editar">Editar</SelectItem>
                  <SelectItem value="eliminar">Eliminar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logsFilterados.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No hay logs registrados
            </div>
          ) : (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fecha y Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Tabla</TableHead>
                    <TableHead>ID Registro</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsFilterados.map((log) => (
                    <TableRow key={log.objectId} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {new Date(log.fecha || log.created).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>{log.usuario}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getAccionBadge(log.accion)}`}>
                          {getActionLabel(log.accion)}
                        </span>
                      </TableCell>
                      <TableCell>{getTableLabel(log.tabla)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.registroId}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                        {log.detalles || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
