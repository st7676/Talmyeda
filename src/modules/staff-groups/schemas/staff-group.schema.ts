import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StaffGroupDocument = HydratedDocument<StaffGroup>;

/**
 * Relationship between staff members and groups. Usage depends on
 * institution settings (staffGroupManagementEnabled). Spec section 53, 19, 79.
 */
@Schema({ timestamps: true, collection: 'staff_groups' })
export class StaffGroup {
  @Prop({
    type: Types.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Staff', required: true, index: true })
  staffId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  roleDescription: string | null;
}

export const StaffGroupSchema = SchemaFactory.createForClass(StaffGroup);

StaffGroupSchema.index({ institutionId: 1, staffId: 1 });
StaffGroupSchema.index({ institutionId: 1, groupId: 1 });
