import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../../../common/errors/app-error';
import { AuthenticatedUser } from '../../../common/interfaces';
import { CaslAbilityFactory } from '../casl-ability.factory';
import {
  CHECK_ABILITY_KEY,
  RequiredAbility,
} from '../decorators/check-ability.decorator';

/**
 * CaslAbilityGuard (spec section 93): dynamically builds the user's CASL
 * ability and checks the entity-level action declared via @CheckAbility().
 * Routes without @CheckAbility are left to RolesGuard / normal auth.
 */
@Injectable()
export class CaslAbilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<
      RequiredAbility | undefined
    >(CHECK_ABILITY_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw AppError.unauthorized('Authentication required', 'UNAUTHENTICATED');
    }

    const ability = this.abilityFactory.createForUser(user);
    if (!ability.can(required.action, required.subject)) {
      throw AppError.forbidden(
        `Not permitted to ${required.action} ${required.subject}`,
        'FORBIDDEN_ABILITY',
      );
    }
    return true;
  }
}
