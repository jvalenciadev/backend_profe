import { Controller, Get } from '@nestjs/common';
import { TerritorialService } from './territorial.service';

@Controller()
export class TerritorialController {
  constructor(private readonly territorialService: TerritorialService) {}

  @Get()
  getHello(): string {
    return this.territorialService.getHello();
  }
}
