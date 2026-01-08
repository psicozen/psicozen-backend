import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException, NotFoundException, ValidationException } from '../../domain/exceptions';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const body = exceptionResponse as { message?: string | string[]; errors?: unknown };
        message = body.message || message;
        errors = body.errors;
      }
    } else if (exception instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof ValidationException) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = exception.errors;
    } else if (exception instanceof DomainException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Sanitize URL to avoid logging sensitive tokens
    const sanitizedUrl = this.sanitizeUrl(request.url);

    this.logger.error(
      `${request.method} ${sanitizedUrl} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      errors,
    });
  }

  private sanitizeUrl(url: string): string {
    // Remove sensitive query parameters
    return url.replace(/([?&])(token_hash|token|refresh_token|access_token)=[^&]*/gi, '$1$2=***');
  }
}
