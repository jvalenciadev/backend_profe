import { Injectable } from '@nestjs/common';

@Injectable()
export class TerritorialService {
  getHello(): string {
    return 'Hello World!';
  }
}
