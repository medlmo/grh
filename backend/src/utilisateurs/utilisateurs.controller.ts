import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto, UpdateUtilisateurDto } from './dto/utilisateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('utilisateurs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN) // Seul l'admin gère les comptes
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Get()
  findAll() {
    return this.utilisateursService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.utilisateursService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUtilisateurDto) {
    return this.utilisateursService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUtilisateurDto) {
    return this.utilisateursService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.utilisateursService.remove(id);
  }
}
