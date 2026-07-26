import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DRH, Role.DIRECTEUR_GENERAL)
  findAll(
    @Query('search') search?: string,
    @Query('statut') statut?: string,
    @Query('structureId') structureId?: string,
  ) {
    return this.agents.findAll({
      search,
      statut,
      structureId: structureId ? Number(structureId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agents.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DRH)
  create(@Body() dto: CreateAgentDto) {
    return this.agents.create(dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.DRH)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAgentDto) {
    return this.agents.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.agents.remove(id);
  }

  @Get(':id/anciennete')
  anciennete(@Param('id', ParseIntPipe) id: number) {
    return this.agents.anciennete(id);
  }

  @Post(':id/carriere')
  @Roles(Role.ADMIN, Role.DRH)
  addCarriereEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.agents.addCarriereEvent(id, data);
  }

  @Post(':id/pieces')
  @Roles(Role.ADMIN, Role.DRH)
  addPiece(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.agents.addPiece(id, data);
  }

  @Delete(':id/pieces/:pieceId')
  @Roles(Role.ADMIN, Role.DRH)
  removePiece(
    @Param('id', ParseIntPipe) id: number,
    @Param('pieceId', ParseIntPipe) pieceId: number,
  ) {
    return this.agents.removePiece(id, pieceId);
  }
}
