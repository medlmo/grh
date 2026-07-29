import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ParametrageService } from './parametrage.service';
import {
  CreateCorpsDto, UpdateCorpsDto,
  CreateCadreDto, UpdateCadreDto,
  CreateGradeDto, UpdateGradeDto,
  CreateEchelonDto, UpdateEchelonDto,
  CreateJourFerieDto,
  UpdateCollectiviteDto,
  CreateStructureDto,
  UpdateStructureDto,
} from './dto/parametrage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('parametrage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParametrageController {
  constructor(private param: ParametrageService) {}

  // ── Collectivité ────────────────────────────────────────────────────────────

  @Get('collectivite')
  getCollectivite() { return this.param.getCollectivite(); }

  @Put('collectivite')
  @Roles(Role.ADMIN)
  updateCollectivite(@Body() dto: UpdateCollectiviteDto) {
    return this.param.updateCollectivite(dto);
  }

  // ── Hiérarchie : Corps → Cadre → Grade → Échelon ───────────────────────────

  @Get('corps')
  getCorps() { return this.param.getCorps(); }

  @Get('corps/:id/cadres')
  getCorpsCadres(@Param('id', ParseIntPipe) id: number) {
    return this.param.getCorpsCadres(id);
  }

  @Post('corps')
  @Roles(Role.ADMIN)
  createCorps(@Body() dto: CreateCorpsDto) { return this.param.createCorps(dto); }

  @Put('corps/:id')
  @Roles(Role.ADMIN)
  updateCorps(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCorpsDto) {
    return this.param.updateCorps(id, dto);
  }

  @Delete('corps/:id')
  @Roles(Role.ADMIN)
  deleteCorps(@Param('id', ParseIntPipe) id: number) { return this.param.deleteCorps(id); }

  // ── Cadres ──────────────────────────────────────────────────────────────────

  @Get('cadres/:id/grades')
  getCadreGrades(@Param('id', ParseIntPipe) id: number) {
    return this.param.getCadreGrades(id);
  }

  @Post('cadres')
  @Roles(Role.ADMIN)
  createCadre(@Body() dto: CreateCadreDto) { return this.param.createCadre(dto); }

  @Put('cadres/:id')
  @Roles(Role.ADMIN)
  updateCadre(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCadreDto) {
    return this.param.updateCadre(id, dto);
  }

  @Delete('cadres/:id')
  @Roles(Role.ADMIN)
  deleteCadre(@Param('id', ParseIntPipe) id: number) { return this.param.deleteCadre(id); }

  // ── Grades ──────────────────────────────────────────────────────────────────

  @Get('grades/:id/echelons')
  getGradeEchelons(@Param('id', ParseIntPipe) id: number) {
    return this.param.getGradeEchelons(id);
  }

  @Post('grades')
  @Roles(Role.ADMIN)
  createGrade(@Body() dto: CreateGradeDto) { return this.param.createGrade(dto); }

  @Put('grades/:id')
  @Roles(Role.ADMIN)
  updateGrade(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGradeDto) {
    return this.param.updateGrade(id, dto);
  }

  @Delete('grades/:id')
  @Roles(Role.ADMIN)
  deleteGrade(@Param('id', ParseIntPipe) id: number) { return this.param.deleteGrade(id); }

  // ── Échelons ─────────────────────────────────────────────────────────────────

  @Post('echelons')
  @Roles(Role.ADMIN)
  createEchelon(@Body() dto: CreateEchelonDto) { return this.param.createEchelon(dto); }

  @Put('echelons/:id')
  @Roles(Role.ADMIN)
  updateEchelon(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEchelonDto) {
    return this.param.updateEchelon(id, dto);
  }

  @Delete('echelons/:id')
  @Roles(Role.ADMIN)
  deleteEchelon(@Param('id', ParseIntPipe) id: number) { return this.param.deleteEchelon(id); }

  // ── Jours fériés ─────────────────────────────────────────────────────────────

  @Get('feries')
  getJoursFeries(@Query('annee') annee?: string) {
    return this.param.getJoursFeries(annee ? Number(annee) : undefined);
  }

  @Post('feries')
  @Roles(Role.ADMIN)
  createJourFerie(@Body() dto: CreateJourFerieDto) { return this.param.createJourFerie(dto); }

  @Delete('feries/:id')
  @Roles(Role.ADMIN)
  deleteJourFerie(@Param('id', ParseIntPipe) id: number) { return this.param.deleteJourFerie(id); }

  // ── Structures (organigramme) ────────────────────────────────────────────────

  @Get('structures')
  getStructures() { return this.param.getStructures(); }

  @Get('structures/arbre')
  getStructuresArbre() { return this.param.getStructuresArbre(); }

  @Post('structures')
  @Roles(Role.ADMIN, Role.DRH)
  createStructure(@Body() dto: CreateStructureDto) { return this.param.createStructure(dto); }

  @Put('structures/:id')
  @Roles(Role.ADMIN, Role.DRH)
  updateStructure(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStructureDto) {
    return this.param.updateStructure(id, dto);
  }

  @Delete('structures/:id')
  @Roles(Role.ADMIN)
  deleteStructure(@Param('id', ParseIntPipe) id: number) { return this.param.deleteStructure(id); }
}
