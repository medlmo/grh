import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AgentsModule } from './agents/agents.module';
import { CongesModule } from './conges/conges.module';
import { DecisionsModule } from './decisions/decisions.module';
import { ParametrageModule } from './parametrage/parametrage.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AgentsModule,
    CongesModule,
    DecisionsModule,
    ParametrageModule,
    DashboardModule,
    UtilisateursModule,
  ],
})
export class AppModule {}
