import { customersApi } from '@/services/api';
import type { Customer } from '@/types';
import { useCrudResource } from './useCrud';
import { useQuery } from '@tanstack/react-query';

/**
 * Customers hooks using generic useCrud pattern
 * Reduces code duplication while maintaining custom functionality
 */

// Create base CRUD hooks
const {
  useOne,
  useCreate,
  useUpdate,
  useDelete,
} = useCrudResource<Customer>('customers', {
  // Adapt the customersApi to match CrudApi interface
  getAll: () => customersApi.search(''), // Note: This needs business_id in real implementation
  getById: customersApi.getById,
  create: customersApi.create,
  update: customersApi.update,
  delete: customersApi.delete,
});

// Export renamed hooks for backward compatibility
export const useCustomer = useOne;
export const useCreateCustomer = useCreate;
export const useUpdateCustomer = useUpdate;
export const useDeleteCustomer = useDelete;

/**
 * Custom hook for searching/listing customers
 * This is specific to customers so it doesn't use the generic pattern
 */
export function useCustomers(businessId: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: ['customers', businessId, searchQuery],
    queryFn: () => customersApi.search(businessId!, searchQuery),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Custom hook for getting customer by phone
 * Customer-specific functionality
 */
export function useCustomerByPhone(phone: string | null) {
  return useQuery({
    queryKey: ['customers', 'phone', phone],
    queryFn: () => customersApi.getByPhone(phone!),
    enabled: !!phone,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Custom hook for getting customer history
 * Customer-specific functionality
 */
export function useCustomerHistory(customerId: string | null) {
  return useQuery({
    queryKey: ['customers', customerId, 'history'],
    queryFn: () => customersApi.getHistory(customerId!),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
