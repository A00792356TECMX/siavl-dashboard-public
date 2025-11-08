import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderOpen, CreditCard, TrendingUp } from 'lucide-react';

const stats = [
  {
    title: 'Usuarios Activos',
    value: '0',
    description: 'Total de usuarios en el sistema',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Expedientes',
    value: '0',
    description: 'Expedientes registrados',
    icon: FolderOpen,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    title: 'Pagos Procesados',
    value: '$0',
    description: 'Total de pagos recibidos',
    icon: CreditCard,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Tasa de Conversión',
    value: '0%',
    description: 'Últimos 30 días',
    icon: TrendingUp,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Vista general del sistema SIAVL
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-card border-border/50 hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas acciones realizadas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p>No hay actividad reciente</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Pagos Pendientes</CardTitle>
            <CardDescription>
              Pagos que requieren atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p>No hay pagos pendientes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
