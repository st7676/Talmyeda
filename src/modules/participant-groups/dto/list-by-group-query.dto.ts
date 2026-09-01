import { IsString } from 'class-validator';

export class ListByGroupQueryDto {
  @IsString()
  groupId: string;
}
