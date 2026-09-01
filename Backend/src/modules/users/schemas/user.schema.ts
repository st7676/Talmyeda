import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AccountStatus, Role } from '../../../common/enums';

export type UserDocument = HydratedDocument<User>;

/**
 * Authentication identity only. Holds NO business data (spec sections 7, 48).
 * Links to business entities via participantId / staffId.
 * institutionId is null only for SUPER_ADMIN (spec sections 69.1, 302).
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    default: null,
    index: true,
  })
  institutionId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  username: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: Role, required: true })
  role: Role;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Participant', default: null })
  participantId: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Staff', default: null })
  staffId: Types.ObjectId | null;

  @Prop({ type: String, enum: AccountStatus, default: AccountStatus.Active })
  status: AccountStatus;

  /** Forces a password change on first login. Spec section 70.1. */
  @Prop({ default: true })
  mustChangePassword: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  /**
   * Per-username login lockout (spec section 90.1: "limited per IP and per
   * username... with backoff/lockout"). IP-side limiting is handled
   * separately by @nestjs/throttler on the /auth/login route; this half
   * tracks failed attempts against this specific account regardless of
   * which IP they came from.
   */
  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Unique login per institution. Spec section 60.
// SUPER_ADMIN rows have institutionId = null; partial index keeps them unique too.
UserSchema.index({ institutionId: 1, username: 1 }, { unique: true });
