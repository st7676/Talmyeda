import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  SKIP_MUST_CHANGE_PASSWORD_KEY,
} from '../../../common/decorators';
import { AppError } from '../../../common/errors/app-error';
import { AuthenticatedUser } from '../../../common/interfaces';
import { UsersService } from '../users.service';

/**
 * Enforces spec section 70.1: a User created with a temporary password
 * (mustChangePassword: true) must change it before doing anything else.
 *
 * mustChangePassword deliberately isn't in the JWT (spec 67 — no
 * frequently-changing settings in the token), so this guard re-reads the
 * User record on every protected request. That's a real per-request DB
 * cost; documented as an accepted trade-off in PROGRESS.md rather than
 * caching, since staleness here has a security implication (a user who
 * just changed their password must be unblocked immediately, not after a
 * cache TTL).
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_MUST_CHANGE_PASSWORD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) return true; // JwtAuthGuard already rejected unauthenticated requests.

    const record = await this.usersService.findByIdForAuth(user.userId);
    if (record?.mustChangePassword) {
      throw AppError.forbidden(
        'Password change required before continuing',
        'MUST_CHANGE_PASSWORD',
      );
    }
    return true;
  }
}
