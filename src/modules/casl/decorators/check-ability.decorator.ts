import { SetMetadata } from '@nestjs/common';
import { Action, Subject } from '../casl-ability.factory';

export const CHECK_ABILITY_KEY = 'checkAbility';

export interface RequiredAbility {
  action: Action;
  subject: Subject;
}

/** Declares the entity-level CASL check a route requires. Spec 20, 93. */
export const CheckAbility = (action: Action, subject: Subject) =>
  SetMetadata(CHECK_ABILITY_KEY, { action, subject });
