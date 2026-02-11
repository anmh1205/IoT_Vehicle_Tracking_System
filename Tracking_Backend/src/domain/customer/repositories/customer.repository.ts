import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type {
  Customer,
  CustomerListQuery,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@/domain/customer/types/customer.types';

export const findAll = async (
  query: CustomerListQuery,
): Promise<{ customers: Customer[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.customerType) {
    conditions.push(`customer_type = $${paramIndex++}`);
    params.push(query.customerType);
  }

  if (query.search) {
    conditions.push(
      `(name ILIKE $${paramIndex} OR customer_code ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`,
    );
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM customers ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const customers = await findMany<Customer>(
    `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { customers, total };
};

export const findById = async (id: number): Promise<Customer | null> =>
  findOne<Customer>('SELECT * FROM customers WHERE id = $1', [id]);

export const findByCode = async (code: string): Promise<Customer | null> =>
  findOne<Customer>('SELECT * FROM customers WHERE customer_code = $1', [code]);

export const create = async (input: CreateCustomerInput): Promise<Customer> =>
  insertOne<Customer>(
    `INSERT INTO customers (customer_code, name, customer_type, email, phone, address, tax_code, contact_person, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      input.customerCode,
      input.name,
      input.customerType ?? 'individual',
      input.email ?? null,
      input.phone ?? null,
      input.address ?? null,
      input.taxCode ?? null,
      input.contactPerson ?? null,
      input.notes ?? null,
    ],
  );

export const update = async (id: number, input: UpdateCustomerInput): Promise<Customer | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.customerType !== undefined) {
    setClauses.push(`customer_type = $${paramIndex++}`);
    values.push(input.customerType);
  }
  if (input.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(input.email);
  }
  if (input.phone !== undefined) {
    setClauses.push(`phone = $${paramIndex++}`);
    values.push(input.phone);
  }
  if (input.address !== undefined) {
    setClauses.push(`address = $${paramIndex++}`);
    values.push(input.address);
  }
  if (input.taxCode !== undefined) {
    setClauses.push(`tax_code = $${paramIndex++}`);
    values.push(input.taxCode);
  }
  if (input.contactPerson !== undefined) {
    setClauses.push(`contact_person = $${paramIndex++}`);
    values.push(input.contactPerson);
  }
  if (input.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<Customer>(
    `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM customers WHERE id = $1', [id]);
