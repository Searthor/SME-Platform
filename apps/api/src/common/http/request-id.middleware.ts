import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Response } from 'express'
import { validate as isUuid, v7 as uuidv7 } from 'uuid'
import type { AuthenticatedRequest } from './request-context'

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
    const candidate = request.header('x-request-id')
    request.requestId = candidate && isUuid(candidate) ? candidate : uuidv7()
    response.setHeader('X-Request-Id', request.requestId)
    next()
  }
}
