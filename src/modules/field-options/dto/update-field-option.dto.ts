import { IsInt, IsOptional, IsString } from 'class-validator';

/** Spec section 34: rename, reorder. isActive is toggled only via disable (DELETE). */
export class UpdateFieldOptionDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
