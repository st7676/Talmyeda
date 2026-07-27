import { Module } from '@nestjs/common';
import { FieldDefinitionsModule } from '../field-definitions/field-definitions.module';
import { FieldOptionsModule } from '../field-options/field-options.module';
import { DynamicFieldsValidatorService } from './dynamic-fields-validator.service';

/**
 * Leaf module: depends only on FieldDefinitions/FieldOptions (which in turn
 * reach Participant/Staff/Group via raw schema registration, not module
 * imports — see field-definitions.module.ts). This keeps Participants/
 * Staff/Groups free to import DynamicFieldsModule without any cycle.
 */
@Module({
  imports: [FieldDefinitionsModule, FieldOptionsModule],
  providers: [DynamicFieldsValidatorService],
  exports: [DynamicFieldsValidatorService],
})
export class DynamicFieldsModule {}
