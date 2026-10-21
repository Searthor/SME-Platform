import { createHash } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { errors } from '../../common/errors/app.error'
import { PrismaService } from '../database/prisma.service'
import { TenantContextService } from '../tenancy/tenant-context.service'

export const IDEMPOTENCY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_:-]{8,100}$/

export type IdempotencyClaim = { operation: string; key: string; requestHash: string }

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([entryKey, entry]) => [entryKey, canonicalize(entry)]),
    )
  }
  return value
}

/**
 * Idempotency-Key handling per docs/API_GUIDELINES.md section 6: the claim row is inserted in the
 * same transaction as the business result, so a committed claim always points at a committed resource.
 */
@Injectable()
export class IdempotencyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  /** Returns undefined when no key was sent; rejects malformed keys. */
  prepare(operation: string, key: string | undefined, payload: unknown): IdempotencyClaim | undefined {
    if (key === undefined || key === '') return undefined
    if (!IDEMPOTENCY_KEY_PATTERN.test(key)) throw errors.invalidIdempotencyKey()
    const requestHash = createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex')
    return { operation, key, requestHash }
  }

  /** Resource ID of a completed request with this key, or null when the key is unused or expired. */
  async findReplay(claim: IdempotencyClaim): Promise<string | null> {
    const { businessId } = this.tenantContext.require()
    const where = { businessId_operation_key: { businessId, operation: claim.operation, key: claim.key } }
    const record = await this.prisma.idempotencyRecord.findUnique({ where })
    if (!record) return null
    if (record.expiresAt <= new Date()) {
      await this.prisma.idempotencyRecord.deleteMany({ where: { businessId, operation: claim.operation, key: claim.key, expiresAt: { lte: new Date() } } })
      return null
    }
    if (record.requestHash !== claim.requestHash) throw errors.idempotencyKeyReused()
    return record.resourceId
  }

  /** Call at the start of the business transaction; a concurrent duplicate blocks here, then fails with P2002. */
  async claim(tx: Prisma.TransactionClient, claim: IdempotencyClaim, resourceId: string): Promise<void> {
    const { businessId } = this.tenantContext.require()
    await tx.idempotencyRecord.create({
      data: {
        businessId,
        operation: claim.operation,
        key: claim.key,
        requestHash: claim.requestHash,
        resourceId,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_RETENTION_MS),
      },
    })
  }

  /**
   * Runs a critical command at most once per key: a completed key replays the original resource,
   * and a concurrent duplicate that loses the claim race replays the winner's result.
   * `execute` must call `claim()` inside its transaction when a claim is given.
   */
  async run<T>(claim: IdempotencyClaim | undefined, execute: () => Promise<T>, replay: (resourceId: string) => Promise<T>): Promise<T> {
    if (!claim) return execute()

    const completedId = await this.findReplay(claim)
    if (completedId) return replay(completedId)

    try {
      return await execute()
    } catch (error) {
      if (!this.isDuplicateClaim(error)) throw error
      const winnerId = await this.findReplay(claim)
      if (!winnerId) throw error
      return replay(winnerId)
    }
  }

  isDuplicateClaim(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError
      && error.code === 'P2002'
      && error.meta?.modelName === 'IdempotencyRecord'
  }
}
