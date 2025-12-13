import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    // Postgres unique_violation
    const err: any = exception as any;
    if (err?.code === '23505') {
      status = HttpStatus.CONFLICT;
      message = 'Duplicate key error';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: 'Database Error',
    });
  }
}