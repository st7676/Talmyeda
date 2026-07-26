import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FieldOptionDocument = HydratedDocument<FieldOption>;

/**
 * A selectable value for a Select/MultiSelect FieldDefinition. Spec 33, 55.
 * institutionId is denormalized from FieldDefinition (spec 33 editorial
 * note) so tenant guards never depend on a join through fieldId, and is set
 * once at creation — a FieldOption is never moved between fields.
 */
@Schema({ timestamps: true, collection: 'field_options' })
export class FieldOption {
  @Prop({
    type: Types.ObjectId,
    ref: 'FieldDefinition',
    required: true,
    index: true,
  })
  fieldId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Institution',
    required: true,
    index: true,
  })
  institutionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ required: true, trim: true })
  value: string;

  /** Never physically delete an option in use — disable instead (spec section 34). */
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
}

export const FieldOptionSchema = SchemaFactory.createForClass(FieldOption);

FieldOptionSchema.index({ institutionId: 1, fieldId: 1 });
