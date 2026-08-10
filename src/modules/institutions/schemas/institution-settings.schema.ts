import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type InstitutionSettingsDocument = HydratedDocument<InstitutionSettings>;

/** How participant login accounts are provisioned. Spec section 12, 47. */
export enum ParticipantUserMode {
  Always = 'always', // Option A — every participant gets a User
  Never = 'never', // Option B — participants never get a User
  Optional = 'optional', // Option C — optional
}

/** Per-institution configurable behavior. Spec sections 6.2, 47. */
@Schema({ timestamps: true, collection: 'institution_settings' })
export class InstitutionSettings {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    required: true,
    unique: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ParticipantUserMode,
    default: ParticipantUserMode.Optional,
  })
  participantUserMode: ParticipantUserMode;

  @Prop({ default: false })
  selfRegistrationEnabled: boolean;

  @Prop({ default: true })
  requireApproval: boolean;

  @Prop({ default: true })
  allowMultipleGroups: boolean;

  @Prop({ default: false })
  staffGroupManagementEnabled: boolean;
}

export const InstitutionSettingsSchema =
  SchemaFactory.createForClass(InstitutionSettings);
