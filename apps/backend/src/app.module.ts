import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import All Application Modules
import { AuthModule } from '../../auth/src/auth.module';
import { TerritorialModule } from '../../territorial/src/territorial.module';
import { UsersModule } from '../../users/src/users.module';
import { AcademicModule } from '../../academic/src/academic.module';
import { AuditModule } from '../../audit/src/audit.module';
import { JobsModule } from '../../jobs/src/jobs.module';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    TerritorialModule,
    UsersModule,
    AcademicModule,
    AuditModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
