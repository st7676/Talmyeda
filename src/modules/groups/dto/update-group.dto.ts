import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';

/** Spec section 77. */
export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
