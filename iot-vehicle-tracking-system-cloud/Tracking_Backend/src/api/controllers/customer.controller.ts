import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
} from '@/api/validators/customer.validator';
import * as customerCrudService from '@/domain/customer/services/customer-crud.service';
import * as customerListService from '@/domain/customer/services/customer-list.service';

export const listCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = customerListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await customerListService.listCustomers(parsed.data);
  sendOk(res, result);
});

export const getCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid customer ID');
  }

  const customer = await customerCrudService.getCustomerById(id);
  sendOk(res, customer);
});

export const createCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid customer data', parsed.error.flatten().fieldErrors);
  }

  const customer = await customerCrudService.createCustomer(parsed.data);
  sendCreated(res, customer);
});

export const updateCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid customer ID');
  }

  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid customer data', parsed.error.flatten().fieldErrors);
  }

  const customer = await customerCrudService.updateCustomer(id, parsed.data);
  sendOk(res, customer);
});

export const deleteCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid customer ID');
  }

  await customerCrudService.deleteCustomer(id);
  sendOk(res, { success: true });
});
