import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  meta?: {
    timestamp: string;
    [key: string]: any;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data already has the standard format, return as is
        if (data && typeof data === 'object' && 'data' in data) {
          return {
            ...data,
            meta: {
              ...data.meta,
              timestamp: new Date().toISOString(),
            },
          };
        }

        // Wrap in standard format
        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      })
    );
  }
}

