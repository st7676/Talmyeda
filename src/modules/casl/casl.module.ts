import { Global, Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';

/**
 * Global so every feature module can inject CaslAbilityFactory / use the
 * CaslAbilityGuard without re-importing it (spec 93 — central engine).
 */
@Global()
@Module({
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
