import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { FieldEntityType, FieldType } from '../../../common/enums';

export type FieldDefinitionDocument = HydratedDocument<FieldDefinition>;

/** view/edit for one role. Spec section 21. */
export class RolePermission {
  @Prop({ default: true })
  view: boolean;

  @Prop({ default: false })
  edit: boolean;
}

/**
 * Field-level permission matrix. Governs staff/participant only — ADMIN
 * always has full view+edit regardless of this matrix (spec 21 editorial note).
 */
export class FieldPermissions {
  @Prop({ type: RolePermission, default: () => ({ view: true, edit: false }) })
  staff: RolePermission;

  @Prop({ type: RolePermission, default: () => ({ view: true, edit: true }) })
  participant: RolePermission;
}

export class DisplaySettings {
  @Prop({ default: true })
  showInList: boolean;

  @Prop({ default: 0 })
  order: number;
}

export class SearchSettings {
  @Prop({ default: false })
  searchable: boolean;

  @Prop({ default: false })
  filterable: boolean;

  /**
   * Sorting a dynamic field requires an aggregation pipeline over the
   * Attribute Pattern array, not an index-backed sort (spec section 40).
   */
  @Prop({ default: false })
  sortable: boolean;
}

/**
 * Definition of one dynamic field for an institution + entity type.
 * Spec sections 25-32, 54. Only Participant/Staff/Group support dynamic
 * fields in v1 (spec section 26 editorial note).
 */
@Schema({ timestamps: true, collection: 'field_definitions' })
export class FieldDefinition {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ type: String, enum: FieldEntityType, required: true, index: true })
  entityType: FieldEntityType;

  @Prop({ required: true, trim: true })
  displayName: string;

  /**
   * System-generated, never shown to users, never editable after creation
   * (spec section 27). Stable even if displayName changes.
   */
  @Prop({ required: true })
  internalKey: string;

  @Prop({ type: String, enum: FieldType, required: true })
  fieldType: FieldType;

  @Prop({ default: false })
  required: boolean;

  @Prop({ type: FieldPermissions, default: () => ({}) })
  permissions: FieldPermissions;

  @Prop({ type: DisplaySettings, default: () => ({}) })
  displaySettings: DisplaySettings;

  @Prop({ type: SearchSettings, default: () => ({}) })
  searchSettings: SearchSettings;
}

export const FieldDefinitionSchema =
  SchemaFactory.createForClass(FieldDefinition);

FieldDefinitionSchema.index({ institutionId: 1, entityType: 1 });
FieldDefinitionSchema.index(
  { institutionId: 1, internalKey: 1 },
  { unique: true },
);
