import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '@/services/api';
import type { Appointment } from '@/types';

export function useUpcomingAppointments(businessId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['appointments', 'upcoming', businessId, limit],
    queryFn: () => appointmentsApi.getUpcoming(businessId!, limit),
    enabled: !!businessId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAppointmentStats(businessId: string | null) {
  return useQuery({
    queryKey: ['appointments', 'stats', businessId],
    queryFn: () => appointmentsApi.getStats(businessId!),
    enabled: !!businessId,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: () => appointmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Appointment>) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      appointmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useConfirmAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentsApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
