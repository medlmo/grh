import { Module } from '@nestjs/common';
import { CongesService } from './conges.service';
import { CongesController } from './conges.controller';
import { CongesMetierService } from './conges-metier.service';
import { CongesSoldeService } from './conges-solde.service';

@Module({
  controllers: [CongesController],
  providers: [CongesService, CongesMetierService, CongesSoldeService],
  exports: [CongesService, CongesSoldeService],
})
export class CongesModule {}
