import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

/** Custom field value entry. Attribute Pattern — spec section 35. */
export class CustomFieldEntry {
  @Prop({ required: true })
  k: string;

  @Prop({ type: Object, required: true })
  v: unknown;
}

/**
 * Generic organizational grouping (class, course, activity, program...).
 * The system must not assume a group means "class". Spec sections 16, 51.
 */
@Schema({ timestamps: true, collection: 'groups' })
export class Group {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  // _id: false — the canonical shape is [{ k, v }] (spec section 35).
  @Prop({ type: [{ k: String, v: Object, _id: false }], default: [] })
  customFields: CustomFieldEntry[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

GroupSchema.index({ institutionId: 1, name: 1 });
// Compound index for dynamic attribute lookup. Spec section 61.
GroupSchema.index({
  institutionId: 1,
  'customFields.k': 1,
  'customFields.v': 1,
});
