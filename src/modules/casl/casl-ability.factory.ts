import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { Role } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';

/** Entity-level actions. Spec section 20 (Entity-Level Permissions). */
export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

/**
 * Subjects the ability reasons about. 'all' is CASL's wildcard.
 * Only entities named in spec section 5 participate.
 */
export type Subject =
  | 'Institution'
  | 'User'
  | 'Participant'
  | 'Staff'
  | 'Group'
  | 'ParticipantGroup'
  | 'StaffGroup'
  | 'FieldDefinition'
  | 'FieldOption'
  | 'RegistrationRequest'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

/**
 * Central CASL Ability Factory (spec sections 20-21, 93). Builds the
 * entity-level ability for a request's user. Context-aware relationship
 * checks (staff <-> group <-> participant, spec 519, 833) and field-level
 * permission filtering (spec 21) are layered on top by the calling service —
 * this factory answers "can this role touch this entity type at all".
 *
 * Version 1 permission limitations (spec section 22): every user of a given
 * role shares the same entity-level rules; there are no custom roles or
 * per-staff-member permission variants yet.
 */
@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthenticatedUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    switch (user.role) {
      case Role.SuperAdmin:
        // Platform operator — not institution-scoped (spec 69.1, 302).
        can('manage', 'Institution');
        break;

      case Role.Admin:
        // Full control over their own institution (spec section 9).
        can('manage', 'Institution');
        can('manage', 'User');
        can('manage', 'Participant');
        can('manage', 'Staff');
        can('manage', 'Group');
        can('manage', 'ParticipantGroup');
        can('manage', 'StaffGroup');
        can('manage', 'FieldDefinition');
        can('manage', 'FieldOption');
        can('manage', 'RegistrationRequest');
        break;

      case Role.Staff:
        // Cannot manage institution settings, fields, permissions, or other
        // users/staff (spec section 10). Participant access is entity-level
        // here; group-scoping is enforced separately (context-aware check).
        can('read', 'Group');
        can('read', 'Participant');
        can('update', 'Participant');
        can('read', 'RegistrationRequest');
        can('create', 'RegistrationRequest');
        break;

      case Role.Participant:
        // Only their own record; enforced by the caller comparing
        // participantId, since CASL field conditions here can't see the
        // JWT's linked participantId (spec section 11).
        can('read', 'Participant');
        can('update', 'Participant');
        can('read', 'Group');
        break;
    }

    return build();
  }
}
