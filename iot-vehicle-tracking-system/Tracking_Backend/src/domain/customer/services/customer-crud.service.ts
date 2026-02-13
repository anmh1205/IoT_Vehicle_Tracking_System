import { createNotFoundError, createConflictError } from '@/shared/utils/errors.util';
import * as customerRepo from '@/domain/customer/repositories/customer.repository';
import { logger } from '@/infrastructure/logger';
import type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerPublic,
} from '@/domain/customer/types/customer.types';

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

export const getCustomerById = async (id: number): Promise<CustomerPublic> => {
  const customer = await customerRepo.findById(id);
  if (!customer) {
    throw createNotFoundError(`Customer with ID ${id} not found`);
  }
  return sanitizeCustomer(customer);
};

export const createCustomer = async (input: CreateCustomerInput): Promise<CustomerPublic> => {
  const existing = await customerRepo.findByCode(input.customerCode);
  if (existing) {
    throw createConflictError(`Customer with code "${input.customerCode}" already exists`);
  }

  const customer = await customerRepo.create(input);
  logger.info(`Customer "${input.customerCode}" created successfully`);
  return sanitizeCustomer(customer);
};

export const updateCustomer = async (
  id: number,
  input: UpdateCustomerInput,
): Promise<CustomerPublic> => {
  const existing = await customerRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Customer with ID ${id} not found`);
  }

  const updated = await customerRepo.update(id, input);
  if (!updated) {
    throw createNotFoundError(`Customer with ID ${id} not found`);
  }

  logger.info(`Customer "${existing.customer_code}" updated successfully`);
  return sanitizeCustomer(updated);
};

export const deleteCustomer = async (id: number): Promise<void> => {
  const existing = await customerRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Customer with ID ${id} not found`);
  }

  await customerRepo.remove(id);
  logger.info(`Customer "${existing.customer_code}" deleted successfully`);
};
