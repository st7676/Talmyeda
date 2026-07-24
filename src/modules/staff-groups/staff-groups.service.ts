import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { GroupsService } from '../groups/groups.service';
import { StaffService } from '../staff/staff.service';
import { AssignStaffGroupDto } from './dto/assign-staff-group.dto';
import { StaffGroup, StaffGroupDocument } from './schemas/staff-group.schema';

@Injectable()
export class StaffGroupsService {
  constructor(
    @InjectModel(StaffGroup.name)
    private readonly staffGroupModel: Model<StaffGroupDocument>,
    private readonly staffService: StaffService,
    private readonly groupsService: GroupsService,
  ) {}

  /** POST /staff-groups. Spec section 79. */
  async assign(
    institutionId: string,
    dto: AssignStaffGroupDto,
  ): Promise<StaffGroupDocument> {
    await this.staffService.assertExists(dto.staffId, institutionId);
    await this.groupsService.assertExists(dto.groupId, institutionId);

    return this.staffGroupModel.create({
      institutionId,
      staffId: dto.staffId,
      groupId: dto.groupId,
      roleDescription: dto.roleDescription ?? null,
    });
  }

  findForStaff(institutionId: string, staffId: string) {
    return this.staffGroupModel.find({ institutionId, staffId }).exec();
  }

  /** DELETE /staff-groups/:id. Spec section 79. Physical removal (no membership history requirement here). */
  async remove(id: string, institutionId: string): Promise<void> {
    const res = await this.staffGroupModel
      .findOneAndDelete({ _id: id, institutionId })
      .exec();
    if (!res)
      throw AppError.notFound(
        'Staff group assignment not found',
        'STAFF_GROUP_NOT_FOUND',
      );
  }
}
