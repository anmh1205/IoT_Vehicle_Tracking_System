import * as customerRepo from '@/domain/customer/repositories/customer.repository';
import type { Customer, CustomerListQuery, CustomerPublic } from '@/domain/customer/types/customer.types';

const sanitizeCustomer = (c: Customer): CustomerPublic => ({
  id: c.id,
  customerCode: c.customer_code,
  customerType: c.customer_type,
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  taxCode: c.tax_code,
  contactPerson: c.contact_person,
  status: c.status,
  notes: c.notes,
  createdAt: c.created_at.toISOString(),
  updatedAt: c.updated_at.toISOString(),
});

export const listCustomers = async (
  query: CustomerListQuery,
): Promise<{ items: CustomerPublic[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await customerRepo.findAll(query);

  return {
    items: result.customers.map(sanitizeCustomer),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
