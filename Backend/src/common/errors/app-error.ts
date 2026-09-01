import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain error carrying a stable machine-readable code alongside the HTTP
 * status, so responses match the spec's error envelope (section 65).
 */
export class AppError extends HttpException {
  readonly code: string;

  constructor(
    code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
    this.code = code;
  }

  static notFound(message: string, code = 'NOT_FOUND') {
    return new AppError(code, message, HttpStatus.NOT_FOUND);
  }

  static forbidden(message: string, code = 'FORBIDDEN') {
    return new AppError(code, message, HttpStatus.FORBIDDEN);
  }

  static unauthorized(message: string, code = 'UNAUTHORIZED') {
    return new AppError(code, message, HttpStatus.UNAUTHORIZED);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(code, message, HttpStatus.CONFLICT);
  }

  static validation(message: string, code = 'VALIDATION_ERROR') {
    return new AppError(code, message, HttpStatus.BAD_REQUEST);
  }
}
