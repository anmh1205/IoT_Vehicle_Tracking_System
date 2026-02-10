export type CustomerType = 'individual' | 'company';
export type CustomerStatus = 'active' | 'inactive' | 'suspended';

export interface Customer {
  id: number;
  customerCode: string;
  customerType: CustomerType;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  contactPerson: string | null;
  status: CustomerStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  customerCode: string;
  name: string;
  customerType?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  customerType?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  notes?: string;
  status?: string;
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  status?: string;
  customerType?: string;
  search?: string;
}
