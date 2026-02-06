import { Test, TestingModule } from '@nestjs/testing';
import { TerritorialController } from './territorial.controller';
import { TerritorialService } from './territorial.service';

describe('TerritorialController', () => {
  let territorialController: TerritorialController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TerritorialController],
      providers: [TerritorialService],
    }).compile();

    territorialController = app.get<TerritorialController>(TerritorialController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(territorialController.getHello()).toBe('Hello World!');
    });
  });
});
