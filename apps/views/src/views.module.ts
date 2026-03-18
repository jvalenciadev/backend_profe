import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { ConfigModule } from '@nestjs/config';
import { LandingViewsController } from './controllers/landing-views.controller';
import { EventViewsController } from './controllers/event-views.controller';
import { UploadModule, MailModule } from '@app/common';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        UploadModule,
        MailModule,
    ],
    controllers: [
        LandingViewsController,
        EventViewsController,
    ],
    providers: [],
})
export class ViewsModule { }
