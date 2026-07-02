import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { ConfigModule } from '@nestjs/config';
import { LandingViewsController } from './controllers/landing-views.controller';
import { EventViewsController } from './controllers/event-views.controller';
import { UploadModule, MailModule, AuditInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UploadModule,
    MailModule,
  ],
  controllers: [LandingViewsController, EventViewsController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class ViewsModule {}
