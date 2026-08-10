import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ParticipantDocument = HydratedDocument<Participant>;

export class CustomFieldEntry {
  @Prop({ required: true })
  k: string;

  @Prop({ type: Object, required: true })
  v: unknown;
}

/**
 * A learner/person registered in the institution. Only universal fields live
 * here — institution-specific data goes through customFields (spec 49, 24.1).
 */
@Schema({ timestamps: true, collection: 'participants' })
export class Participant {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  // _id: false — the canonical shape is [{ k, v }] (spec section 35); no
  // per-entry _id belongs in the API surface.
  @Prop({ type: [{ k: String, v: Object, _id: false }], default: [] })
  customFields: CustomFieldEntry[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

ParticipantSchema.index({ institutionId: 1, firstName: 1 });
ParticipantSchema.index({ institutionId: 1, lastName: 1 });
ParticipantSchema.index({ institutionId: 1, createdAt: 1 });
// Compound index for dynamic attribute lookup. Spec section 61.
ParticipantSchema.index({
  institutionId: 1,
  'customFields.k': 1,
  'customFields.v': 1,
});
