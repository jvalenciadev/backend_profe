import { Module } from '@nestjs/common';
import { UploadConfigService } from './upload-config.service';
import { DatabaseModule } from '@app/database';

@Module({
    imports: [DatabaseModule],
    providers: [UploadConfigService],
    exports: [UploadConfigService],
})
export class UploadModule { }
