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
import {
  CreateAgentDto,
  UpdateAgentDto,
  CreateCarriereEventDto,
  CreatePieceJointeDto,
  AgentsQueryDto,
} from './dto/agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

@Controller('agents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Get()
  findAll(@Query() query: AgentsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.agents.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.agents.findOne(id, user);
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
  anciennete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.agents.anciennete(id, user);
  }

  @Post(':id/carriere')
  @Roles(Role.ADMIN, Role.DRH)
  addCarriereEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CreateCarriereEventDto,
  ) {
    return this.agents.addCarriereEvent(id, data);
  }

  @Post(':id/pieces')
  @Roles(Role.ADMIN, Role.DRH)
  addPiece(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CreatePieceJointeDto,
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
