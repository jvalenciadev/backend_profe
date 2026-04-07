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
import { DatabaseModule } from '@app/database';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { CaslModule, ApiKeyGuard, MailModule, UploadModule } from '@app/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadController } from '@app/common/upload/upload.controller';
import { UploadConfigController } from '@app/common/upload/upload-config.controller';

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
    UploadModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res, path) => {
          // Medidas para asegurar que archivos maliciosos no ejecuten código en el navegador (XSS)
          res.set('X-Content-Type-Options', 'nosniff');
          res.set('Cache-Control', 'public, max-age=31536000');
        },
      },
    }),
  ],
  controllers: [AppController, UploadController, UploadConfigController],
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
