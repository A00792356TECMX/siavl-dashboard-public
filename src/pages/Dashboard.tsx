import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, CreditCard, TrendingUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Usuario {
  objectId: string;
  email?: string;
}

interface Expediente {
  objectId: string;
  estado?: string;
}

interface Pago {
  objectId: string;
  monto?: number;
  metodo?: string;
  estado?: string;
}

interface Lote {
  objectId: string;
  precio?: number;
}

export default function Dashboard() {
  const { toast } = useToast();

  const [stats, setStats] = useState({
    usuarios: 0,
    expedientes: 0,
    pagos: 0,
    porcentajeCobrado: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // ✅ Fetch all data in parallel using api.getAll
        const [usuarios, expedientes, pagos, lotes] = await Promise.all([
          api.getAll<Usuario>("Usuarios"),
          api.getAll<Expediente>("Expedientes"),
          api.getAll<Pago>("Pagos"),
          api.getAll<Lote>("Lotes"),
        ]);

        // ✅ Calculate totals
        const totalUsuarios = usuarios.length;
        const totalExpedientes = expedientes.length;

        // Sum all payments (monto is number in Backendless)
        const totalPagado = pagos.reduce(
          (sum: number, p: Pago) => sum + (p.monto || 0),
          0
        );

        // Sum all lote prices to get total receivable
        const totalPrecio = lotes.reduce(
          (sum: number, l: Lote) => sum + (l.precio || 0),
          0
        );

        // Calculate percentage collected: (Total Pagado / Total Precio) * 100
        const porcentajeCobrado =
          totalPrecio > 0
            ? ((totalPagado / totalPrecio) * 100)
            : 0;

        // ✅ Update state
        setStats({
          usuarios: totalUsuarios,
          expedientes: totalExpedientes,
          pagos: totalPagado,
          porcentajeCobrado: porcentajeCobrado,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({
          title: "Error al cargar datos",
          description: "No se pudieron obtener las estadísticas del sistema.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toast]);

  const cards = [
    {
      title: "Usuarios Activos",
      value: stats.usuarios.toString(),
      description: "Total de usuarios en el sistema",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Expedientes",
      value: stats.expedientes.toString(),
      description: "Expedientes registrados",
      icon: FolderOpen,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Pagos Procesados",
      value: `$${stats.pagos.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: "Total de pagos recibidos",
      icon: CreditCard,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Porcentaje Cobrado",
      value: `${stats.porcentajeCobrado.toFixed(1)}%`,
      description: "Del total de lotes",
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Vista general del sistema SIAVL</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <div className="col-span-4 flex justify-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          cards.map((card) => (
            <Card
              key={card.title}
              className="shadow-card border-border/50 hover:shadow-soft transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div
                  className={`h-10 w-10 rounded-lg ${card.bgColor} flex items-center justify-center`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Secondary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones realizadas en el sistema</CardDescription>
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
            <CardDescription>Pagos que requieren atención</CardDescription>
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