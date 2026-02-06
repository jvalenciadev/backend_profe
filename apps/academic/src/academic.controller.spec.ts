import { Test, TestingModule } from '@nestjs/testing';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';

describe('AcademicController', () => {
  let academicController: AcademicController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AcademicController],
      providers: [AcademicService],
    }).compile();

    academicController = app.get<AcademicController>(AcademicController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(academicController.getHello()).toBe('Hello World!');
    });
  });
});
