import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Role } from '../../../common/enums';

export type MessageDocument = HydratedDocument<Message>;

/**
 * Minimal one-way "contact the admin" inbox — not a full chat/thread system.
 * New feature (no prior spec coverage): user explicitly asked "שמשתמש יוכל
 * לשלוח הודעות למנהל" (a user should be able to send messages to the
 * admin). Scoped deliberately small and additive, consistent with how the
 * rest of this codebase favors "simplest thing that satisfies the ask"
 * over speculative generality (see PROGRESS.md open decisions elsewhere):
 * PARTICIPANT/STAFF -> Admin only, no replies, no threading. If two-way
 * conversation turns out to be needed, this schema/module is the natural
 * place to extend rather than a breaking change.
 */
@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: String, enum: [Role.Participant, Role.Staff], required: true })
  fromRole: Role.Participant | Role.Staff;

  /**
   * Snapshot of the sender's username at send time (which, per the
   * self-registration credential scheme, is their real name) — avoids a
   * join/populate just to label a message in the admin inbox, and stays
   * correct even if the User is later deleted.
   */
  @Prop({ required: true, trim: true })
  fromUsername: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  body: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ institutionId: 1, createdAt: -1 });
