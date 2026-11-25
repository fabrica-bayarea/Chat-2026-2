import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { loadAuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const config = loadAuthConfig();
        return {
          secret: config.jwtSecret,
          signOptions: { algorithm: 'HS256', expiresIn: `${config.sessionHours}h` },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
