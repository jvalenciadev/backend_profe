import { Module } from '@nestjs/common';
import { UploadConfigService } from './upload-config.service';
import { UploadController } from './upload.controller';
import { UploadConfigController } from './upload-config.controller';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [UploadController, UploadConfigController],
  providers: [UploadConfigService],
  exports: [UploadConfigService],
})
export class UploadModule {}
