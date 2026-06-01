import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { RedisService } from './shared/redis/redis.service';
import { RedisIoAdapter } from './shared/redis/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const redisService = app.get(RedisService);
  const port = config.get<number>('API_PORT', 3001);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // Security
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", 'https:', 'wss:'],
        },
      },
      hsts: isProd
        ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
        : false,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
    }),
  );
  app.use(cookieParser());

  const allowedOrigins = corsOrigins.split(',').map((o) => o.trim());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new ForbiddenException(`CORS origin denied: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    // cross-origin-resource-policy
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }); 

  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global prefix
  app.setGlobalPrefix(prefix);

  // Set header for all responses
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Max-Age', '86400');
    next();
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const fields = errors.map((e) => ({
          field: e.property,
          errors: Object.values(e.constraints ?? {}),
        }));
        return new BadRequestException({
          i18nKey: 'validation.failed',
          i18nParams: { fields },
        });
      },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const redisIoAdapter = new RedisIoAdapter(app, redisService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tasku API')
    .setDescription('Project management platform — REST API documentation')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Projects', 'Project management')
    .addTag('Workflows', 'Task workflow and lifecycle')
    .addTag('Tasks', 'Task management')
    .addTag('Notifications', 'Notification operations')
    .addTag('Activity', 'Activity and audit trail')
    .addTag('AI', 'AI structured generation endpoints')
    .addTag('Uploads', 'File upload and serving endpoints')
    .addTag('Settings', 'User and workspace settings')
    .addTag('Dashboard', 'Analytics and metrics')
    .addTag('Health', 'Service probes')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    jsonDocumentUrl: 'api/docs-json',
  });

  await app.listen(port, '0.0.0.0');
  console.log(`\nAPI running on http://0.0.0.0:${port}/${prefix}`);
  console.log(`Swagger docs at http://0.0.0.0:${port}/api/docs\n`);
}

bootstrap();
