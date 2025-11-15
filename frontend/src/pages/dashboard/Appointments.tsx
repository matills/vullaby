import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBusinessId, useAppointmentStats, useUpcomingAppointments } from "@/hooks";
import type { AppointmentStatus } from "@/types";

const Appointments = () => {
  const businessId = useBusinessId();
  const { data: stats, isLoading: statsLoading } = useAppointmentStats(businessId);
  const { data: upcomingAppointments, isLoading: appointmentsLoading } = useUpcomingAppointments(businessId, 10);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      pending: "secondary",
      cancelled: "destructive",
      completed: "outline",
    };
    const labels: Record<string, string> = {
      confirmed: "Confirmado",
      pending: "Pendiente",
      cancelled: "Cancelado",
      completed: "Completado",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === tomorrow.toDateString()) return "Mañana";

    return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Turnos</h1>
          <p className="text-muted-foreground">Gestiona tus citas y horarios</p>
        </div>
        <Button>
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Turno
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {statsLoading ? "..." : stats?.todayCount || 0} turnos
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {statsLoading ? "..." : stats?.weekCount || 0} turnos
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {statsLoading ? "..." : stats?.pendingCount || 0} turnos
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos Turnos</CardTitle>
          <CardDescription>Turnos programados para los próximos días</CardDescription>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : !upcomingAppointments || upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay turnos programados</div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment: any) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {appointment.customer?.name || appointment.customer?.phone || "Cliente sin nombre"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.employee?.name || "Sin asignar"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(appointment.start_time)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatTime(appointment.start_time)}
                      </div>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Appointments;
