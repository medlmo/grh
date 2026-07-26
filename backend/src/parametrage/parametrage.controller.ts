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
import { ParametrageService } from './parametrage.service';
import {
  CreateCorpsDto,
  CreateCadreDto,
  CreateGradeDto,
  CreateEchelleDto,
  CreateEchelonDto,
  CreateJourFerieDto,
  UpdateCollectiviteDto,
  CreateStructureDto,
} from './dto/parametrage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('parametrage')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParametrageController {
  constructor(private param: ParametrageService) {}

  // --- Collectivité ---
  @Get('collectivite')
  getCollectivite() {
    return this.param.getCollectivite();
  }

  @Put('collectivite')
  @Roles(Role.ADMIN)
  updateCollectivite(@Body() dto: UpdateCollectiviteDto) {
    return this.param.updateCollectivite(dto);
  }

  // --- Corps / Cadres / Grades / Échelles / Échelons ---
  // Hiérarchie marocaine : Corps → Cadre → Grade → Échelle → Échelon

  @Get('corps')
  getCorps() {
    return this.param.getCorps();
  }

  @Get('corps/:id/cadres')
  getCorpsCadres(@Param('id', ParseIntPipe) id: number) {
    return this.param.getCorpsCadres(id);
  }

  @Post('corps')
  @Roles(Role.ADMIN)
  createCorps(@Body() dto: CreateCorpsDto) {
    return this.param.createCorps(dto);
  }

  @Delete('corps/:id')
  @Roles(Role.ADMIN)
  deleteCorps(@Param('id', ParseIntPipe) id: number) {
    return this.param.deleteCorps(id);
  }

  @Get('cadres/:id/grades')
  getCadreGrades(@Param('id', ParseIntPipe) id: number) {
    return this.param.getCadreGrades(id);
  }

  @Post('cadres')
  @Roles(Role.ADMIN)
  createCadre(@Body() dto: CreateCadreDto) {
    return this.param.createCadre(dto);
  }

  @Delete('cadres/:id')
  @Roles(Role.ADMIN)
  deleteCadre(@Param('id', ParseIntPipe) id: number) {
    return this.param.deleteCadre(id);
  }

  @Get('grades/:id/echelles')
  getGradeEchelles(@Param('id', ParseIntPipe) id: number) {
    return this.param.getGradeEchelles(id);
  }

  @Post('grades')
  @Roles(Role.ADMIN)
  createGrade(@Body() dto: CreateGradeDto) {
    return this.param.createGrade(dto);
  }

  @Delete('grades/:id')
  @Roles(Role.ADMIN)
  deleteGrade(@Param('id', ParseIntPipe) id: number) {
    return this.param.deleteGrade(id);
  }

  // --- Échelles ---
  @Get('echelles/:id/echelons')
  getEchelleEchelons(@Param('id', ParseIntPipe) id: number) {
    return this.param.getEchelleEchelons(id);
  }

  @Post('echelles')
  @Roles(Role.ADMIN)
  createEchelle(@Body() dto: CreateEchelleDto) {
    return this.param.createEchelle(dto);
  }

  @Delete('echelles/:id')
  @Roles(Role.ADMIN)
  deleteEchelle(@Param('id', ParseIntPipe) id: number) {
    return this.param.deleteEchelle(id);
  }

  // --- Échelons ---
  @Post('echelons')
  @Roles(Role.ADMIN)
  createEchelon(@Body() dto: CreateEchelonDto) {
    return this.param.createEchelon(dto);
  }

  @Delete('echelons/:id')
  @Roles(Role.ADMIN)
  deleteEchelon(@Param('id', ParseIntPipe) id: number) {
    return this.param.deleteEchelon(id);
  }

  // --- Jours fériés ---
  @Get('feries')
  getJoursFeries(@Query('annee') annee?: string) {
    return this.param.getJoursFeries(annee ? Number(annee) : undefined);
  }

  @Post('feries')
  @Roles(Role.ADMIN)
  createJourFerie(@Body() dto: CreateJourFerieDto) {
    return this.param.createJourFerie(dto);
  }

  @Delete('feries/:id')
  @Roles(Role.ADMIN)
  deleteJourFerie(@Param('id', ParseIntPipe) id: number) {
    return this.param.deleteJourFerie(id);
  }

  // --- Structures ---
  @Get('structures')
  getStructures() {
    return this.param.getStructures();
  }

  @Post('structures')
  @Roles(Role.ADMIN, Role.DRH)
  createStructure(@Body() dto: CreateStructureDto) {
    return this.param.createStructure(dto);
  }

  @Delete('structures/:id')
  @Roles(Role.ADMIN)
  deleteStructure(@Param('id', ParseIntPipe) id: number) {
    return this.param.deleteStructure(id);
  }
}
