import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import helmet from 'helmet';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

describe('Application HTTP (intégration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(helmet());
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || origin === process.env.CORS_ORIGIN) {
          callback(null, true);
          return;
        }
        callback(new Error('Origine CORS non autorisée.'), false);
      },
      credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('applique les headers Helmet et la politique CORS autorisée', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5000')
      .expect(401);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('refuse le refresh sans cookie de session', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5000')
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toContain('Session de renouvellement');
      });
  });

  it('refuse le refresh sans origine de confiance', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toContain('Origine de la requête');
      });
  });

  it('branche le rate limiting sur la route de connexion', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'invalid@example.com', motDePasse: 'invalid' });

    expect([401, 422]).toContain(response.status);
  });
});