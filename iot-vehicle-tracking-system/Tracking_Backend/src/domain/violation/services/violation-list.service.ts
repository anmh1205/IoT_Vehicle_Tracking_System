import * as violationRepo from '@/domain/violation/repositories/violation.repository';
import { sanitizeViolation } from '@/domain/violation/services/violation-crud.service';
import type { ViolationListQuery, ViolationPublic } from '@/domain/violation/types/violation.types';

export const listViolations = async (
  query: ViolationListQuery,
): Promise<{
  items: ViolationPublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await violationRepo.findAll(query);

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
