import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { SftpService } from './sftp.service';
import { SftpController } from './sftp.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SftpController],
  providers: [SftpService],
  exports: [SftpService],
})
export class SftpModule {}

