import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DRH, Role.DIRECTEUR_GENERAL, Role.PRESIDENT, Role.CHEF_DIVISION, Role.CHEF_SERVICE)
  getStats() {
    return this.dashboard.getStats();
  }
}
