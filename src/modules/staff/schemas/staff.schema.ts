import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type StaffDocument = HydratedDocument<Staff>;

export class CustomFieldEntry {
  @Prop({ required: true })
  k: string;

  @Prop({ type: Object, required: true })
  v: unknown;
}

/** Institution employee (teacher, instructor, coordinator...). Spec section 50. */
@Schema({ timestamps: true, collection: 'staff' })
export class Staff {
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

  // _id: false — the canonical shape is [{ k, v }] (spec section 35).
  @Prop({ type: [{ k: String, v: Object, _id: false }], default: [] })
  customFields: CustomFieldEntry[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);

StaffSchema.index({ institutionId: 1, lastName: 1 });
StaffSchema.index({
  institutionId: 1,
  'customFields.k': 1,
  'customFields.v': 1,
});
