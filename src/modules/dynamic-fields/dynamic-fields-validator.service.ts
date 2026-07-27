import { Injectable } from '@nestjs/common';
import { FieldEntityType, FieldType, Role } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { isValueCompatibleWithType } from '../../common/utils/field-value.util';
import { FieldDefinitionsService } from '../field-definitions/field-definitions.service';
import { FieldOptionsService } from '../field-options/field-options.service';

interface RawCustomFieldEntry {
  k: string;
  v: unknown;
}

interface ValidateParams {
  institutionId: string;
  entityType: FieldEntityType;
  /** Acting user's role — ADMIN always has full view+edit (spec 21 editorial note). */
  role: Role;
  /** undefined means "not part of this request" — nothing to validate. */
  customFields?: RawCustomFieldEntry[];
}

/**
 * The DynamicValidationPipe from spec section 36, implemented as an
 * injectable service (rather than a NestJS Pipe class) so it can be called
 * from Participants/Staff/Groups services with the entity type and acting
 * role already known. Runs on every create/update that touches customFields:
 *
 * 1. Schema lookup — active FieldDefinitions for institutionId + entityType.
 * 2. Unknown-key rejection (spec 37).
 * 3. Type/constraint validation per fieldType, including Select/MultiSelect
 *    against active FieldOption values (spec 36).
 * 4. Field-level write permission enforcement — rejects (does not silently
 *    strip) attempts to write a field the role cannot edit (spec 21, 36).
 * 5. required:true enforcement across the submitted array (spec 31).
 *
 * Note: (2)-(5) only run when customFields is actually part of the request.
 * An update that omits customFields entirely leaves existing values
 * untouched and is not re-validated here.
 */
@Injectable()
export class DynamicFieldsValidatorService {
  constructor(
    private readonly fieldDefinitionsService: FieldDefinitionsService,
    private readonly fieldOptionsService: FieldOptionsService,
  ) {}

  async validate(params: ValidateParams): Promise<void> {
    if (!params.customFields) return;

    const definitions = await this.fieldDefinitionsService.findActiveForEntity(
      params.institutionId,
      params.entityType,
    );
    const byKey = new Map(definitions.map((d) => [d.internalKey, d]));

    for (const entry of params.customFields) {
      const definition = byKey.get(entry.k);
      if (!definition) {
        throw AppError.validation(
          `Unknown custom field key: ${entry.k}`,
          'UNKNOWN_FIELD_KEY',
        );
      }

      if (params.role !== Role.Admin) {
        const rolePermission =
          params.role === Role.Staff
            ? definition.permissions.staff
            : definition.permissions.participant;
        if (!rolePermission?.edit) {
          throw AppError.forbidden(
            `No write permission for field "${definition.displayName}"`,
            'FIELD_EDIT_FORBIDDEN',
          );
        }
      }

      const activeValues =
        definition.fieldType === FieldType.Select ||
        definition.fieldType === FieldType.MultiSelect
          ? await this.fieldOptionsService.activeValues(
              params.institutionId,
              definition._id.toString(),
            )
          : undefined;

      if (
        !isValueCompatibleWithType(definition.fieldType, entry.v, activeValues)
      ) {
        throw AppError.validation(
          `Invalid value for field "${definition.displayName}" (expected ${definition.fieldType})`,
          'INVALID_FIELD_VALUE',
        );
      }
    }

    const submittedKeys = new Set(params.customFields.map((e) => e.k));
    const missingRequired = definitions.filter(
      (d) => d.required && !submittedKeys.has(d.internalKey),
    );
    if (missingRequired.length > 0) {
      throw AppError.validation(
        `Missing required field(s): ${missingRequired.map((d) => d.displayName).join(', ')}`,
        'MISSING_REQUIRED_FIELDS',
      );
    }
  }
}
