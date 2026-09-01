import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { FieldEntityType } from '../../../common/enums';

export type RegistrationRequestDocument = HydratedDocument<RegistrationRequest>;

/** Statuses. Spec section 14. */
export enum RegistrationRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export class CustomFieldEntry {
  @Prop({ required: true })
  k: string;

  @Prop({ type: Object, required: true })
  v: unknown;
}

/**
 * The data a would-be participant submitted, copied onto Participant on
 * approval (spec 15). Must be `@Schema()` + `SchemaFactory.createForClass()`
 * and referenced by its Schema (not the bare class) from the parent's
 * `@Prop({ type: ... })` — a bare class silently falls back to `Mixed` in
 * Mongoose, losing `trim: true`/defaults/validation (critical bug #3,
 * 2026-08-13, see PROGRESS.md and field-definition.schema.ts for the same
 * pattern found and fixed there first).
 */
@Schema({ _id: false })
export class RequestedData {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  // _id: false — the canonical shape is [{ k, v }] (spec section 35).
  @Prop({ type: [{ k: String, v: Object, _id: false }], default: [] })
  customFields: CustomFieldEntry[];
}
export const RequestedDataSchema = SchemaFactory.createForClass(RequestedData);

/**
 * Temporary storage for self-registration requests before Administrator
 * review. Spec sections 13, 14, 56. Not immediately added to the active
 * system (spec 13) — becomes a Participant only on approve (spec 15).
 */
@Schema({ timestamps: true, collection: 'registration_requests' })
export class RegistrationRequest {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ type: RequestedDataSchema, required: true })
  requestedData: RequestedData;

  @Prop({
    type: String,
    enum: RegistrationRequestStatus,
    default: RegistrationRequestStatus.Pending,
    index: true,
  })
  status: RegistrationRequestStatus;

  /**
   * Which entity self-registration produces on approval. Defaults to
   * Participant for backward compatibility with requests submitted before
   * this field existed (spec 13-15 originally only covered participants;
   * extended to support Staff self-registration too — never Group, that
   * has no self-registration concept). Only Participant/Staff are valid
   * here; enforced by SubmitRegistrationRequestDto's @IsIn, not by the
   * Mongoose enum (which would also have to include Group otherwise).
   */
  @Prop({
    type: String,
    enum: [FieldEntityType.Participant, FieldEntityType.Staff],
    default: FieldEntityType.Participant,
  })
  entityType: FieldEntityType.Participant | FieldEntityType.Staff;

  /**
   * True if, at submission time, an already-approved Participant/Staff
   * record with this exact name existed at the institution. Deliberately a
   * *warning* surfaced to the Admin reviewing the request, not a hard
   * block — an earlier version rejected the submission outright, which
   * would permanently lock out a genuine second person who happens to
   * share a name with someone already registered (not rare at all in a
   * school-sized institution). Computed once at submit() and persisted
   * rather than recomputed on every list/approve call, so it reflects what
   * was true when the person actually registered even if the matching
   * record is later renamed/deleted.
   */
  @Prop({ default: false })
  possibleDuplicate: boolean;
}

export const RegistrationRequestSchema =
  SchemaFactory.createForClass(RegistrationRequest);

RegistrationRequestSchema.index({ institutionId: 1, status: 1 });
