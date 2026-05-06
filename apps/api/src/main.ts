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
import { monitoringNotifier } from './common/monitoring/monitoring.notifier';
import { RealtimeIoAdapter } from './modules/realtime/realtime.adapter';
import { RedisService } from './common/redis/redis.service';

async function bootstrap() {
  const logger = new StructuredLogger();
  process.on('uncaughtException', (error) => {
    void monitoringNotifier.notifyUnhandledError('process.uncaught_exception', error);
    logger.error({ message: 'Uncaught exception' }, error.stack, 'Bootstrap');
  });
  process.on('unhandledRejection', (reason) => {
    void monitoringNotifier.notifyUnhandledError('process.unhandled_rejection', reason);
    logger.error(
      { message: 'Unhandled promise rejection', reason: String(reason) },
      undefined,
      'Bootstrap',
    );
  });
  const app = await NestFactory.create(AppModule, { logger });
  const configService = app.get(ConfigService);
  const redisService = app.get(RedisService);
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
      redisService,
      onError: (error) => {
        logger.warn(
          {
            message: 'Rate limiter degraded to fail-open',
            error: error instanceof Error ? error.message : String(error),
          },
          'RateLimitMiddleware',
        );
      },
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
bootstrap().catch(async (error) => {
  await monitoringNotifier.notifyStartupFailure(error);
  const logger = new StructuredLogger();
  logger.error({ message: 'Bootstrap failed' }, error instanceof Error ? error.stack : undefined, 'Bootstrap');
  process.exit(1);
});
