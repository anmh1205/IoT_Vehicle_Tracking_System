export interface Customer {
  id: number;
  customer_code: string;
  customer_type: 'individual' | 'company';
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_code: string | null;
  contact_person: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerPublic {
  id: number;
  customerCode: string;
  customerType: 'individual' | 'company';
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxCode: string | null;
  contactPerson: string | null;
  status: 'active' | 'inactive' | 'suspended';
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

export interface UpdateCustomerInput extends Partial<Omit<CreateCustomerInput, 'customerCode'>> {
  status?: string;
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  status?: string;
  customerType?: string;
  search?: string;
}
