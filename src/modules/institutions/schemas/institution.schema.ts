import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { InstitutionStatus } from '../../../common/enums';

export type InstitutionDocument = HydratedDocument<Institution>;

/** Tenant organization. Spec sections 6.1, 46. */
@Schema({ timestamps: true, collection: 'institutions' })
export class Institution {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: InstitutionStatus,
    default: InstitutionStatus.Pending,
    index: true,
  })
  status: InstitutionStatus;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const InstitutionSchema = SchemaFactory.createForClass(Institution);
