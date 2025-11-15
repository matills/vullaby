import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/Layout';
import { api } from '../services/api';

// TODO: Obtener businessId del usuario autenticado
const BUSINESS_ID = '966d6a45-9111-4a42-b618-2f744ebce14a';

type ViewMode = 'list' | 'week';

export default function Appointments() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();

  // Get date range for week view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ['appointments', BUSINESS_ID, selectedStatus, viewMode, selectedDate],
    queryFn: () => {
      const filters: any = {};

      if (selectedStatus !== 'all') {
        filters.status = selectedStatus;
      }

      if (viewMode === 'week') {
        filters.startDate = weekStart.toISOString();
        filters.endDate = weekEnd.toISOString();
      } else {
        filters.startDate = new Date().toISOString();
      }

      return api.getAppointments(BUSINESS_ID, filters);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.confirmAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmed: 'Confirmada',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
      completed: 'Completada',
      no_show: 'No asistió',
    };
    return labels[status] || status;
  };

  const groupAppointmentsByDay = () => {
    if (!appointments) return {};

    return appointments.reduce((groups: any, appointment: any) => {
      const date = format(new Date(appointment.start_time), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(appointment);
      return groups;
    }, {});
  };

  const renderWeekView = () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const groupedAppointments = groupAppointmentsByDay();

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayAppointments = groupedAppointments[dateKey] || [];
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

          return (
            <div
              key={dateKey}
              className={`border rounded-lg p-3 min-h-[200px] ${
                isToday ? 'bg-indigo-50 border-indigo-300' : 'bg-white'
              }`}
            >
              <div className="text-center mb-3">
                <div className={`text-sm font-medium ${isToday ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {format(day, 'EEEE', { locale: es })}
                </div>
                <div className={`text-2xl font-bold ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
              </div>
              <div className="space-y-2">
                {dayAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className={`text-xs p-2 rounded border ${getStatusColor(appointment.status)}`}
                  >
                    <div className="font-medium truncate">
                      {format(new Date(appointment.start_time), 'HH:mm')}
                    </div>
                    <div className="truncate">
                      {appointment.customer?.name || appointment.customer?.phone}
                    </div>
                    <div className="truncate text-gray-600">
                      {appointment.employee?.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const groupedAppointments = groupAppointmentsByDay();
    const sortedDates = Object.keys(groupedAppointments).sort();

    return (
      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const date = new Date(dateKey);
          const dayAppointments = groupedAppointments[dateKey];

          return (
            <div key={dateKey} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {format(date, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {dayAppointments.map((appointment: any) => (
                  <div key={appointment.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              appointment.status
                            )}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {appointment.customer?.name || appointment.customer?.phone}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <span className="mr-1">⏰</span>
                            {format(new Date(appointment.start_time), 'HH:mm')} -{' '}
                            {format(new Date(appointment.end_time), 'HH:mm')}
                          </span>
                          <span className="flex items-center">
                            <span className="mr-1">👤</span>
                            {appointment.employee?.name}
                          </span>
                          {appointment.employee?.specialty && (
                            <span className="flex items-center">
                              <span className="mr-1">✂️</span>
                              {appointment.employee.specialty}
                            </span>
                          )}
                          {appointment.customer?.phone && (
                            <span className="flex items-center">
                              <span className="mr-1">📱</span>
                              {appointment.customer.phone}
                            </span>
                          )}
                        </div>
                        {appointment.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="mr-1">📝</span>
                            {appointment.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {appointment.status === 'pending' && (
                          <button
                            onClick={() => confirmMutation.mutate(appointment.id)}
                            disabled={confirmMutation.isPending}
                            className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                        )}
                        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                          <button
                            onClick={() => {
                              if (confirm('¿Estás seguro de cancelar esta cita?')) {
                                cancelMutation.mutate(appointment.id);
                              }
                            }}
                            disabled={cancelMutation.isPending}
                            className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error al cargar las citas: {(error as Error).message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Citas</h1>
            <p className="mt-2 text-sm text-gray-600">
              Administra y organiza todas las citas de tu negocio
            </p>
          </div>

          {/* Filters and View Toggle */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="confirmed">Confirmadas</option>
                  <option value="completed">Completadas</option>
                  <option value="cancelled">Canceladas</option>
                  <option value="no_show">No asistió</option>
                </select>

                {viewMode === 'week' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      ← Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      {format(weekStart, "d 'de' MMM", { locale: es })} -{' '}
                      {format(weekEnd, "d 'de' MMM", { locale: es })}
                    </span>
                    <button
                      onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    viewMode === 'list'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 Lista
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    viewMode === 'week'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 Semana
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-500">Cargando citas...</div>
            </div>
          ) : appointments && appointments.length > 0 ? (
            viewMode === 'week' ? renderWeekView() : renderListView()
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-500">No hay citas para mostrar</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
