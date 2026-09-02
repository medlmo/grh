import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { CongesService, CongesUser } from './conges.service';
import {
  CalendrierQueryDto,
  CongesQueryDto,
  CreateCongeDto,
  RefuserCongeDto,
  ValiderCongeDto,
} from './dto/conge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('conges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CongesController {
  constructor(private conges: CongesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CongesQueryDto,
  ) {
    return this.conges.findAll(user, {
      ...query,
      mine: query.mine === 'true',
      debut: query.debut ? new Date(query.debut) : undefined,
      fin: query.fin ? new Date(query.fin) : undefined,
    });
  }

  @Get('types')
  getTypes(@Query() query: PaginationQueryDto) {
    return this.conges.getTypesConge(query);
  }

  @Get('a-valider')
  findAValider(@CurrentUser() user: CongesUser, @Query() query: PaginationQueryDto) {
    return this.conges.findAValider(user, query);
  }

  @Get('a-valider/count')
  countAValider(@CurrentUser() user: CongesUser) {
    return this.conges.countAValider(user);
  }

  @Get('calendrier')
  getCalendrier(
    @CurrentUser() user: CongesUser,
    @Query() query: CalendrierQueryDto,
  ) {
    return this.conges.getCalendrier(user, new Date(query.debut), new Date(query.fin), {
      structureId: query.structureId,
      type: query.type,
    }, query);
  }

  @Get('solde/:agentId')
  async getSolde(@Param('agentId', ParseIntPipe) agentId: number, @CurrentUser() user: CongesUser) {
    await this.conges.assertCanAccessAgent(agentId, user);
    return this.conges.getSolde(agentId);
  }

  @Post('solde/:agentId/recalculer')
  @Roles(Role.ADMIN, Role.DRH)
  recalculerSolde(@Param('agentId', ParseIntPipe) agentId: number) {
    return this.conges.recalculerSolde(agentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.conges.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateCongeDto, @CurrentUser() user: CongesUser) {
    return this.conges.create(dto, user);
  }

  // ============================================================
  //  Workflow hiérarchique : Agent → Chef de Division → Directeur
  // ============================================================

  @Post(':id/soumettre')
  soumettre(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CongesUser) {
    return this.conges.soumettre(id, user);
  }

  /** N1 : Chef de Division (et Chef de Service) */
  @Post(':id/valider-n1')
  @Roles(Role.CHEF_DIVISION, Role.CHEF_SERVICE)
  validerN1(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CongesUser,
    @Body() dto: ValiderCongeDto,
  ) {
    return this.conges.validerN1(id, user, dto.commentaire);
  }

  /** N2 : Directeur Général et Président (validation finale). */
  @Post(':id/valider-n2')
  @Roles(Role.DIRECTEUR_GENERAL, Role.PRESIDENT)
  validerN2(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CongesUser,
    @Body() dto: ValiderCongeDto,
  ) {
    return this.conges.validerN2(id, user, dto.commentaire);
  }

  /** Relecture RH optionnelle avant validation finale. */
  @Post(':id/valider-drh')
  @Roles(Role.DRH, Role.DIRECTEUR_GENERAL, Role.PRESIDENT)
  validerDrh(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CongesUser,
    @Body() dto: ValiderCongeDto,
  ) {
    return this.conges.validerDrh(id, user, dto.commentaire);
  }

  @Post(':id/refuser')
  @Roles(Role.CHEF_DIVISION, Role.CHEF_SERVICE, Role.DRH, Role.DIRECTEUR_GENERAL, Role.PRESIDENT)
  refuser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CongesUser,
    @Body() dto: RefuserCongeDto,
  ) {
    if (!dto.motifRefus) throw new BadRequestException('Motif de refus requis.');
    return this.conges.refuser(id, user, dto.motifRefus);
  }

  @Post(':id/annuler')
  annuler(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser() user: CongesUser,
  ) {
    return this.conges.annuler(id, userId, user);
  }
}
