import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { GroupsService } from '../groups/groups.service';
import { ParticipantsService } from '../participants/participants.service';
import { AssignParticipantGroupDto } from './dto/assign-participant-group.dto';
import {
  ParticipantGroup,
  ParticipantGroupDocument,
} from './schemas/participant-group.schema';

@Injectable()
export class ParticipantGroupsService {
  constructor(
    @InjectModel(ParticipantGroup.name)
    private readonly participantGroupModel: Model<ParticipantGroupDocument>,
    private readonly participantsService: ParticipantsService,
    private readonly groupsService: GroupsService,
  ) {}

  /** POST /participant-groups. Spec section 78. */
  async assign(
    institutionId: string,
    dto: AssignParticipantGroupDto,
  ): Promise<ParticipantGroupDocument> {
    // Enforce same-tenant references (spec 58.1).
    await this.participantsService.assertExists(
      dto.participantId,
      institutionId,
    );
    await this.groupsService.assertExists(dto.groupId, institutionId);

    return this.participantGroupModel.create({
      institutionId,
      participantId: dto.participantId,
      groupId: dto.groupId,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: null,
      active: true,
    });
  }

  findForParticipant(institutionId: string, participantId: string) {
    return this.participantGroupModel
      .find({ institutionId, participantId })
      .exec();
  }

  /**
   * Active memberships only — this is "who's currently in the group", not
   * full history. Now exposed via GET /participant-groups?groupId=X (was
   * written but never routed to anything before).
   */
  findForGroup(institutionId: string, groupId: string) {
    return this.participantGroupModel
      .find({ institutionId, groupId, active: true })
      .exec();
  }

  /**
   * DELETE /participant-groups/:id. Spec sections 18, 78: never physically
   * remove historical membership — close it out with active=false + endDate.
   */
  async deactivate(id: string, institutionId: string): Promise<void> {
    const res = await this.participantGroupModel
      .findOneAndUpdate(
        { _id: id, institutionId, active: true },
        { active: false, endDate: new Date() },
      )
      .exec();
    if (!res)
      throw AppError.notFound(
        'Active membership not found',
        'MEMBERSHIP_NOT_FOUND',
      );
  }
}
