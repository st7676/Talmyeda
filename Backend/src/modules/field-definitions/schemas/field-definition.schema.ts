import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { FieldEntityType, FieldType } from '../../../common/enums';

export type FieldDefinitionDocument = HydratedDocument<FieldDefinition>;

/**
 * Nested/embedded classes below (RolePermission, FieldPermissions,
 * DisplaySettings, SearchSettings) must each be decorated with `@Schema()`
 * and turned into a real Schema via `SchemaFactory.createForClass()`, and
 * the *Schema* variable — not the bare class — must be passed to the
 * parent's `@Prop({ type: ... })`. Critical bug found 2026-08-13 (third
 * instance of the "silently falls back to Mixed" pattern, see PROGRESS.md):
 * these classes previously had @Prop() metadata but were never built into
 * schemas, so `@Prop({ type: FieldPermissions })` etc. passed a bare
 * class Mongoose doesn't recognize as a SchemaType — it silently fell back
 * to `Mixed`. That meant NONE of `permissions`/`displaySettings`/
 * `searchSettings`'s nested defaults ever applied: any FieldDefinition
 * created without explicitly specifying the full object had that entire
 * key **absent from the stored document** (not even `{}`). In particular,
 * `permissions.participant.edit` (spec 21's documented default "Participant
 * can edit own fields unless overridden") silently evaluated as `undefined`
 * for every field an Admin didn't explicitly grant, which
 * DynamicFieldsValidatorService correctly treats as "no permission" —
 * so self-registration / participant self-edit of any field created
 * without an explicit `permissions` block was always rejected. Only
 * surfaced now because every prior FieldDefinition-creating test either
 * wrote as ADMIN (which skips the permission check entirely, spec 21) or
 * explicitly supplied `searchSettings`/`permissions` in full.
 */
@Schema({ _id: false })
export class RolePermission {
  @Prop({ default: true })
  view: boolean;

  @Prop({ default: false })
  edit: boolean;
}
export const RolePermissionSchema =
  SchemaFactory.createForClass(RolePermission);

/**
 * Field-level permission matrix. Governs staff/participant only — ADMIN
 * always has full view+edit regardless of this matrix (spec 21 editorial note).
 */
@Schema({ _id: false })
export class FieldPermissions {
  @Prop({
    type: RolePermissionSchema,
    default: () => ({ view: true, edit: false }),
  })
  staff: RolePermission;

  @Prop({
    type: RolePermissionSchema,
    default: () => ({ view: true, edit: true }),
  })
  participant: RolePermission;
}
export const FieldPermissionsSchema =
  SchemaFactory.createForClass(FieldPermissions);

@Schema({ _id: false })
export class DisplaySettings {
  @Prop({ default: true })
  showInList: boolean;

  @Prop({ default: 0 })
  order: number;
}
export const DisplaySettingsSchema =
  SchemaFactory.createForClass(DisplaySettings);

@Schema({ _id: false })
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
export const SearchSettingsSchema =
  SchemaFactory.createForClass(SearchSettings);

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

  @Prop({ type: FieldPermissionsSchema, default: () => ({}) })
  permissions: FieldPermissions;

  @Prop({ type: DisplaySettingsSchema, default: () => ({}) })
  displaySettings: DisplaySettings;

  @Prop({ type: SearchSettingsSchema, default: () => ({}) })
  searchSettings: SearchSettings;
}

export const FieldDefinitionSchema =
  SchemaFactory.createForClass(FieldDefinition);

FieldDefinitionSchema.index({ institutionId: 1, entityType: 1 });
FieldDefinitionSchema.index(
  { institutionId: 1, internalKey: 1 },
  { unique: true },
);
