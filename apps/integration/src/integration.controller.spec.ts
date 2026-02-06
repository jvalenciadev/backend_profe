import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';

describe('IntegrationController', () => {
  let integrationController: IntegrationController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationController],
      providers: [IntegrationService],
    }).compile();

    integrationController = app.get<IntegrationController>(IntegrationController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(integrationController.getHello()).toBe('Hello World!');
    });
  });
});
