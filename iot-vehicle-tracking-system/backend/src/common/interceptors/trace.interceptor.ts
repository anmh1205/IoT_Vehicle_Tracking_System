import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Get traceId from header or generate new one
    const traceId =
      (request.headers['x-trace-id'] as string) || uuidv4();

    // Attach traceId to request for use in filters and services
    (request as any).traceId = traceId;

    // Add traceId to response header
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Trace-Id', traceId);

    const startTime = Date.now();
    const { method, url } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `${method} ${url} - ${duration}ms - TraceId: ${traceId}`
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} - ${duration}ms - Error - TraceId: ${traceId}`,
            error.stack
          );
        },
      })
    );
  }
}

