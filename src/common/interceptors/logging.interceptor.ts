import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedUser } from '../interfaces';

/**
 * Application logging (spec section 96): "Important operations" — every
 * request that completes successfully is logged with enough context to
 * reconstruct who did what, without logging request/response bodies (which
 * could contain passwords or other sensitive customFields values).
 *
 * Errors are deliberately NOT logged here — AllExceptionsFilter already
 * owns error logging (spec 95, 96) with the actual error code/message.
 * Logging the same failed request twice, once here and once there, would
 * just be noise. This interceptor only runs its `tap` on the success path.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        const actor = request.user
          ? `user=${request.user.userId} role=${request.user.role} institution=${request.user.institutionId ?? 'none'}`
          : 'anonymous';
        this.logger.log(`${method} ${originalUrl} ${durationMs}ms — ${actor}`);
      }),
    );
  }
}
