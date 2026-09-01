import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FieldDefinition,
  FieldDefinitionSchema,
} from '../field-definitions/schemas/field-definition.schema';
import { FieldOptionsController } from './field-options.controller';
import { FieldOptionsService } from './field-options.service';
import { FieldOption, FieldOptionSchema } from './schemas/field-option.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FieldOption.name, schema: FieldOptionSchema },
      { name: FieldDefinition.name, schema: FieldDefinitionSchema },
    ]),
  ],
  controllers: [FieldOptionsController],
  providers: [FieldOptionsService],
  exports: [FieldOptionsService],
})
export class FieldOptionsModule {}
