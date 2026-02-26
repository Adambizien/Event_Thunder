import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { HttpModule } from '@nestjs/axios';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { readSecret } from '../utils/secret.util';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    JwtModule.registerAsync({
      useFactory: () => {
        const jwtSecret = readSecret('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET is not defined');
        }

        const expiresIn = (process.env.JWT_EXPIRES_IN ||
          '1d') as SignOptions['expiresIn'];

        const signOptions: SignOptions = {
          expiresIn,
        };

        return {
          secret: jwtSecret,
          signOptions,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
