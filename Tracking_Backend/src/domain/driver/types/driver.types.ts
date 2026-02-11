export interface Driver {
  id: number;
  driver_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_type: string | null;
  license_expiry: Date | null;
  date_of_birth: Date | null;
  address: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DriverPublic {
  id: number;
  driverCode: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
  licenseType: string | null;
  licenseExpiry: string | null;
  dateOfBirth: string | null;
  address: string | null;
  avatarUrl: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverInput {
  driverCode: string;
  fullName: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiry?: string;
  dateOfBirth?: string;
  address?: string;
  avatarUrl?: string;
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {}

export interface DriverListQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
