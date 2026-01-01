import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown
  ) {
    super(
      {
        code,
        message,
        status,
        details: details || null,
      },
      status
    );
  }
}

