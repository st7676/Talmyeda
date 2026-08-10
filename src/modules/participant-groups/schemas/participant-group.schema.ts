import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ParticipantGroupDocument = HydratedDocument<ParticipantGroup>;

/**
 * Many-to-many relationship between participants and groups. History is
 * preserved (never hard-deleted) — spec sections 17, 18, 52.
 * v1 does not enforce uniqueness on overlapping active memberships
 * (spec 52 editorial note) — duplicates are allowed, left to the institution.
 */
@Schema({ timestamps: true, collection: 'participant_groups' })
export class ParticipantGroup {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Participant',
    required: true,
    index: true,
  })
  participantId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  })
  groupId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ default: true })
  active: boolean;
}

export const ParticipantGroupSchema =
  SchemaFactory.createForClass(ParticipantGroup);

ParticipantGroupSchema.index({ institutionId: 1, participantId: 1 });
ParticipantGroupSchema.index({ institutionId: 1, groupId: 1 });
