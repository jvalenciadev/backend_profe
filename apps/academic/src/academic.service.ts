import { Injectable } from '@nestjs/common';

@Injectable()
export class AcademicService {
  getHello(): string {
    return 'Hello World!';
  }
}
