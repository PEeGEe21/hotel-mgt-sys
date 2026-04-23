import { LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

type LogPayload = {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: string;
  stack?: string;
  metadata?: Record<string, unknown>;
};

export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string) {
    this.write('log', message, context);
  }

  error(message: unknown, stack?: string, context?: string) {
    this.write('error', message, context, stack);
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, stack?: string) {
    const payload: LogPayload = {
      level,
      message: typeof message === 'string' ? message : 'Structured log event',
      context,
      timestamp: new Date().toISOString(),
    };

    if (stack) {
      payload.stack = stack;
    }

    if (message && typeof message === 'object') {
      payload.metadata = message as Record<string, unknown>;
    }

    const output = JSON.stringify(payload);

    if (level === 'error') {
      process.stderr.write(`${output}\n`);
      return;
    }

    process.stdout.write(`${output}\n`);
  }
}
