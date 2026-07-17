import * as violationRepo from '@/domain/violation/repositories/violation.repository';
import { sanitizeViolation } from '@/domain/violation/services/violation-crud.service';
import type {
  Violation,
  ViolationListQuery,
  ViolationPublic,
} from '@/domain/violation/types/violation.types';
import { isUndefinedTableError } from '@/shared/utils/postgres-error.util';

export const listViolations = async (
  query: ViolationListQuery,
): Promise<{
  items: ViolationPublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  let result: { violations: Violation[]; total: number };
  try {
    result = await violationRepo.findAll(query);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
    throw error;
  }

  return {
    items: result.violations.map(sanitizeViolation),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
