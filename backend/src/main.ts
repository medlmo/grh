import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const corsLogger = new Logger('CORS');
  const corsOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const replitDomains = [process.env.REPLIT_DEV_DOMAIN, ...(process.env.REPLIT_DOMAINS ?? '').split(',')]
    .filter((domain): domain is string => Boolean(domain))
    .map((domain) => domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
    .filter(Boolean);
  for (const domain of replitDomains) {
    for (const protocol of ['http', 'https']) {
      const origin = `${protocol}://${domain}`;
      if (!corsOrigins.includes(origin)) corsOrigins.push(origin);
    }
  }

  if (
    corsOrigins.length === 0 ||
    corsOrigins.includes('*') ||
    corsOrigins.some((origin) => {
      try {
        return new URL(origin).origin !== origin;
      } catch {
        return true;
      }
    })
  ) {
    throw new Error('CORS_ORIGIN est obligatoire.');
  }

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      corsLogger.warn(`Origine refusée: ${origin}`);
      callback(new Error('Origine CORS non autorisée.'), false);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  Logger.log(`API GRH démarrée sur http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
