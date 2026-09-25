import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  BusinessRuleViolationError,
  DomainError,
  InvalidArgumentError,
  NotFoundError,
} from '@shared/domain/errors/domain-error';

/**
 * Single translation point between domain errors and HTTP. Unexpected errors are
 * logged server-side and returned as a generic message to avoid leaking internals.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): { status: number; message: unknown } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? (payload as { message: unknown }).message
          : payload;
      return { status: exception.getStatus(), message };
    }

    if (exception instanceof NotFoundError) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }
    if (exception instanceof InvalidArgumentError) {
      return { status: HttpStatus.BAD_REQUEST, message: exception.message };
    }
    if (exception instanceof BusinessRuleViolationError) {
      return { status: HttpStatus.CONFLICT, message: exception.message };
    }
    if (exception instanceof DomainError) {
      return { status: HttpStatus.UNPROCESSABLE_ENTITY, message: exception.message };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
