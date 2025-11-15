import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, CreditCard, TrendingUp, Loader2, Package, AlertCircle, DollarSign } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface Usuario {
  objectId: string;
  email?: string;
  nombre?: string;
  activo?: boolean;
}

interface Expediente {
  objectId: string;
  folioExpediente: string;
  cliente: string;
  lote: string;
  activo?: boolean;
  relacionUsuarios?: {
    nombre: string;
  };
}

interface Pago {
  objectId: string;
  monto?: number;
  metodoPago?: string;
  moneda?: string;
  folioExpediente: string;
  created: number;
}

interface Lote {
  objectId: string;
  numeroLote: string;
  precio?: number;
  activo?: string;
}

interface LogEntry {
  objectId: string;
  accion: string;
  tabla: string;
  registroId: string;
  usuario: string;
  fecha: string | number;
}

export default function Dashboard() {
  const { toast } = useToast();

  const [stats, setStats] = useState({
    usuariosActivos: 0,
    expedientes: 0,
    pagos: 0,
    porcentajeCobrado: 0,
    adeudoTotal: 0,
    lotesDisponibles: 0,
    lotesReservados: 0,
    lotesVendidos: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actividadReciente, setActividadReciente] = useState<LogEntry[]>([]);
  const [loadingActividad, setLoadingActividad] = useState(true);
  const [pagosPendientes, setPagosPendientes] = useState<any[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(true);
  const [pagosPorMes, setPagosPorMes] = useState<any[]>([]);
  const [loadingGrafico, setLoadingGrafico] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [usuarios, expedientes, pagos, lotes] = await Promise.all([
          api.getAll<Usuario>("Usuarios"),
          api.getAll<Expediente>("Expedientes", { loadRelations: "relacionUsuarios" }),
          api.getAll<Pago>("Pagos"),
          api.getAll<Lote>("Lotes"),
        ]);

        // 1. Usuarios Activos (solo activos)
        const usuariosActivos = usuarios.filter((u: Usuario) => u.activo === true).length;

        // 2. Expedientes Totales
        const totalExpedientes = expedientes.length;

        // 3. Pagos Procesados (suma de todos los montos)
        const totalPagado = pagos.reduce(
          (sum: number, p: Pago) => sum + (p.monto || 0),
          0
        );

        // 4. Porcentaje Cobrado
        const totalPrecioLotes = lotes.reduce(
          (sum: number, l: Lote) => sum + (l.precio || 0),
          0
        );
        const porcentajeCobrado = totalPrecioLotes > 0
          ? ((totalPagado / totalPrecioLotes) * 100)
          : 0;

        // 5. Adeudo Total del Proyecto (calcular dinámicamente)
        // Map pagos por expediente
        const pagosPorExpediente = new Map<string, number>();
        pagos.forEach((p: Pago) => {
          const current = pagosPorExpediente.get(p.folioExpediente) || 0;
          pagosPorExpediente.set(p.folioExpediente, current + (p.monto || 0));
        });

        // Map precios por lote
        const preciosPorLote = new Map<string, number>();
        lotes.forEach((lote: Lote) => {
          preciosPorLote.set(lote.numeroLote, lote.precio || 0);
        });

        // Calcular adeudo total
        let adeudoTotal = 0;
        expedientes.forEach((exp: Expediente) => {
          const precioLote = preciosPorLote.get(exp.lote) || 0;
          const montoPagado = pagosPorExpediente.get(exp.folioExpediente) || 0;
          const adeudo = precioLote - montoPagado;
          if (adeudo > 0) {
            adeudoTotal += adeudo;
          }
        });

        // 6. Distribución de Lotes
        const lotesDisponibles = lotes.filter((l: Lote) => l.activo === "Disponibles").length;
        const lotesReservados = lotes.filter((l: Lote) => l.activo === "Reservados").length;
        const lotesVendidos = lotes.filter((l: Lote) => l.activo === "Vendidos").length;

        setStats({
          usuariosActivos,
          expedientes: totalExpedientes,
          pagos: totalPagado,
          porcentajeCobrado,
          adeudoTotal,
          lotesDisponibles,
          lotesReservados,
          lotesVendidos,
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

  // Fetch Actividad Reciente
  useEffect(() => {
    const fetchActividad = async () => {
      try {
        setLoadingActividad(true);
        const logs = await api.getAll<LogEntry>("Logs", {
          pageSize: 10,
          sortBy: "created desc",
        });
        setActividadReciente(logs);
      } catch (error) {
        console.error("Error fetching activity logs:", error);
      } finally {
        setLoadingActividad(false);
      }
    };

    fetchActividad();
  }, []);

  // Fetch Pagos Pendientes
  useEffect(() => {
    const fetchPagosPendientes = async () => {
      try {
        setLoadingPendientes(true);

        const [expedientes, pagos, lotes] = await Promise.all([
          api.getAll<Expediente>("Expedientes", { loadRelations: "relacionUsuarios" }),
          api.getAll<Pago>("Pagos"),
          api.getAll<Lote>("Lotes"),
        ]);

        // Map pagos por expediente
        const pagosPorExpediente = new Map<string, number>();
        pagos.forEach((p: Pago) => {
          const current = pagosPorExpediente.get(p.folioExpediente) || 0;
          pagosPorExpediente.set(p.folioExpediente, current + (p.monto || 0));
        });

        // Map precios por lote
        const preciosPorLote = new Map<string, number>();
        lotes.forEach((lote: Lote) => {
          preciosPorLote.set(lote.numeroLote, lote.precio || 0);
        });

        // Calcular expedientes con adeudo
        const expedientesConAdeudo = expedientes
          .map((exp: Expediente) => {
            const precioLote = preciosPorLote.get(exp.lote) || 0;
            const montoPagado = pagosPorExpediente.get(exp.folioExpediente) || 0;
            const adeudo = precioLote - montoPagado;

            return {
              folioExpediente: exp.folioExpediente,
              cliente: exp.relacionUsuarios?.nombre || exp.cliente || "Cliente no asignado",
              adeudo,
            };
          })
          .filter((exp) => exp.adeudo > 0)
          .sort((a, b) => b.adeudo - a.adeudo)
          .slice(0, 5);

        setPagosPendientes(expedientesConAdeudo);
      } catch (error) {
        console.error("Error fetching pagos pendientes:", error);
      } finally {
        setLoadingPendientes(false);
      }
    };

    fetchPagosPendientes();
  }, []);

  // Fetch Gráfico de Pagos por Mes
  useEffect(() => {
    const fetchPagosPorMes = async () => {
      try {
        setLoadingGrafico(true);
        const pagos = await api.getAll<Pago>("Pagos");

        // Get last 6 months
        const now = new Date();
        const meses: any[] = [];
        
        for (let i = 5; i >= 0; i--) {
          const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mes = fecha.toLocaleString('es-MX', { month: 'short', year: 'numeric' });
          meses.push({
            mes,
            total: 0,
            year: fecha.getFullYear(),
            month: fecha.getMonth(),
          });
        }

        // Agrupar pagos por mes
        pagos.forEach((pago: Pago) => {
          const fecha = new Date(pago.created);
          const year = fecha.getFullYear();
          const month = fecha.getMonth();

          const mesData = meses.find((m) => m.year === year && m.month === month);
          if (mesData) {
            mesData.total += pago.monto || 0;
          }
        });

        setPagosPorMes(meses);
      } catch (error) {
        console.error("Error fetching pagos por mes:", error);
      } finally {
        setLoadingGrafico(false);
      }
    };

    fetchPagosPorMes();
  }, []);

  const mainCards = [
    {
      title: "Usuarios Activos",
      value: stats.usuariosActivos.toString(),
      description: "Total de usuarios activos",
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

  const secondaryCards = [
    {
      title: "Adeudo Total",
      value: `$${stats.adeudoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: "Monto pendiente de cobro",
      icon: DollarSign,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Lotes Disponibles",
      value: stats.lotesDisponibles.toString(),
      description: "Lotes sin asignar",
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Lotes Reservados",
      value: stats.lotesReservados.toString(),
      description: "Lotes en proceso",
      icon: Package,
      color: "text-yellow-600",
      bgColor: "bg-yellow-600/10",
    },
    {
      title: "Lotes Vendidos",
      value: stats.lotesVendidos.toString(),
      description: "Lotes finalizados",
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-600/10",
    },
  ];

  const formatDate = (fecha: string | number) => {
    try {
      const date = typeof fecha === 'number' ? new Date(fecha) : new Date(fecha);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getAccionLabel = (accion: string) => {
    const labels: Record<string, string> = {
      crear: 'Creó',
      editar: 'Editó',
      eliminar: 'Eliminó',
    };
    return labels[accion] || accion;
  };

  const getTablaLabel = (tabla: string) => {
    const labels: Record<string, string> = {
      Usuarios: 'Usuario',
      Expedientes: 'Expediente',
      Pagos: 'Pago',
      Lotes: 'Lote',
      Documentos: 'Documento',
      CLG: 'Certificado CLG',
    };
    return labels[tabla] || tabla;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Vista general del sistema SIAVL</p>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <div className="col-span-4 flex justify-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          mainCards.map((card) => (
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

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <div className="col-span-4 flex justify-center py-6">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          secondaryCards.map((card) => (
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

      {/* Gráfico de Pagos por Mes */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle>Pagos por Mes</CardTitle>
          <CardDescription>Evolución de pagos en los últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGrafico ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : pagosPorMes.length === 0 || pagosPorMes.every((m) => m.total === 0) ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay pagos registrados en los últimos 6 meses</p>
              </div>
            </div>
          ) : (
            <ChartContainer
              config={{
                total: {
                  label: "Total Pagado",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pagosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="mes"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: any) =>
                      `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Widgets de Actividad y Pagos Pendientes */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Actividad Reciente */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones realizadas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActividad ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
              </div>
            ) : actividadReciente.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <p>No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actividadReciente.map((log) => (
                  <div
                    key={log.objectId}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {log.usuario} {getAccionLabel(log.accion)} {getTablaLabel(log.tabla)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(log.fecha)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagos Pendientes */}
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Pagos Pendientes</CardTitle>
            <CardDescription>Expedientes con adeudo pendiente</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPendientes ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
              </div>
            ) : pagosPendientes.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <p>No hay pagos pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pagosPendientes.map((item) => (
                  <div
                    key={item.folioExpediente}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.folioExpediente}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.cliente}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">
                        ${item.adeudo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}