import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import { AppModule } from './app.module';
import { buildCorsOptions } from './config/cors.config';
import { createRateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { createRequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { StructuredLogger } from './common/logger/structured-logger';
import { RealtimeIoAdapter } from './modules/realtime/realtime.adapter';

async function bootstrap() {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, { logger });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 4000;

  // Global prefix
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // Production hardening
  app.enableCors(buildCorsOptions(configService));
  app.useWebSocketAdapter(new RealtimeIoAdapter(app, configService));
  app.use(createRequestLoggingMiddleware(logger));
  app.use(compression());
  app.use(
    createRateLimitMiddleware({
      max: configService.get<number>('rateLimit.max') || 600,
      windowMs: configService.get<number>('rateLimit.windowMs') || 60_000,
      skipPaths: ['/api/v1/health'],
    }),
  );

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API Docs
  const config = new DocumentBuilder()
    .setTitle('HotelOS API')
    .setDescription('Hotel Management System REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`HotelOS API running on http://localhost:${port}`, 'Bootstrap');
  logger.log(`API Docs at http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();
