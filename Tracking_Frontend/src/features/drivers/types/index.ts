export interface Driver {
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
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {}
