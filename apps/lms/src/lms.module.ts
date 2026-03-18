import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { DatabaseModule } from '@app/database';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GradingModule } from './grading/grading.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { CuestionarioModule } from './cuestionario/cuestionario.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { InsigniasModule } from './insignias/insignias.module';
import { UploadModule } from '@app/common';
import { UploadController } from '@app/common/upload/upload.controller';

import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from '@app/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RecordatoriosModule } from './recordatorios/recordatorios.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '4h') as any
        },
      }),
      inject: [ConfigService],
    }),
    GradingModule,
    AsistenciaModule,
    CuestionarioModule,
    NotificacionesModule,
    InsigniasModule,
    UploadModule,
    ScheduleModule.forRoot(),
    RecordatoriosModule,
  ],
  controllers: [LmsController, UploadController],
  providers: [
    LmsService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class LmsModule { }
