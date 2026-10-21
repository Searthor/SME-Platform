import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { errors } from '../../common/errors/app.error'

export type DocumentPrefix = 'INV' | 'PO' | 'GR' | 'SHIFT'

/** YYYYMM of `at` in the business timezone, so month boundaries follow local business time. */
export const formatDocumentPeriod = (at: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(at)
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  if (!year || !month) throw errors.invalidTimezone()
  return `${year}${month}`
}

@Injectable()
export class DocumentNumberService {
  /**
   * Issues the next PREFIX-YYYYMM-NNNN number. Must run inside the transaction that creates the
   * document: the upsert row-locks the counter until commit, and a rollback releases the number.
   */
  async next(tx: Prisma.TransactionClient, businessId: string, prefix: DocumentPrefix, at: Date = new Date()): Promise<string> {
    const business = await tx.business.findUnique({ where: { id: businessId }, select: { timezone: true } })
    if (!business) throw errors.resourceNotFound('Business')

    const sequenceKey = `${prefix}-${formatDocumentPeriod(at, business.timezone)}`
    const rows = await tx.$queryRaw<Array<{ last_value: number }>>`
      INSERT INTO "document_sequences" ("business_id", "sequence_key", "last_value", "updated_at")
      VALUES (${businessId}::uuid, ${sequenceKey}, 1, now())
      ON CONFLICT ("business_id", "sequence_key")
      DO UPDATE SET "last_value" = "document_sequences"."last_value" + 1, "updated_at" = now()
      RETURNING "last_value"`

    const value = rows[0]?.last_value
    if (value === undefined) throw new Error(`Document sequence ${sequenceKey} was not issued`)
    return `${sequenceKey}-${String(value).padStart(4, '0')}`
  }
}
