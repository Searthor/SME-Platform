import { Inject, Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { TenantContextService } from './tenant-context.service'

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(@Inject(TenantContextService) private readonly contexts: TenantContextService) {}

  use(_request: Request, _response: Response, next: NextFunction): void {
    this.contexts.runForRequest(next)
  }
}
