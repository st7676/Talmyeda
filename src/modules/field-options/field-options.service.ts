import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FieldType } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import {
  FieldDefinition,
  FieldDefinitionDocument,
} from '../field-definitions/schemas/field-definition.schema';
import { CreateFieldOptionDto } from './dto/create-field-option.dto';
import { UpdateFieldOptionDto } from './dto/update-field-option.dto';
import {
  FieldOption,
  FieldOptionDocument,
} from './schemas/field-option.schema';

@Injectable()
export class FieldOptionsService {
  constructor(
    @InjectModel(FieldOption.name)
    private readonly fieldOptionModel: Model<FieldOptionDocument>,
    @InjectModel(FieldDefinition.name)
    private readonly fieldDefinitionModel: Model<FieldDefinitionDocument>,
  ) {}

  /** POST /field-options. Spec section 83. */
  async create(
    institutionId: string,
    dto: CreateFieldOptionDto,
  ): Promise<FieldOptionDocument> {
    const field = await this.fieldDefinitionModel
      .findOne({ _id: dto.fieldId, institutionId })
      .exec();
    if (!field)
      throw AppError.notFound(
        'Field definition not found',
        'FIELD_DEFINITION_NOT_FOUND',
      );
    if (
      field.fieldType !== FieldType.Select &&
      field.fieldType !== FieldType.MultiSelect
    ) {
      throw AppError.validation(
        'Field options only apply to Select or MultiSelect fields',
        'INVALID_FIELD_TYPE',
      );
    }

    return this.fieldOptionModel.create({
      fieldId: dto.fieldId,
      institutionId,
      label: dto.label,
      value: dto.value,
      order: dto.order ?? 0,
      isActive: true,
    });
  }

  /** GET /field-options?fieldId=... — active options for a field, ordered. */
  findForField(
    institutionId: string,
    fieldId: string,
    includeInactive = false,
  ) {
    const filter: Record<string, unknown> = { institutionId, fieldId };
    if (!includeInactive) filter.isActive = true;
    return this.fieldOptionModel.find(filter).sort({ order: 1 }).exec();
  }

  /** Active option values, used by FieldDefinitions to validate Select/MultiSelect data. */
  async activeValues(
    institutionId: string,
    fieldId: string,
  ): Promise<Set<string>> {
    const options = await this.fieldOptionModel
      .find({ institutionId, fieldId, isActive: true })
      .select('value')
      .exec();
    return new Set(options.map((o) => o.value));
  }

  /** PUT /field-options/:id — rename/reorder. Spec section 34. */
  async update(
    id: string,
    institutionId: string,
    dto: UpdateFieldOptionDto,
  ): Promise<FieldOptionDocument> {
    const option = await this.fieldOptionModel
      .findOneAndUpdate(
        { _id: id, institutionId },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!option)
      throw AppError.notFound(
        'Field option not found',
        'FIELD_OPTION_NOT_FOUND',
      );
    return option;
  }

  /**
   * DELETE /field-options/:id — never physically delete an option that may
   * already be referenced by existing records; disable instead (spec 34).
   */
  async disable(id: string, institutionId: string): Promise<void> {
    const res = await this.fieldOptionModel
      .findOneAndUpdate({ _id: id, institutionId }, { isActive: false })
      .exec();
    if (!res)
      throw AppError.notFound(
        'Field option not found',
        'FIELD_OPTION_NOT_FOUND',
      );
  }
}
