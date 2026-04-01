import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UploadController } from '@app/common/upload/upload.controller';
import { DatabaseModule } from '@app/database';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CommonModule, UploadModule } from '@app/common';

@Module({
  imports: [
    ConfigModule, // Just import, don't use .forRoot() here
    DatabaseModule,
    PassportModule,
    CommonModule,
    UploadModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '24h',
        } as any,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UploadController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
