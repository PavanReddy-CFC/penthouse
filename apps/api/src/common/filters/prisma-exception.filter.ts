import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Converts Prisma errors into clean HTTP responses. */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientInitializationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientInitializationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.map(exception);

    if (status === HttpStatus.SERVICE_UNAVAILABLE) {
      this.logger.warn('Database not reachable, returned 503. Check DATABASE_URL and that PostgreSQL is running.');
    } else if (status >= 500) {
      this.logger.error(exception.message);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status]
        .toLowerCase()
        .split('_')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' '),
    });
  }

  private map(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientInitializationError,
  ): { status: HttpStatus; message: string } {
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return { status: HttpStatus.SERVICE_UNAVAILABLE, message: 'The database is not reachable' };
    }

    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        return {
          status: HttpStatus.CONFLICT,
          message: target ? `A record with this ${target} already exists` : 'Record already exists',
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
      case 'P1001': // can't reach database server
      case 'P1002': // database server timed out
      case 'P2024': // timed out waiting for a pool connection (DATABASE_POOL_*)
        return { status: HttpStatus.SERVICE_UNAVAILABLE, message: 'The database is not reachable' };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, message: 'A referenced record does not exist' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Unexpected database error' };
    }
  }
}
