import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../modules/user/domain/errors/user.errors';
import { SecureLogger } from '../logging/secure-logger.util';

/**
 * Global exception filter para estandarizar las respuestas de error
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new SecureLogger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';

    // Manejar errores de dominio
    if (exception instanceof DomainError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
      error = exception.name;
    }
    // Manejar errores HTTP de NestJS
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string) || message;
        error = (resp['error'] as string) || error;
      }
    }
    // Manejar errores desconocidos
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // SECURITY: Log error with sanitized stack trace (no PII)
    // En producción, considerar enviar a servicio de monitoring (Sentry, DataDog)
    const errorInstance = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(
      `Exception caught [${status}] ${error}: ${message}`,
      errorInstance
    );

    // Responder con formato estandarizado
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
