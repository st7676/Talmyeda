import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

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

/** The data a would-be participant submitted, copied onto Participant on approval (spec 15). */
export class RequestedData {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  // _id: false — the canonical shape is [{ k, v }] (spec section 35).
  @Prop({ type: [{ k: String, v: Object, _id: false }], default: [] })
  customFields: CustomFieldEntry[];
}

/**
 * Temporary storage for self-registration requests before Administrator
 * review. Spec sections 13, 14, 56. Not immediately added to the active
 * system (spec 13) — becomes a Participant only on approve (spec 15).
 */
@Schema({ timestamps: true, collection: 'registration_requests' })
export class RegistrationRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ type: RequestedData, required: true })
  requestedData: RequestedData;

  @Prop({
    type: String,
    enum: RegistrationRequestStatus,
    default: RegistrationRequestStatus.Pending,
    index: true,
  })
  status: RegistrationRequestStatus;
}

export const RegistrationRequestSchema =
  SchemaFactory.createForClass(RegistrationRequest);

RegistrationRequestSchema.index({ institutionId: 1, status: 1 });
