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

const DEFAULT_RESPONSE_DESCRIPTIONS: Record<string, string> = {
  '200': 'Successful response',
  '201': 'Resource created successfully',
  '202': 'Request accepted for processing',
  '204': 'No content',
  '400': 'Validation error',
  '401': 'Authentication required',
  '403': 'Forbidden',
  '404': 'Resource not found',
  '409': 'Conflict detected',
  '413': 'Payload too large',
  '415': 'Unsupported media type',
  '422': 'Unprocessable entity',
  '429': 'Rate limit exceeded',
  '500': 'Internal server error',
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const redisService = app.get(RedisService);
  const port = config.get<number>('API_PORT', 3001);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  const backendUrl = config.get<string>('BACKEND_URL', '');
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

  const redisIoAdapter = new RedisIoAdapter(app, redisService, config);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tasku API')
    .setDescription('REST API for Tasku, a project and task management platform with AI workflows, real-time collaboration, API keys, and webhook delivery tracking.')
    .setVersion('1.0.0')
    .addServer(`/${prefix}`, 'Versioned API base path')
    .setExternalDoc('Tasku Developer Docs', 'https://tasku.readme.io/')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header', description: 'Machine-to-machine API key authentication' }, 'api-key-header')
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
    .addTag('Developers', 'Developer portal, API keys and webhooks')
    .addTag('Health', 'Service probes')
    .build();

  const document = enhanceOpenApiDocument(
    SwaggerModule.createDocument(app, swaggerConfig),
    { prefix, port, backendUrl },
  );
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    jsonDocumentUrl: 'api/docs-json',
  });

  await app.listen(port, '0.0.0.0');
  console.log(`\nAPI running on http://0.0.0.0:${port}/${prefix}`);
  console.log(`Swagger docs at http://0.0.0.0:${port}/api/docs\n`);
}

function enhanceOpenApiDocument(document: any, options: { prefix: string; port: number; backendUrl?: string }) {
  const normalizedPrefix = trimSlashes(options.prefix);
  const configuredBackendUrl = (options.backendUrl || '').trim();
  const configuredServer = configuredBackendUrl
    ? `${configuredBackendUrl.replace(/\/+$/, '')}/${normalizedPrefix}`
    : null;

  document.info = {
    ...document.info,
    title: 'Tasku API',
    version: '1.0.0',
    description: [
      'Production REST API for Tasku.',
      'Includes JWT auth, OAuth, API keys, projects, tasks, uploads, AI generation, webhook deliveries, and operational health endpoints.',
      'The generated OpenAPI document is intended to be imported into Postman, Readme.io, Insomnia, Bruno, and Hoppscotch.',
    ].join(' '),
    contact: {
      name: 'Tasku Engineering',
      url: 'https://tasku.pro/',
    },
    license: {
      name: 'Proprietary',
    },
  };

  document.servers = dedupeServers([
    configuredServer ? { url: configuredServer, description: 'Configured backend base URL' } : null,
    { url: `https://api.tasku.pro/${normalizedPrefix}`, description: 'Production API' },
    { url: `http://localhost:${options.port}/${normalizedPrefix}`, description: 'Local development API' },
  ]);

  for (const methods of Object.values<any>(document.paths || {})) {
    for (const operation of Object.values<any>(methods || {})) {
      enrichOperation(document, operation);
    }
  }

  return document;
}

function enrichOperation(document: any, operation: any) {
  if (!operation || typeof operation !== 'object') return;

  if (!operation.description && operation.summary) {
    operation.description = `${operation.summary}.`;
  }

  for (const [statusCode, response] of Object.entries<any>(operation.responses || {})) {
    if (!response.description || !String(response.description).trim()) {
      response.description = DEFAULT_RESPONSE_DESCRIPTIONS[statusCode] || 'Operation response';
    }
  }

  for (const mediaType of Object.values<any>(operation.requestBody?.content || {})) {
    if (!mediaType || mediaType.example || mediaType.examples || !mediaType.schema) continue;
    const example = buildSchemaExample(document, mediaType.schema, new Set<string>());
    if (example !== undefined) {
      mediaType.example = example;
    }
  }
}

function buildSchemaExample(document: any, schemaOrRef: any, seenRefs: Set<string>): any {
  const schema = resolveSchema(document, schemaOrRef, seenRefs);
  if (!schema) return undefined;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return schema.allOf.reduce((acc: Record<string, unknown>, item: any) => {
      const value = buildSchemaExample(document, item, seenRefs);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { ...acc, ...value };
      }
      return acc;
    }, {});
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return buildSchemaExample(document, schema.oneOf[0], seenRefs);
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return buildSchemaExample(document, schema.anyOf[0], seenRefs);
  }

  if (schema.type === 'array') {
    const itemExample = buildSchemaExample(document, schema.items, seenRefs);
    return itemExample === undefined ? [] : [itemExample];
  }

  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {};
    for (const [propertyName, propertySchema] of Object.entries<any>(schema.properties || {})) {
      const propertyExample = buildSchemaExample(document, propertySchema, seenRefs);
      if (propertyExample !== undefined) {
        result[propertyName] = propertyExample;
      }
    }
    return result;
  }

  switch (schema.format) {
    case 'uuid':
      return '8c3f1d84-4f40-4e48-9d91-a92c9837b7b1';
    case 'email':
      return 'engineer@tasku.pro';
    case 'date-time':
      return '2026-06-01T12:00:00.000Z';
    case 'date':
      return '2026-06-01';
    case 'uri':
      return 'https://tasku.pro';
    case 'binary':
      return '<binary-file>';
    default:
      break;
  }

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 1;
    case 'boolean':
      return false;
    default:
      return undefined;
  }
}

function resolveSchema(document: any, schemaOrRef: any, seenRefs: Set<string>) {
  if (!schemaOrRef) return undefined;

  if (schemaOrRef.$ref) {
    const ref: string = schemaOrRef.$ref;
    if (seenRefs.has(ref)) return undefined;
    seenRefs.add(ref);
    const schemaName = ref.split('/').pop();
    if (!schemaName) return undefined;
    return resolveSchema(document, document.components?.schemas?.[schemaName], seenRefs);
  }

  return schemaOrRef;
}

function dedupeServers(servers: Array<{ url: string; description: string } | null>) {
  const seen = new Set<string>();
  return servers.filter((server): server is { url: string; description: string } => {
    if (!server || seen.has(server.url)) return false;
    seen.add(server.url);
    return true;
  });
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

bootstrap();
