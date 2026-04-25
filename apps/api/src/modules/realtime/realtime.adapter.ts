import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { buildCorsOptions } from '../../config/cors.config';

export class RealtimeIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const cors = buildCorsOptions(this.configService);

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: cors.origin,
        credentials: cors.credentials,
      },
    });
  }
}
