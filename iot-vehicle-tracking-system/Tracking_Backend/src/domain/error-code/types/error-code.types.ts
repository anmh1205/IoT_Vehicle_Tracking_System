export interface ErrorCodeDefinition {
  id: number;
  code: number;
  name: string;
  name_vi: string;
  description: string | null;
  category: string;
  severity: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ErrorCodePublic {
  code: number;
  name: string;
  nameVi: string;
  description: string | null;
  category: string;
  severity: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErrorCodeInput {
  code: number;
  name: string;
  nameVi: string;
  description?: string;
  category: string;
  severity: string;
}

export interface UpdateErrorCodeInput {
  name?: string;
  nameVi?: string;
  description?: string | null;
  category?: string;
  severity?: string;
}
