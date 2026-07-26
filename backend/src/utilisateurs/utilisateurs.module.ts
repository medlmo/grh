import { Module } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { UtilisateursController } from './utilisateurs.controller';

@Module({
  controllers: [UtilisateursController],
  providers: [UtilisateursService],
  exports: [UtilisateursService]
})
export class UtilisateursModule {}
