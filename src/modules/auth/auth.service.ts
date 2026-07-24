import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '../../common/errors/app-error';
import { verifyPassword } from '../../common/utils/password.util';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticates by username + password (spec 66-68).
   *
   * Decided for v1: the login request carries no institutionId, and usernames
   * are only unique *within* an institution. We therefore match against every
   * active user with that username and accept the one whose password verifies.
   * (Recorded as an open decision in PROGRESS.md.)
   */
  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; mustChangePassword: boolean }> {
    const candidates = await this.usersService.findActiveByUsername(
      dto.username,
    );

    for (const user of candidates) {
      if (await verifyPassword(dto.password, user.passwordHash)) {
        const payload = {
          sub: user._id.toString(),
          institutionId: user.institutionId
            ? user.institutionId.toString()
            : null,
          role: user.role,
        };
        return {
          accessToken: await this.jwtService.signAsync(payload),
          mustChangePassword: user.mustChangePassword,
        };
      }
    }

    // Same generic error whether the username or the password was wrong.
    throw AppError.unauthorized(
      'Invalid username or password',
      'INVALID_CREDENTIALS',
    );
  }
}
