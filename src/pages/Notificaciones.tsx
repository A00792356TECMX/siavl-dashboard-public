import { useEffect, useState } from 'react';
import { Bell, AlertCircle, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { TableControls } from '@/components/TableControls';
import { useTableData } from '@/hooks/useTableData';

interface CLG {
  objectId: string;
  folioCLG: string;
  estado: string;
  fechaVencimiento: string;
  expedienteId?: string;
}

interface Pago {
  objectId: string;
  monto: number;
  concepto: string;
  estado: string;
  fechaVencimiento?: string;
  expedienteId?: string;
}

interface Documento {
  objectId: string;
  nombre: string;
  tipo: string;
  created: string;
  expedienteId?: string;
}

interface Notification {
  id: string;
  type: 'clg' | 'pago' | 'documento';
  title: string;
  description: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  data: any;
}

export default function Notificaciones() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const {
    pageData,
    totalResults,
    search,
    setSearch,
    pageSize,
    setPageSize,
  } = useTableData({
    data: notifications,
    searchFields: ['title', 'description', 'type'],
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const allNotifications: Notification[] = [];

      // Check CLG certificates
      const clgs = await api.getAll<CLG>('CLG');
      const now = new Date();
      
      clgs.forEach((clg) => {
        if (clg.fechaVencimiento) {
          const vencimiento = new Date(clg.fechaVencimiento);
          const daysUntilExpiry = differenceInDays(vencimiento, now);
          
          if (daysUntilExpiry < 0) {
            allNotifications.push({
              id: `clg-expired-${clg.objectId}`,
              type: 'clg',
              title: 'CLG Vencido',
              description: `El certificado ${clg.folioCLG} venció hace ${Math.abs(daysUntilExpiry)} días`,
              timestamp: clg.fechaVencimiento,
              priority: 'high',
              data: clg,
            });
          } else if (daysUntilExpiry <= 30) {
            allNotifications.push({
              id: `clg-expiring-${clg.objectId}`,
              type: 'clg',
              title: 'CLG Por Vencer',
              description: `El certificado ${clg.folioCLG} vence en ${daysUntilExpiry} días`,
              timestamp: clg.fechaVencimiento,
              priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
              data: clg,
            });
          }
        }
      });

      // Check pending payments
      const pagos = await api.getAll<Pago>('Pagos');
      pagos
        .filter((pago) => pago.estado === 'pendiente')
        .forEach((pago) => {
          let priority: 'high' | 'medium' | 'low' = 'medium';
          let description = `Pago pendiente de ${pago.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} - ${pago.concepto}`;
          
          if (pago.fechaVencimiento) {
            const vencimiento = new Date(pago.fechaVencimiento);
            const daysUntilDue = differenceInDays(vencimiento, now);
            
            if (daysUntilDue < 0) {
              priority = 'high';
              description += ` (Vencido hace ${Math.abs(daysUntilDue)} días)`;
            } else if (daysUntilDue <= 7) {
              priority = 'high';
              description += ` (Vence en ${daysUntilDue} días)`;
            } else if (daysUntilDue <= 15) {
              priority = 'medium';
              description += ` (Vence en ${daysUntilDue} días)`;
            }
          }
          
          allNotifications.push({
            id: `pago-${pago.objectId}`,
            type: 'pago',
            title: 'Pago Pendiente',
            description,
            timestamp: pago.fechaVencimiento || new Date().toISOString(),
            priority,
            data: pago,
          });
        });

      // Check recent documents (last 7 days)
      const documentos = await api.getAll<Documento>('Documentos');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      documentos
        .filter((doc) => new Date(doc.created) >= sevenDaysAgo)
        .forEach((doc) => {
          allNotifications.push({
            id: `doc-${doc.objectId}`,
            type: 'documento',
            title: 'Nuevo Documento',
            description: `Se agregó ${doc.nombre} (${doc.tipo})`,
            timestamp: doc.created,
            priority: 'low',
            data: doc,
          });
        });

      // Sort by priority and timestamp
      allNotifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setNotifications(allNotifications);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las notificaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'clg':
        return <FileText className="h-5 w-5" />;
      case 'pago':
        return <DollarSign className="h-5 w-5" />;
      case 'documento':
        return <Bell className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const markAllAsRead = () => {
    toast({
      title: 'Notificaciones leídas',
      description: 'Todas las notificaciones han sido marcadas como leídas',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando notificaciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground">
            {notifications.length > 0
              ? `Tienes ${notifications.length} notificación${notifications.length > 1 ? 'es' : ''}`
              : 'No tienes notificaciones pendientes'}
          </p>
        </div>
        {notifications.length > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCircle className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">CLG Por Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.type === 'clg').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.type === 'pago').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Documentos Nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.type === 'documento').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Notificaciones</CardTitle>
          <CardDescription>
            Alertas y actualizaciones de tu sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TableControls
            search={search}
            onSearchChange={setSearch}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalResults={totalResults}
            currentPageResults={pageData.length}
          />

          {totalResults === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {notifications.length === 0 ? 'No hay notificaciones pendientes' : 'No se encontraron resultados'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pageData.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${
                    notification.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                    notification.priority === 'medium' ? 'bg-primary/10 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{notification.title}</p>
                      <Badge variant={getPriorityColor(notification.priority)}>
                        {notification.priority === 'high' ? 'Urgente' :
                         notification.priority === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.timestamp), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
