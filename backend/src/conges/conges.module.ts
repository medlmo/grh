import { Module } from '@nestjs/common';
import { CongesService } from './conges.service';
import { CongesController } from './conges.controller';

@Module({
  controllers: [CongesController],
  providers: [CongesService],
  exports: [CongesService],
})
export class CongesModule {}
