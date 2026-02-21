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
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { CaslModule, ApiKeyGuard, MailModule } from '@app/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CaslModule,
    MailModule,
    AuthModule,
    TerritorialModule,
    UsersModule,
    AcademicModule,
    AuditModule,
    JobsModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule { }
