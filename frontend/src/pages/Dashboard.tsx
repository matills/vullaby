import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/Layout';
import { api } from '../services/api';

// TODO: Obtener businessId del usuario autenticado
const BUSINESS_ID = '966d6a45-9111-4a42-b618-2f744ebce14a';

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', BUSINESS_ID],
    queryFn: () => api.getDashboardStats(BUSINESS_ID),
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      case 'no_show':
        return 'No asistió';
      default:
        return status;
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error al cargar el dashboard: {(error as Error).message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📅</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Citas Hoy
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {isLoading ? '...' : stats?.todayAppointments || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">⏰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Citas Pendientes
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {isLoading ? '...' : stats?.pendingAppointments || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">👥</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Clientes
                    </dt>
                    <dd className="text-3xl font-bold text-gray-900">
                      {isLoading ? '...' : stats?.totalCustomers || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Próximas Citas</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">Cargando...</div>
              ) : stats?.upcomingAppointments && stats.upcomingAppointments.length > 0 ? (
                stats.upcomingAppointments.map((appointment: any) => {
                  const startTime = new Date(appointment.start_time);
                  const isToday =
                    startTime.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={appointment.id}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {appointment.customer?.name || appointment.customer?.phone || 'Sin nombre'}
                            </p>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                appointment.status
                              )}`}
                            >
                              {getStatusLabel(appointment.status)}
                            </span>
                            {isToday && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                Hoy
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <span className="mr-1">👤</span>
                              {appointment.employee?.name || 'Sin asignar'}
                            </span>
                            <span className="flex items-center">
                              <span className="mr-1">📅</span>
                              {format(startTime, "EEEE d 'de' MMMM", { locale: es })}
                            </span>
                            <span className="flex items-center">
                              <span className="mr-1">⏰</span>
                              {format(startTime, 'HH:mm')}
                            </span>
                            {appointment.employee?.specialty && (
                              <span className="flex items-center">
                                <span className="mr-1">✂️</span>
                                {appointment.employee.specialty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No hay citas programadas
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
