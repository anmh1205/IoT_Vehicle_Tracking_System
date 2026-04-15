interface PostgresErrorLike {
  code?: string;
}

const getPostgresErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  return (error as PostgresErrorLike).code;
};

export const isUndefinedTableError = (error: unknown): boolean =>
  getPostgresErrorCode(error) === '42P01';

export const isUndefinedColumnError = (error: unknown): boolean =>
  getPostgresErrorCode(error) === '42703';
