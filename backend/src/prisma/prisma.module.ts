import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StructureScopeService } from '../common/services/structure-scope.service';

@Global()
@Module({
  providers: [PrismaService, StructureScopeService],
  exports: [PrismaService, StructureScopeService],
})
export class PrismaModule {}
