import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  constructor(message: string, details?: unknown) {
    super(
      {
        code: 'VALIDATION_ERROR',
        message,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        details: details || null,
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}

