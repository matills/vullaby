import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';

/**
 * Generic CRUD API interface
 * Standardizes the shape of API service objects
 */
export interface CrudApi<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T>;
  create: (data: CreateDTO) => Promise<T>;
  update: (id: string, data: UpdateDTO) => Promise<T>;
  delete: (id: string) => Promise<void>;
  search?: (query: string, params?: Record<string, any>) => Promise<T[]>;
}

/**
 * Options for configuring the CRUD hooks
 */
export interface UseCrudOptions {
  /** Time in milliseconds to cache query results */
  staleTime?: number;
  /** Enable automatic refetching */
  refetchOnWindowFocus?: boolean;
  /** Enable automatic retry on failure */
  retry?: boolean | number;
}

/**
 * Return type for useCrud hook
 */
export interface UseCrudResource<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  /** Hook to fetch all entities */
  useAll: (options?: UseCrudOptions) => UseQueryResult<T[], Error>;
  /** Hook to fetch a single entity by ID */
  useOne: (id: string | undefined, options?: UseCrudOptions) => UseQueryResult<T, Error>;
  /** Hook to create a new entity */
  useCreate: () => UseMutationResult<T, Error, CreateDTO>;
  /** Hook to update an existing entity */
  useUpdate: () => UseMutationResult<T, Error, { id: string; data: UpdateDTO }>;
  /** Hook to delete an entity */
  useDelete: () => UseMutationResult<void, Error, string>;
  /** Hook to search entities (if search API exists) */
  useSearch?: (query: string, params?: Record<string, any>, options?: UseCrudOptions) => UseQueryResult<T[], Error>;
}

/**
 * Generic CRUD hooks factory
 * Eliminates code duplication across entity-specific hooks
 *
 * @example
 * ```ts
 * const employeeHooks = useCrudResource('employees', employeesApi);
 * export const { useAll: useEmployees, useOne: useEmployee, ... } = employeeHooks;
 * ```
 *
 * @param resourceName - Name of the resource (used for query keys)
 * @param api - CRUD API service object
 * @param defaultOptions - Default options for all queries
 */
export function useCrudResource<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>(
  resourceName: string,
  api: CrudApi<T, CreateDTO, UpdateDTO>,
  defaultOptions: UseCrudOptions = {}
): UseCrudResource<T, CreateDTO, UpdateDTO> {
  const queryClient = useQueryClient();

  /**
   * Hook to fetch all entities
   */
  const useAll = (options: UseCrudOptions = {}): UseQueryResult<T[], Error> => {
    return useQuery({
      queryKey: [resourceName],
      queryFn: api.getAll,
      staleTime: options.staleTime ?? defaultOptions.staleTime ?? 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? defaultOptions.refetchOnWindowFocus ?? false,
      retry: options.retry ?? defaultOptions.retry ?? 1,
    });
  };

  /**
   * Hook to fetch a single entity by ID
   */
  const useOne = (id: string | undefined, options: UseCrudOptions = {}): UseQueryResult<T, Error> => {
    return useQuery({
      queryKey: [resourceName, id],
      queryFn: () => api.getById(id!),
      enabled: !!id,
      staleTime: options.staleTime ?? defaultOptions.staleTime ?? 5 * 60 * 1000,
      refetchOnWindowFocus: options.refetchOnWindowFocus ?? defaultOptions.refetchOnWindowFocus ?? false,
      retry: options.retry ?? defaultOptions.retry ?? 1,
    });
  };

  /**
   * Hook to create a new entity
   */
  const useCreate = (): UseMutationResult<T, Error, CreateDTO> => {
    return useMutation({
      mutationFn: api.create,
      onSuccess: () => {
        // Invalidate and refetch the list query
        queryClient.invalidateQueries({ queryKey: [resourceName] });
      },
    });
  };

  /**
   * Hook to update an existing entity
   */
  const useUpdate = (): UseMutationResult<T, Error, { id: string; data: UpdateDTO }> => {
    return useMutation({
      mutationFn: ({ id, data }) => api.update(id, data),
      onSuccess: (updatedEntity: any) => {
        // Invalidate the specific entity query
        queryClient.invalidateQueries({ queryKey: [resourceName, updatedEntity.id] });
        // Invalidate the list query
        queryClient.invalidateQueries({ queryKey: [resourceName] });
      },
    });
  };

  /**
   * Hook to delete an entity
   */
  const useDelete = (): UseMutationResult<void, Error, string> => {
    return useMutation({
      mutationFn: api.delete,
      onSuccess: (_, deletedId) => {
        // Remove the specific entity from cache
        queryClient.removeQueries({ queryKey: [resourceName, deletedId] });
        // Invalidate the list query
        queryClient.invalidateQueries({ queryKey: [resourceName] });
      },
    });
  };

  /**
   * Hook to search entities (only if search API exists)
   */
  const useSearch = api.search
    ? (query: string, params: Record<string, any> = {}, options: UseCrudOptions = {}): UseQueryResult<T[], Error> => {
        return useQuery({
          queryKey: [resourceName, 'search', query, params],
          queryFn: () => api.search!(query, params),
          enabled: !!query,
          staleTime: options.staleTime ?? defaultOptions.staleTime ?? 2 * 60 * 1000, // 2 minutes for search
          refetchOnWindowFocus: options.refetchOnWindowFocus ?? defaultOptions.refetchOnWindowFocus ?? false,
          retry: options.retry ?? defaultOptions.retry ?? 1,
        });
      }
    : undefined;

  return {
    useAll,
    useOne,
    useCreate,
    useUpdate,
    useDelete,
    useSearch,
  };
}
