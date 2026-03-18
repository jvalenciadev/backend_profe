import { Test, TestingModule } from '@nestjs/testing';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';

describe('LmsController', () => {
  let lmsController: LmsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LmsController],
      providers: [LmsService],
    }).compile();

    lmsController = app.get<LmsController>(LmsController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(lmsController.getHello()).toBe('Hello World!');
    });
  });
});
