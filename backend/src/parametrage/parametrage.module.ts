import { Module } from '@nestjs/common';
import { ParametrageService } from './parametrage.service';
import { ParametrageController } from './parametrage.controller';

@Module({
  controllers: [ParametrageController],
  providers: [ParametrageService],
  exports: [ParametrageService],
})
export class ParametrageModule {}
