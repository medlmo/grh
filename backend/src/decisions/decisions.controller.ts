import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { CreateDecisionDto } from './dto/decision.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('decisions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DecisionsController {
  constructor(private decisions: DecisionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DRH, Role.CHEF_DIVISION, Role.DIRECTEUR_GENERAL, Role.PRESIDENT)
  findAll(@Query('type') type?: string, @Query('agentId') agentId?: string) {
    return this.decisions.findAll({
      type,
      agentId: agentId ? Number(agentId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.decisions.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DRH)
  create(@Body() dto: CreateDecisionDto) {
    return this.decisions.create(dto);
  }

  @Post(':id/signer')
  @Roles(Role.DRH, Role.DIRECTEUR_GENERAL, Role.PRESIDENT)
  signer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.decisions.signer(id, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.decisions.remove(id);
  }
}
