import { Controller, Get, Head } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  getRoot() {
    return {
      service: 'HotelOS API',
      ok: true,
    };
  }

  @Head()
  headRoot() {
    return;
  }
}
