import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '../../common/errors/app-error';
import { hashPassword } from '../../common/utils/password.util';
import { Role } from '../../common/enums';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findActiveByUsername: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    usersService = { findActiveByUsername: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('issues a token when the password matches a candidate user', async () => {
    const passwordHash = await hashPassword('secret123');
    usersService.findActiveByUsername.mockResolvedValue([
      {
        _id: { toString: () => 'user-1' },
        institutionId: { toString: () => 'inst-1' },
        role: Role.Admin,
        passwordHash,
        mustChangePassword: false,
      },
    ]);

    const result = await service.login({
      username: 'admin',
      password: 'secret123',
    });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.mustChangePassword).toBe(false);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      institutionId: 'inst-1',
      role: Role.Admin,
    });
  });

  it('rejects invalid credentials', async () => {
    const passwordHash = await hashPassword('secret123');
    usersService.findActiveByUsername.mockResolvedValue([
      {
        _id: { toString: () => 'u' },
        institutionId: null,
        role: Role.Admin,
        passwordHash,
      },
    ]);

    await expect(
      service.login({ username: 'admin', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
