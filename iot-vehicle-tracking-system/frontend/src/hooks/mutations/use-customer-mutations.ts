/**
 * Customer Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerServices } from '@/lib/api/customers';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { CreateCustomerDto, UpdateCustomerDto } from '@/types';

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerDto) => customerServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
      toast.success('Customer created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create customer', { description: error.message });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateCustomerDto }) =>
      customerServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMER(variables.id) });
      toast.success('Customer updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update customer', { description: error.message });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => customerServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMERS });
      toast.success('Customer deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete customer', { description: error.message });
    },
  });
}

