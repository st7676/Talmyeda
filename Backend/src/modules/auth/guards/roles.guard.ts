import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators';
import { Role } from '../../../common/enums';
import { AppError } from '../../../common/errors/app-error';
import { AuthenticatedUser } from '../../../common/interfaces';

/**
 * Coarse role gate. Fine-grained entity/field checks live in the CASL layer
 * (spec sections 20-21, 93) — this guard only enforces @Roles() route hints.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || !required.includes(user.role)) {
      throw AppError.forbidden(
        'Insufficient role permissions',
        'FORBIDDEN_ROLE',
      );
    }
    return true;
  }
}
