/**
 * Customer Types - CORRECTED based on REVIEW_CORRECTIONS.md
 */
import type { BaseEntity, QueryParams } from './common';

export type CustomerStatus = 'active' | 'suspended' | 'blacklisted';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Customer extends BaseEntity {
  userId?: number;
  fullName: string;           // Backend uses "fullName" not "name"
  email?: string;
  phone: string;              // Required in backend
  dateOfBirth?: string;
  // ID Card info
  idCardNumber?: string;
  idCardIssueDate?: string;
  idCardIssuePlace?: string;
  address?: string;
  // Driver's license info
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  licenseIssuePlace?: string;
  // Status
  status: CustomerStatus;     // Backend uses "status" not "isActive"
  verificationStatus: VerificationStatus;
  verifiedBy?: number;
  verifiedAt?: string;
  // Rental stats
  totalRentals?: number;
  totalSpent?: number;
  ratingAverage?: number;
}

export interface CreateCustomerDto {
  fullName: string;
  email?: string;
  phone: string;              // Required
  dateOfBirth?: string;
  idCardNumber?: string;
  idCardIssueDate?: string;
  idCardIssuePlace?: string;
  address?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  licenseIssuePlace?: string;
  status?: CustomerStatus;
  userId?: number;
}

export interface UpdateCustomerDto {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  idCardNumber?: string;
  idCardIssueDate?: string;
  idCardIssuePlace?: string;
  address?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  licenseIssuePlace?: string;
  status?: CustomerStatus;
  verificationStatus?: VerificationStatus;
}

export interface QueryCustomerDto extends QueryParams {
  status?: CustomerStatus;
  verificationStatus?: VerificationStatus;
}

