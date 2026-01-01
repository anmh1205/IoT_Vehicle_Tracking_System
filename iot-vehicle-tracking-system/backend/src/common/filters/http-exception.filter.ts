import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
    path: string;
    details: any;
    traceId: string | null;
  };
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get traceId from request (set by TraceInterceptor) or generate new one
    const traceId = (request as any).traceId || uuidv4();
    const path = request.url;

    // Extract error code and message
    let errorCode: string;
    let errorMessage: string;
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
        errorCode = this.getErrorCodeFromStatus(status);
      } else {
        const responseObj = exceptionResponse as any;
        errorMessage = responseObj.message || exception.message;
        errorCode = responseObj.code || this.getErrorCodeFromStatus(status);
        errorDetails = responseObj.details || null;
      }
    } else {
      errorMessage = 'Internal server error';
      errorCode = 'INTERNAL_SERVER_ERROR';
    }

    const errorResponse: ErrorResponse = {
      error: {
        code: errorCode,
        message: errorMessage,
        status,
        path,
        details: errorDetails,
        traceId,
      },
      timestamp: new Date().toISOString(),
    };

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${errorCode}: ${errorMessage}`,
      {
        traceId,
        status,
        path,
        details: errorDetails,
      }
    );

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[status] || 'INTERNAL_SERVER_ERROR';
  }
}

