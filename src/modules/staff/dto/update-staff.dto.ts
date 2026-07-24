import { PartialType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto';

/** Spec section 76. */
export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
