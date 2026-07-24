import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { InstitutionStatus, Role } from '../../common/enums';
import { InstitutionsService } from './institutions.service';

/**
 * Platform-operator endpoints. SUPER_ADMIN only, never tenant-scoped.
 * Spec section 69.1.
 */
@Roles(Role.SuperAdmin)
@Controller('platform/institutions')
export class PlatformController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  /** GET /platform/institutions?status=Pending */
  @Get()
  list(
    @Query('status') status: InstitutionStatus | undefined,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.institutionsService.listByStatus(status, pagination);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.institutionsService.approve(id);
  }

  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.institutionsService.suspend(id);
  }

  @Post(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.institutionsService.reactivate(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.institutionsService.reject(id);
  }
}
