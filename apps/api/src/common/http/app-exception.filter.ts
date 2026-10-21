import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'
import { AppError } from '../errors/app.error'
import type { AuthenticatedRequest } from './request-context'

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<AuthenticatedRequest>()
    const response = http.getResponse<Response>()

    if (exception instanceof AppError) {
      response.status(exception.statusCode).json({
        success: false,
        error: { code: exception.code, message: exception.message, details: exception.details ?? {} },
        meta: { requestId: request.requestId },
      })
      return
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      response.status(status).json({
        success: false,
        error: {
          code: status === 400 ? 'VALIDATION_FAILED' : 'HTTP_ERROR',
          message: exception.message,
          details: typeof body === 'object' ? body : {},
        },
        meta: { requestId: request.requestId },
      })
      return
    }

    console.error('Unhandled request error', { requestId: request.requestId, exception })
    response.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
      meta: { requestId: request.requestId },
    })
  }
}
