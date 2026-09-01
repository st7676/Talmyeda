import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { QueryInstitutionsDto } from './dto/query-institutions.dto';
import { InstitutionsService } from './institutions.service';

/**
 * Platform-operator endpoints. SUPER_ADMIN only, never tenant-scoped.
 * Spec section 69.1.
 */
@Roles(Role.SuperAdmin)
@Controller('platform/institutions')
export class PlatformController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  /**
   * GET /platform/institutions?status=Pending
   *
   * Bug fixed here: `status` and pagination used to be two separate
   * @Query() bindings (one loose param, one DTO). Since the global
   * ValidationPipe runs with forbidNonWhitelisted: true, the pagination DTO
   * — which didn't declare `status` — rejected every request that included
   * a status filter with "property status should not exist", silently
   * breaking this filter entirely. Found while wiring up the frontend's
   * platform-admin screen. Now a single combined DTO handles both.
   */
  @Get()
  list(@Query() query: QueryInstitutionsDto) {
    return this.institutionsService.listByStatus(query.status, query);
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
