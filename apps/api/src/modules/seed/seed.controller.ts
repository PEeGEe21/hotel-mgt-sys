import { Controller, Post, Query } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  seed(@Query('key') key?: string) {
    return this.seedService.run(key);
  }
}
